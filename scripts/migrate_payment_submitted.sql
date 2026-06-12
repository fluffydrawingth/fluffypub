-- Allow 'payment_submitted' in the payment_status check constraint
alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('pending','payment_submitted','paid','refunded'));

-- Add payment slip rejection tracking columns
alter table public.orders
  add column if not exists slip_reject_reason text,
  add column if not exists slip_reject_note    text,
  add column if not exists slip_rejected_at    timestamptz;

GRANT ALL ON public.orders TO service_role;
