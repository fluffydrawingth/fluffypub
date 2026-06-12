-- Add payment slip rejection tracking columns to orders
alter table public.orders
  add column if not exists slip_reject_reason text,
  add column if not exists slip_reject_note    text,
  add column if not exists slip_rejected_at    timestamptz;

GRANT ALL ON public.orders TO service_role;
