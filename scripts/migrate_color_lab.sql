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

notify pgrst, 'reload schema';
