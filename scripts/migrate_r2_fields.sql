-- Add Cloudflare R2 fields to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS r2_key text,
  ADD COLUMN IF NOT EXISTS r2_file_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_type text;
