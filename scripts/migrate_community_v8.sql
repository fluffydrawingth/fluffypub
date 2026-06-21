-- Community v8: Digital product creator-commission engine.
-- Run in Supabase SQL editor. Safe to re-run.

-- ── Product-level commission settings (admin-editable per product) ───────────
alter table products
  add column if not exists commission_enabled          boolean,
  add column if not exists creator_commission_percent  numeric,
  add column if not exists minimum_price_thb            numeric,
  add column if not exists minimum_price_usd            numeric;

-- Sensible defaults: off by default; 5% rate; ฿99 / $2.99 minimum eligible price.
update products set commission_enabled = false             where commission_enabled is null;
update products set creator_commission_percent = 5         where creator_commission_percent is null;
update products set minimum_price_thb = 99                  where minimum_price_thb is null;
update products set minimum_price_usd = 2.99                where minimum_price_usd is null;

-- ── Digital creator-commission ledger ────────────────────────────────────────
-- One row per eligible digital line item attributed to a Fluffy Creator via ?ref=.
-- Status flow mirrors physical: pending → confirmed (order delivered) → paid; or cancelled.
create table if not exists creator_commissions (
  id                uuid primary key default gen_random_uuid(),
  creator_id        uuid references profiles(id),   -- the Fluffy Creator earning it
  order_id          uuid references orders(id),
  product_id        uuid references products(id),
  product_title     text,
  buyer_id          uuid,                            -- purchaser (may be null for guests)
  sale_amount       numeric default 0,               -- line total in the order currency
  currency          text default 'THB',
  commission_percent numeric default 5,
  commission_amount numeric default 0,
  status            text default 'pending',          -- pending | confirmed | paid | cancelled
  created_at        timestamptz default now(),
  confirmed_at      timestamptz,
  paid_at           timestamptz
);

create index if not exists idx_creator_commissions_creator on creator_commissions (creator_id, status);
create index if not exists idx_creator_commissions_order   on creator_commissions (order_id);

notify pgrst, 'reload schema';
