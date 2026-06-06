-- ── Add new product fields ───────────────────────────────────
alter table public.products 
  add column if not exists status text not null default 'published' check (status in ('draft','published')),
  add column if not exists cover_image_url text,
  add column if not exists digital_download_url text,
  add column if not exists download_instruction text,
  add column if not exists physical_stock integer default 0,
  add column if not exists shipping_required boolean default false;

-- ── Grant all permissions to service_role ────────────────────
GRANT ALL ON public.theme TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.profiles TO service_role;

-- ── Set admin role for production email ──────────────────────
-- Run after inserting admin user:
-- update public.profiles set role = 'admin' where email = 'fluffydrawing.th@gmail.com';

-- ── Update products RLS to include status filter ─────────────
drop policy if exists "Active products are public" on public.products;
create policy "Active products are public"
  on public.products for select
  using (active = true and status = 'published');

-- Allow admins to see all products including drafts
create policy "Admins see all products"
  on public.products for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

