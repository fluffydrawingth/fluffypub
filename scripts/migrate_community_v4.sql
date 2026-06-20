-- Community v4: Tag Library + Community Profile fields.
-- Run in Supabase SQL editor. Safe to re-run.

-- ── Tag Library ──────────────────────────────────────────────────────────────
create table if not exists community_tags (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,          -- 'medium' | 'marker' | 'palette'
  name        text not null,          -- display name (admin-approved)
  normalized  text not null,          -- lowercase+trim for dedup
  status      text default 'pending', -- 'pending' | 'approved'
  post_count  int  default 0,
  created_at  timestamptz default now(),
  reviewed_at timestamptz,
  unique(type, normalized)
);

create index if not exists idx_community_tags_type_status on community_tags (type, status);

-- ── Community Profile fields (on profiles table) ─────────────────────────────
alter table profiles
  add column if not exists community_about   text,        -- max 80 chars
  add column if not exists community_country text,
  add column if not exists community_favorite_medium text;
