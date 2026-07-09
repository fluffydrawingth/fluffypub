-- Add bilingual (TH/EN) columns to community_highlights
-- Run once in the Supabase SQL editor.
alter table community_highlights
  add column if not exists title_th text,
  add column if not exists title_en text,
  add column if not exists description_th text,
  add column if not exists description_en text;

notify pgrst, 'reload schema';
