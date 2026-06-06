-- Language & currency fields for products
alter table public.products
  add column if not exists price_thb numeric(10,2),
  add column if not exists price_usd numeric(10,2),
  add column if not exists title_th text,
  add column if not exists title_en text,
  add column if not exists description_th text,
  add column if not exists description_en text;

-- Ensure variants column exists
alter table public.products add column if not exists variants jsonb default '[]';
update public.products set variants = '[]' where variants is null;

-- Set price_thb from price for existing products (assuming price is USD)
update public.products set price_usd = price where price_usd is null;

GRANT ALL ON public.products TO service_role;
