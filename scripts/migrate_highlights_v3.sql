alter table community_highlights
  add column if not exists card_size text default 'md'
    check (card_size in ('sm','md','lg'));

notify pgrst, 'reload schema';
