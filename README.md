# Gelobtes Land — Online Store

React + Vite storefront for **Gelobtes Land**, with a protected admin area in the same repository and production-ready integration points for Supabase and Stripe.

## Stack

- React + Vite
- React Router
- Lucide React
- Supabase Auth + PostgreSQL + RLS
- Vercel serverless functions
- Stripe Checkout

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase/Stripe variables the public storefront runs in demo mode using `src/data/products.js`. The admin and real checkout remain disabled until the external services are configured.

## Production setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Create the first admin Auth user in Supabase Authentication.
4. Insert its UUID into `public.profiles` with role `admin` using the commented SQL in the schema.
5. Configure the public Vite variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Configure server-only Vercel variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `VITE_SITE_URL=https://odenwald-honig.com`
7. Create a Stripe webhook pointing to `/api/stripe-webhook` and subscribe to `checkout.session.completed` and `checkout.session.expired`.
8. Deploy to Vercel.
9. Connect `odenwald-honig.com` in Vercel and point Cloudflare DNS to Vercel.

## Important production work still required

The code intentionally does not invent legal/tax information. Before real sales, replace the placeholder legal pages with the correct German business details, Datenschutz, AGB and Widerrufsbelehrung for the actual operator and assortment.

For production, product images should be replaced with real product photography and the final shipping/tax configuration should be verified.

## Architecture

The public store and admin are in the same repository/app, but the admin is protected by Supabase Auth and role checks. The browser never receives the Supabase service-role key or Stripe secret key.

The future BeeWeb integration should happen through a dedicated API layer. Never expose the BeeWeb PostgreSQL database directly to the public store.
