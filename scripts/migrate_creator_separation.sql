-- Creator separation: track when affiliate access was approved so commission
-- is only calculated from that date forward. Safe to re-run.

alter table profiles
  add column if not exists affiliate_approved_at timestamptz;

-- Back-fill existing approved creators: use updated_at as a best-effort date.
-- (They were approved at some point; updated_at is the closest proxy we have.)
update profiles
  set affiliate_approved_at = updated_at
  where affiliate_enabled = true
    and affiliate_approved_at is null
    and updated_at is not null;

create index if not exists idx_profiles_affiliate_approved on profiles (affiliate_approved_at)
  where affiliate_enabled = true;
