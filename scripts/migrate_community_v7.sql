-- Community v7: per-artist "Show on homepage" flag.
-- Run in Supabase SQL editor. Safe to re-run.

-- Opt-in flag so admins can curate which artists appear in the homepage
-- "Meet Our Artists" section (useful once there are many artists).
alter table profiles
  add column if not exists show_on_homepage boolean default false;

-- Refresh PostgREST schema cache so the new column is usable immediately.
notify pgrst, 'reload schema';
