-- Community v10: follow/unfollow creators (stored in profiles.community_follows jsonb array of user IDs)
alter table profiles
  add column if not exists community_follows jsonb default '[]'::jsonb;

notify pgrst, 'reload schema';
