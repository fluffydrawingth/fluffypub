-- Community UX v2: guest reactions + comments. Run in Supabase SQL editor. Safe to re-run.

-- Allow reactions from logged-out visitors, deduped per browser (anonymous guest_id).
alter table community_reactions
  add column if not exists guest_id text;
-- One reaction per (post, browser, type) for guests; per (post, user, type) for members.
create unique index if not exists uq_reactions_guest on community_reactions (post_id, guest_id, type) where guest_id is not null;
create index if not exists idx_reactions_guest on community_reactions (guest_id);

-- Comments on a community post (members only — keeps spam down).
create table if not exists community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references community_posts(id) on delete cascade,
  user_id uuid references profiles(id),
  body text not null,                 -- <= 500 chars (enforced in API)
  status text default 'published',
  created_at timestamptz default now()
);
create index if not exists idx_comments_post on community_comments (post_id, created_at);

grant all privileges on community_comments to anon, authenticated, service_role;
alter table community_comments enable row level security;
do $$ begin
  create policy "community comments public read" on community_comments for select using (status = 'published');
exception when duplicate_object then null; end $$;
