-- Community v3: "This Week's Cozy Picks" (admin-curated featured posts) + soft-hide/delete.
-- Run in Supabase SQL editor. Safe to re-run.

alter table community_posts
  add column if not exists featured boolean default false,   -- in current Cozy Picks
  add column if not exists featured_at timestamptz,          -- when added (auto-expire 7d)
  add column if not exists updated_at timestamptz;

create index if not exists idx_community_featured on community_posts (featured, featured_at);

-- status already exists ('published'); admin can also set 'hidden' or 'deleted' (soft).
