-- Add post_header column to community_posts
-- Run once in the Supabase SQL editor.
alter table community_posts
  add column if not exists post_header text;

notify pgrst, 'reload schema';
