-- Gelobtes Land store schema
-- Run this file on a fresh Supabase project, or use it as the canonical store schema.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin','manager','staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending','paid','processing','shipped','delivered','cancelled','refunded');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.app_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  long_description text,
  category text,
  weight text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  status public.order_status not null default 'pending',
  payment_status text not null default 'pending',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  email text not null,
  first_name text not null,
  last_name text not null,
  address text not null,
  postal_code text not null,
  city text not null,
  country text not null default 'DE',
  subtotal numeric(10,2) not null check (subtotal >= 0),
  shipping numeric(10,2) not null default 0 check (shipping >= 0),
  total numeric(10,2) not null check (total >= 0),
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  line_total numeric(10,2) not null check (line_total >= 0)
);

create table if not exists public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key check (id = 1),
  store_name text not null default 'Gelobtes Land',
  domain text not null default 'https://odenwald-honig.com',
  default_language text not null default 'de' check (default_language in ('de','en','es')),
  shipping_price numeric(10,2) not null default 4.90 check (shipping_price >= 0),
  free_shipping_threshold numeric(10,2) not null default 60.00 check (free_shipping_threshold >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists products_published_idx on public.products(published);
create index if not exists products_stock_idx on public.products(stock);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_email_idx on public.orders(email);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.content_pages enable row level security;
alter table public.store_settings enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','manager')); $$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','manager','staff')); $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute procedure public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists content_pages_set_updated_at on public.content_pages;
create trigger content_pages_set_updated_at before update on public.content_pages for each row execute procedure public.set_updated_at();
drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at before update on public.store_settings for each row execute procedure public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute procedure public.set_updated_at();

-- Remove policies from older iterations so re-running the schema stays deterministic.
drop policy if exists "published products are public" on public.products;
drop policy if exists "staff can read all products" on public.products;
drop policy if exists "managers can write products" on public.products;
drop policy if exists "staff can read orders" on public.orders;
drop policy if exists "staff can update orders" on public.orders;
drop policy if exists "managers can insert orders" on public.orders;
drop policy if exists "staff can read order items" on public.order_items;
drop policy if exists "managers can manage order items" on public.order_items;
drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
drop policy if exists "published content is public" on public.content_pages;
drop policy if exists "managers manage content" on public.content_pages;
drop policy if exists "admins read settings" on public.store_settings;
drop policy if exists "admins manage settings" on public.store_settings;

create policy "published products are public" on public.products for select to anon, authenticated using (published = true);
create policy "staff can read all products" on public.products for select to authenticated using (public.is_staff());
create policy "managers can insert products" on public.products for insert to authenticated with check (public.is_manager());
create policy "managers can update products" on public.products for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "managers can delete products" on public.products for delete to authenticated using (public.is_manager());

create policy "staff can read orders" on public.orders for select to authenticated using (public.is_staff());
create or replace function public.admin_update_order_status(p_order_id uuid, p_status public.order_status)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare result public.orders;
begin
  if not public.is_staff() then raise exception 'not authorized'; end if;
  update public.orders
  set status = p_status,
      payment_status = case
        when p_status = 'refunded' then 'refunded'
        when p_status in ('paid','processing','shipped','delivered') then 'paid'
        else payment_status
      end,
      updated_at = now()
  where id = p_order_id
  returning * into result;
  if result.id is null then raise exception 'order not found'; end if;
  return result;
end;
$$;

revoke execute on function public.admin_update_order_status(uuid, public.order_status) from public;
grant execute on function public.admin_update_order_status(uuid, public.order_status) to authenticated;

revoke update on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;
create policy "staff can read order items" on public.order_items for select to authenticated using (public.is_staff());
create policy "managers can manage order items" on public.order_items for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy "users can read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "published content is public" on public.content_pages for select to anon, authenticated using (published = true);
create policy "managers manage content" on public.content_pages for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy "admins read settings" on public.store_settings for select to authenticated using (public.is_admin());
create policy "admins manage settings" on public.store_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

insert into public.content_pages (slug, title, excerpt, body, published) values
('homepage-hero', 'Homepage Hero', '', '', true),
('homepage-intro', 'Homepage Intro', '', '', true),
('odenwald', 'Odenwald Abschnitt', '', '', true),
('imkerei', 'Imkerei', '', '', true),
('ueber-uns', 'Über uns', '', '', true)
on conflict (slug) do nothing;

insert into public.products (slug,name,description,long_description,category,weight,price,image_url,stock,featured,published)
values
('waldhonig-500g','Waldhonig','Kräftiger, aromatischer Waldhonig aus dem Odenwald.','Ein charaktervoller Honig mit dunkler Farbe und malzig-würzigen Noten.','Honig','500 g',9.90,'/images/honey-placeholder.svg',50,true,true),
('bluehtenhonig-500g','Blütenhonig','Milder, ausgewogener Blütenhonig aus der regionalen Landschaft.','Ein heller, ausgewogener Honig mit feiner Blütennote.','Honig','500 g',8.90,'/images/honey-placeholder.svg',50,true,true),
('honig-250g','Honig im kleinen Glas','250 g Gelobtes Land Honig — ideal zum Probieren oder Verschenken.','Unser kleines Glas für alle, die unseren Honig kennenlernen oder ein Stück Odenwald verschenken möchten.','Honig','250 g',5.90,'/images/honey-placeholder.svg',50,false,true)
on conflict (slug) do nothing;

-- After creating an Auth user, the trigger creates its staff profile automatically.
-- Promote the first admin manually in SQL, using the Auth user UUID:
-- update public.profiles set role = 'admin' where id = 'AUTH-USER-UUID';

