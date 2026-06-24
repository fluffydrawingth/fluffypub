-- Journal reactions (love / save) + share counter
create table if not exists journal_reactions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references journal_articles(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  type text check (type in ('love','save')),
  created_at timestamptz default now(),
  unique(article_id, user_id, type)
);

alter table journal_articles add column if not exists share_count int default 0;

grant all on journal_reactions to service_role;
grant all on journal_reactions to authenticated;
grant all on journal_reactions to anon;

notify pgrst, 'reload schema';
