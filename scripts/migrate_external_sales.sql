-- Add external_sales JSONB column to artist_payouts
-- Run this once in the Supabase SQL editor.
-- Each item shape:
--   { id, channel, product_id, product_name, qty,
--     gross_amount, net_amount, royalty_amount, note }
alter table artist_payouts
  add column if not exists external_sales jsonb default '[]'::jsonb;

notify pgrst, 'reload schema';
