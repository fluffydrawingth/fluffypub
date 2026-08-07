-- Fluffy Color Lab integration: per-customer favorite palettes. Run in
-- the Supabase SQL editor. Safe to re-run.
--
-- Unlike color_lab_data (a single admin-owned blob per resource — see
-- migrate_color_lab.sql), favorites are genuinely per-user data: one row
-- per saved palette, scoped to a real user_id. Every read/write goes
-- through api/_colorLab.js's `resource=favorites` branch, which derives
-- user_id from requireAuth(req, res)'s verified session — never a
-- client-supplied id — so RLS here is a backstop, not the only line of
-- defense, matching this project's existing convention (see
-- migrate_color_lab.sql's own comment on this).

create table if not exists color_lab_favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  colors      jsonb not null,
  label       text,
  created_at  timestamptz default now()
);

create index if not exists color_lab_favorites_user_id_idx on color_lab_favorites(user_id);

-- Grants — the API uses the service role; enable RLS as backstop. No
-- public read policy here (unlike color_lab_data) — favorites are
-- private to the owning customer, and every access is already scoped to
-- req.user.id server-side.
grant all privileges on color_lab_favorites to anon, authenticated, service_role;
alter table color_lab_favorites enable row level security;

notify pgrst, 'reload schema';
