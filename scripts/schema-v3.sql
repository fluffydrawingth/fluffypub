-- Products: new type fields and rich description
alter table public.products
  add column if not exists is_physical boolean default false,
  add column if not exists is_digital boolean default true,
  add column if not exists rich_description jsonb,
  add column if not exists shipping_note text;

-- Update existing products: set is_digital/is_physical from type column
update public.products set is_digital = true, is_physical = false where type = 'digital';
update public.products set is_digital = false, is_physical = true where type = 'physical';
update public.products set is_digital = true, is_physical = true where type = 'both';

-- Create Supabase Storage bucket for uploads
-- Run this in Supabase Dashboard > Storage > Create bucket named 'fluffy-pub' (public)

-- Grant permissions
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.theme TO service_role;
