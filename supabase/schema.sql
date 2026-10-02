-- Gelobtes Land store schema
create extension if not exists pgcrypto;

create type public.app_role as enum ('admin','manager','staff');
create type public.order_status as enum ('pending','paid','processing','shipped','delivered','cancelled','refunded');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.app_role not null default 'staff',
  created_at timestamptz not null default now()
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
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null,
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
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null
);

create index if not exists products_published_idx on public.products(published);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_email_idx on public.orders(email);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.is_manager() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','manager'));
$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','manager','staff'));
$$;

create policy "published products are public" on public.products for select to anon, authenticated using (published = true);
create policy "staff can read all products" on public.products for select to authenticated using (public.is_staff());
create policy "managers can write products" on public.products for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy "staff can read orders" on public.orders for select to authenticated using (public.is_staff());
create policy "staff can update orders" on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "managers can insert orders" on public.orders for insert to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "staff can read order items" on public.order_items for select to authenticated using (public.is_staff());
create policy "managers can manage order items" on public.order_items for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy "users can read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.products (slug,name,description,long_description,category,weight,price,image_url,stock,featured,published)
values
('waldhonig-500g','Waldhonig','Kräftiger, aromatischer Waldhonig aus dem Odenwald.','Ein charaktervoller Honig mit dunkler Farbe und malzig-würzigen Noten.','Honig','500 g',9.90,'/images/honey-placeholder.svg',50,true,true),
('bluehtenhonig-500g','Blütenhonig','Milder, ausgewogener Blütenhonig aus der regionalen Landschaft.','Ein heller, ausgewogener Honig mit feiner Blütennote.','Honig','500 g',8.90,'/images/honey-placeholder.svg',50,true,true),
('honig-250g','Honig im kleinen Glas','250 g Gelobtes Land Honig — ideal zum Probieren oder Verschenken.','Unser kleines Glas für alle, die unseren Honig kennenlernen oder ein Stück Odenwald verschenken möchten.','Honig','250 g',5.90,'/images/honey-placeholder.svg',50,false,true)
on conflict (slug) do nothing;

-- After creating the first auth user, insert its profile and promote it manually:
-- insert into public.profiles (id,email,full_name,role) values ('AUTH-USER-UUID','admin@example.com','Store Admin','admin');
