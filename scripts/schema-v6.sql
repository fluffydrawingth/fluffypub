-- Add profile fields for customers
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists shipping_address jsonb,
  add column if not exists delivery_email text,
  add column if not exists preferred_lang text default 'en';

GRANT ALL ON public.profiles TO service_role;
