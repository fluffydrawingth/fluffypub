-- Add currency column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'THB';

-- Backfill existing PayPal orders as USD
UPDATE orders SET currency = 'USD' WHERE payment_method = 'paypal' AND currency IS NULL;
UPDATE orders SET currency = 'USD' WHERE payment_method = 'paypal' AND currency = 'THB' AND total_usd IS NOT NULL;
