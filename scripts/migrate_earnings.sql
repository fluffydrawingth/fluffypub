-- Earnings & Payout system migration
-- Run this in Supabase SQL editor

-- Add royalty/fee fields to products table
alter table products
  add column if not exists artist_physical_royalty_thb numeric,
  add column if not exists digital_platform_fee_thb numeric,
  add column if not exists digital_platform_fee_usd numeric;

-- Create artist_payouts table for tracking payout records per artist per month
create table if not exists artist_payouts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references profiles(id),
  month int not null,
  year int not null,
  currency text not null default 'THB',
  calculated_earning numeric default 0,
  paid_amount numeric default 0,
  status text default 'pending',   -- pending | paid
  payout_proof_url text,
  payout_note text,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant all on table public.artist_payouts to service_role;
