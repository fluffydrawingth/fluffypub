-- "Share Your Colorful World 🌈" community feature.
-- Run in the Supabase SQL editor. Safe to run multiple times.

-- Community posts: a finished coloring page shared by a user.
create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  artwork_url text not null,          -- full image (R2/Supabase storage)
  thumb_url text,                     -- small thumbnail (client-generated)
  product_id uuid references products(id),   -- nullable: a tagged Fluffy Pub book
  external_book_title text,           -- or a plain-text external book
  external_book_author text,
  mediums jsonb default '[]'::jsonb,  -- ["Alcohol Marker","Watercolor",...]
  markers jsonb default '[]'::jsonb,  -- ["Ohuhu Pastel 48",...]
  palettes jsonb default '[]'::jsonb, -- ["Strawberry Milk",...]
  caption text,                       -- <= 300 chars (enforced in API)
  status text default 'published',    -- published | hidden (admin moderation)
  created_at timestamptz default now()
);
-- Indexes to support pagination, by-book, by-creator at scale (thousands of rows).
create index if not exists idx_community_created on community_posts (created_at desc);
create index if not exists idx_community_product on community_posts (product_id);
create index if not exists idx_community_user    on community_posts (user_id);
create index if not exists idx_community_status  on community_posts (status);

-- Fluffy reactions (Phase 2): one row per user per reaction-type per post.
create table if not exists community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts(id) on delete cascade,
  user_id uuid references profiles(id),
  type text not null,                 -- love | inspiring | cozy | cute_palette | want_to_try
  created_at timestamptz default now(),
  unique (post_id, user_id, type)
);
create index if not exists idx_reactions_post on community_reactions (post_id);

-- Grants — the API uses the service role; enable RLS as backstop with no anon access.
grant all privileges on community_posts     to anon, authenticated, service_role;
grant all privileges on community_reactions to anon, authenticated, service_role;
alter table community_posts     enable row level security;
alter table community_reactions enable row level security;
-- Public can READ published posts/reactions directly if the anon key is ever used;
-- all writes go through the service-role API. (Defense-in-depth.)
do $$ begin
  create policy "community posts public read" on community_posts for select using (status = 'published');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "community reactions public read" on community_reactions for select using (true);
exception when duplicate_object then null; end $$;
