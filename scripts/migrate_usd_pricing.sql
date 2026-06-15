-- Add USD pricing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_usd numeric(10,2) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_usd numeric(10,2) DEFAULT NULL;

-- Ensure price_usd exists on products table (was added in schema-v8 but may be missing)
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_usd numeric(10,2) DEFAULT NULL;
