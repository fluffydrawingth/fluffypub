-- Add content_blocks JSONB column to journal_articles
-- Run in Supabase SQL editor
alter table journal_articles add column if not exists content_blocks jsonb default '[]'::jsonb;
create index if not exists journal_articles_content_blocks_gin on journal_articles using gin(content_blocks);
notify pgrst, 'reload schema';
