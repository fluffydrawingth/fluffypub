-- Ensure all new product columns exist
alter table public.products 
  add column if not exists is_physical boolean default false,
  add column if not exists is_digital boolean default true,
  add column if not exists rich_description jsonb,
  add column if not exists shipping_note text,
  add column if not exists variants jsonb default '[]';

-- Fix existing data: sync boolean fields with type string
update public.products set is_digital = true,  is_physical = false where type = 'digital'  and (is_digital is null or is_physical is null);
update public.products set is_digital = false, is_physical = true  where type = 'physical' and (is_digital is null or is_physical is null);
update public.products set is_digital = true,  is_physical = true  where type = 'both'     and (is_digital is null or is_physical is null);

-- Default for any null
update public.products set is_digital = true,  is_physical = false where is_digital is null;
update public.products set variants = '[]' where variants is null;

GRANT ALL ON public.products TO service_role;
