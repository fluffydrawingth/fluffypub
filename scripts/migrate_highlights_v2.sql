alter table community_highlights
  add column if not exists content_blocks jsonb default '[]'::jsonb;

notify pgrst, 'reload schema';
