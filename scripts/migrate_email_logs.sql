-- Run this in your Supabase SQL editor to enable email logging
-- Dashboard → SQL Editor → paste and run

CREATE TABLE IF NOT EXISTS order_email_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject     TEXT,
  status      TEXT DEFAULT 'sent',  -- 'sent' | 'error' | 'dev_skip'
  error       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-order lookups and duplicate checks
CREATE INDEX IF NOT EXISTS idx_order_email_logs_order_id ON order_email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_email_logs_dedup    ON order_email_logs(order_id, event_type, recipient_email, status);

-- Allow service role full access (used by API)
ALTER TABLE order_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON order_email_logs FOR ALL USING (true);
