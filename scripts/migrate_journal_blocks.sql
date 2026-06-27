-- Add layout blocks and external link fields to journal_articles.
-- Run in Supabase SQL editor
alter table journal_articles add column if not exists content_blocks jsonb default '[]'::jsonb;
alter table journal_articles add column if not exists external_link_url text;
alter table journal_articles add column if not exists external_link_label text;
alter table journal_articles add column if not exists external_link_label_en text;
create index if not exists journal_articles_content_blocks_gin on journal_articles using gin(content_blocks);
notify pgrst, 'reload schema';
