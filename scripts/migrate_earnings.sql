-- Earnings & Payout system migration
-- Run this in Supabase SQL editor (safe to run multiple times)

-- Add royalty/fee fields to products table
alter table products
  add column if not exists artist_physical_royalty_thb numeric,
  add column if not exists digital_platform_fee_thb numeric,
  add column if not exists digital_platform_fee_usd numeric,
  add column if not exists digital_artist_royalty_percent numeric;

-- Create artist_payouts table
create table if not exists artist_payouts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references profiles(id),
  month int not null,
  year int not null,
  -- Legacy single-currency fields (kept for backwards compat)
  currency text not null default 'THB',
  calculated_earning numeric default 0,
  paid_amount numeric default 0,
  -- Separate THB / USD fields
  calculated_earning_thb numeric default 0,
  calculated_earning_usd numeric default 0,
  paid_amount_thb numeric default 0,
  paid_amount_usd numeric default 0,
  usd_to_thb_rate numeric,             -- optional exchange rate entered by admin
  -- Breakdown snapshot (JSON, stored for reference)
  physical_qty int default 0,
  physical_earning_thb numeric default 0,
  digital_qty_thb int default 0,
  digital_gross_thb numeric default 0,
  digital_earning_thb numeric default 0,
  digital_qty_usd int default 0,
  digital_gross_usd numeric default 0,
  digital_earning_usd numeric default 0,
  -- Status & proof
  status text default 'pending',       -- pending | paid
  payout_proof_url text,
  payout_note text,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant all on table public.artist_payouts to service_role;

-- Add new columns to existing table if it already exists
alter table artist_payouts add column if not exists calculated_earning_thb numeric default 0;
alter table artist_payouts add column if not exists calculated_earning_usd numeric default 0;
alter table artist_payouts add column if not exists paid_amount_thb numeric default 0;
alter table artist_payouts add column if not exists paid_amount_usd numeric default 0;
alter table artist_payouts add column if not exists usd_to_thb_rate numeric;
alter table artist_payouts add column if not exists physical_qty int default 0;
alter table artist_payouts add column if not exists physical_earning_thb numeric default 0;
alter table artist_payouts add column if not exists digital_qty_thb int default 0;
alter table artist_payouts add column if not exists digital_gross_thb numeric default 0;
alter table artist_payouts add column if not exists digital_earning_thb numeric default 0;
alter table artist_payouts add column if not exists digital_qty_usd int default 0;
alter table artist_payouts add column if not exists digital_gross_usd numeric default 0;
alter table artist_payouts add column if not exists digital_earning_usd numeric default 0;
