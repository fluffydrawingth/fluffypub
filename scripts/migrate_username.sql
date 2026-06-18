-- Public display name (username), separate from the account holder's real name and
-- shipping address. Optional; safe to run multiple times.
alter table profiles
  add column if not exists username text;
