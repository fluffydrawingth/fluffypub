-- Record when an order was delivered, so affiliate commission can be bucketed by
-- delivery month (revenue realized) instead of order-placed month.
-- Safe to run multiple times.

alter table orders
  add column if not exists delivered_at timestamptz;

-- Backfill already-delivered orders with a best-effort delivery time (last update).
update orders
  set delivered_at = coalesce(delivered_at, updated_at, created_at)
  where status = 'delivered' and delivered_at is null;
