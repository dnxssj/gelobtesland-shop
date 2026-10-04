# Gelobtes Land — Online Store

React + Vite storefront for **Gelobtes Land**, with the protected `/admin` area in the same application.

## Stack

- React + Vite
- React Router
- Lucide React
- Supabase Auth + PostgreSQL + RLS
- Vercel serverless functions
- Stripe Checkout (payment integration)

## Admin

The admin is part of the same store application and is protected by Supabase Auth plus database RLS.

- `/admin` — dashboard
- `/admin/orders` — orders, order details and fulfillment status
- `/admin/products` — product CRUD, stock and publication state
- `/admin/customers` — customer overview derived from orders
- `/admin/content` — CMS pages
- `/admin/users` — admin/manager/staff roles
- `/admin/settings` — store configuration

Roles:

- `admin` — full access
- `manager` — products, orders and content
- `staff` — orders and read-only catalog access

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Create the first user in Supabase Authentication.
4. The database trigger creates that user's profile automatically as `staff`.
5. Promote that user's profile to `admin` with:

```sql
update public.profiles
set role = 'admin'
where id = 'AUTH-USER-UUID';
```

## Environment variables

Public/browser:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server-only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_SITE_URL`

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` to the browser.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The current public storefront still uses the existing demo catalog. The productive admin writes to Supabase. Connecting the public catalog to those records is a separate storefront step.

## Architecture

BeeWeb is not part of this application. It is a separate animal/exploitation management system.

The store and its admin share the same application and database. Payment processing will use Stripe; the Stripe webhook is the source of truth for payment confirmation.
