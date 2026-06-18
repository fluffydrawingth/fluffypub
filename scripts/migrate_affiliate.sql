-- Affiliate Program V1 migration
-- Run this in Supabase SQL editor (safe to run multiple times)

-- 1. Affiliate is an additional permission on the existing profile (not a new role)
alter table profiles
  add column if not exists affiliate_enabled boolean default false;

-- 2. Affiliate requests (mirrors artist_requests)
create table if not exists affiliate_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  username text,
  email text,
  social_media_link text,
  platform text,                            -- tiktok | instagram | facebook | youtube | other
  message text,
  status text default 'pending',            -- pending | approved | rejected
  request_date timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

-- 3. Affiliate codes (one or more per affiliate user)
create table if not exists affiliate_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),     -- the affiliate who owns this code
  code text unique not null,                -- uppercase, <=10 chars
  discount_amount numeric default 10,       -- THB discount applied to physical subtotal
  affiliate_commission numeric default 20,  -- THB commission per qualifying order
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_affiliate_codes_code on affiliate_codes (code);
create index if not exists idx_affiliate_codes_user on affiliate_codes (user_id);

-- 4. Affiliate attribution + commission snapshot stored on the order row.
--    Commission only COUNTS when status = 'delivered' (computed at read time);
--    these columns capture the referral + the payout lifecycle.
alter table orders
  add column if not exists affiliate_code text,
  add column if not exists affiliate_user_id uuid references profiles(id),
  add column if not exists affiliate_discount_thb numeric default 0,
  add column if not exists affiliate_commission_thb numeric default 0,
  add column if not exists affiliate_paid_at timestamptz,
  add column if not exists affiliate_payout_proof_url text,
  add column if not exists affiliate_payout_note text;
create index if not exists idx_orders_affiliate_user on orders (affiliate_user_id);

-- 5. Payout account details (shared by artists & affiliates — both live on profiles)
alter table profiles
  add column if not exists payout_account_name text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_payment_method text,   -- Bank Transfer | PromptPay | PayPal | Other
  add column if not exists payout_note text;

-- 6. Affiliate monthly payout records (mirrors artist_payouts)
create table if not exists affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid references profiles(id),
  month int not null,
  year int not null,
  calculated_commission numeric default 0,
  paid_amount numeric default 0,
  status text default 'pending',            -- pending | paid
  payout_proof_url text,
  payout_note text,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_affiliate_payouts_user on affiliate_payouts (affiliate_user_id);

-- 7. Grants — the API talks to these tables with the service role. Without explicit
--    grants new tables raise "permission denied for table ...". (Safe to re-run.)
grant all privileges on affiliate_requests to anon, authenticated, service_role;
grant all privileges on affiliate_codes    to anon, authenticated, service_role;
grant all privileges on affiliate_payouts  to anon, authenticated, service_role;
