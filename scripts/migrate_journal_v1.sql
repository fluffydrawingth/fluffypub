-- Fluffy Journal: bilingual journal articles
create table if not exists journal_articles (
  id uuid primary key default gen_random_uuid(),
  title_th text not null,
  title_en text,
  excerpt_th text,
  excerpt_en text,
  content_th text,
  content_en text,
  article_type text default 'tips'
    check (article_type in ('tips','tools','favorites')),
  cover_image text,
  status text default 'draft'
    check (status in ('draft','published')),
  slug text unique,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

grant all on journal_articles to service_role;
grant all on journal_articles to authenticated;
grant all on journal_articles to anon;

notify pgrst, 'reload schema';
