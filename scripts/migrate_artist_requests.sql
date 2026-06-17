-- Artist Dashboard V1 migration
-- Run this in the Supabase SQL editor.

create table if not exists artist_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  username text,
  email text,
  message text,
  status text default 'pending',          -- pending | approved | rejected
  request_date timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

-- Link a promoted user-profile to an existing artist-profile row (self-link allowed).
alter table profiles add column if not exists artist_id uuid references profiles(id);

-- Artist public contact email (separate from account email).
alter table profiles add column if not exists contact_email text;
