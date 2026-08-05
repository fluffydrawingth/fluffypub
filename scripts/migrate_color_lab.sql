-- Fluffy Color Lab integration: shared storage for the marker reference
-- library/sets and admin-curated palettes, replacing the standalone app's
-- per-browser localStorage. Run in the Supabase SQL editor. Safe to re-run.
--
-- One row per resource ('markers' | 'curated-palettes'), each holding the
-- exact same JSON shape the standalone app already stores in localStorage
-- (see fluffy-color-lab's MarkerDbExport / CuratedPalette[] types) rather
-- than a normalized per-entity schema — there is exactly one admin
-- managing this data (see AdminPage's ADMIN_EMAIL check), so a
-- last-write-wins whole-blob replace is simpler and lower-risk than a
-- full relational rewrite, while still being real, durable, shared
-- Supabase data instead of per-browser storage. See
-- src/color-lab/features/marker-db/repository/SupabaseMarkerRepository.ts
-- and .../curated-palettes/repository/SupabaseCuratedPaletteRepository.ts,
-- and api/color-lab.js.

create table if not exists color_lab_data (
  key         text primary key,   -- 'markers' | 'curated-palettes'
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now()
);

-- Seed both rows with an empty-but-valid shape so the first GET (public,
-- unauthenticated) never has to special-case a missing row.
insert into color_lab_data (key, data)
values
  ('markers', '{"schemaVersion":1,"brands":[],"series":[],"references":[],"commercialSets":[],"userSets":[]}'::jsonb),
  ('curated-palettes', '[]'::jsonb)
on conflict (key) do nothing;

-- Grants — the API uses the service role; enable RLS as backstop with no anon
-- write access, matching migrate_community.sql's convention. Public can READ
-- directly if the anon key is ever used (this data isn't sensitive — hex
-- colors and palette names); all writes go through the service-role API
-- (api/color-lab.js's `requireAuth(req, res, ['admin'])`).
grant all privileges on color_lab_data to anon, authenticated, service_role;
alter table color_lab_data enable row level security;
do $$ begin
  create policy "color lab data public read" on color_lab_data for select using (true);
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
