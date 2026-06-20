-- Community v5: Multiple images per post + External Book Library.
-- Run in Supabase SQL editor. Safe to re-run.

-- ── 1. Multiple images support ───────────────────────────────────────────────
-- artwork_urls holds an ordered array of image URLs. The legacy artwork_url
-- column stays as the canonical "cover" (first image) for backward compatibility.
alter table community_posts
  add column if not exists artwork_urls jsonb default '[]'::jsonb;

-- Backfill: any existing post with a single artwork_url gets a 1-item array.
update community_posts
set artwork_urls = jsonb_build_array(artwork_url)
where (artwork_urls is null or artwork_urls = '[]'::jsonb)
  and artwork_url is not null;

-- ── 2. External Book Library ─────────────────────────────────────────────────
-- Remembers community-entered books (NOT Fluffy Pub products). Powers
-- autocomplete, duplicate prevention, and dedicated discovery pages.
create table if not exists external_books (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  author           text,
  slug             text unique,
  normalized_title text not null,        -- lowercase(title)+'|'+lowercase(author) for dedup
  post_count       int  default 0,
  creator_count    int  default 0,
  created_at       timestamptz default now(),
  unique(normalized_title)
);

create index if not exists idx_external_books_normalized on external_books (normalized_title);
create index if not exists idx_external_books_slug on external_books (slug);

-- Link community posts to a canonical external book (nullable; only for external books).
alter table community_posts
  add column if not exists external_book_id uuid references external_books(id);

create index if not exists idx_community_posts_external_book on community_posts (external_book_id);
