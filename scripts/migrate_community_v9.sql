-- Community v9: keywords (search-only), structured coloring details, recommended tools.
-- Run in Supabase SQL editor. Safe to re-run. Consolidates the remaining community columns.

alter table community_posts
  add column if not exists keywords          jsonb default '[]'::jsonb,   -- ["cozy","pink"] search-only, never shown
  add column if not exists coloring_details  jsonb default '[]'::jsonb,   -- [{medium, brand}]
  add column if not exists recommended_tools jsonb default '[]'::jsonb,   -- [{name, url}] (Fluffy Creators/Admin)
  add column if not exists post_type         text  default 'artwork';    -- 'artwork' | 'tip' | 'tools'

notify pgrst, 'reload schema';
