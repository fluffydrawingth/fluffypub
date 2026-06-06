-- Add slip_url and totals to orders
alter table public.orders
  add column if not exists slip_url text,
  add column if not exists slip_uploaded_at timestamptz,
  add column if not exists total_thb numeric(10,2),
  add column if not exists total_amount numeric(10,2),
  add column if not exists subtotal_thb numeric(10,2),
  add column if not exists paid_at timestamptz;

-- Add province and postal_code to profiles
alter table public.profiles
  add column if not exists province text,
  add column if not exists postal_code text;

-- Ensure products have multilingual and pricing columns
alter table public.products
  add column if not exists price_thb numeric(10,2),
  add column if not exists price_usd numeric(10,2),
  add column if not exists title_th text,
  add column if not exists title_en text,
  add column if not exists description_th text,
  add column if not exists description_en text;

GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.products TO service_role;
