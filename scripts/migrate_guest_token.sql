-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → paste and run

ALTER TABLE orders ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_access_token ON orders(access_token);
