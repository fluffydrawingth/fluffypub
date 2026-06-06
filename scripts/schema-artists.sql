-- Add artist management fields to profiles
alter table public.profiles 
  add column if not exists cover_image_url text,
  add column if not exists avatar_url text,
  add column if not exists website text,
  add column if not exists social_links jsonb default '{}',
  add column if not exists artist_status text default 'active';

-- Grant permissions
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.products TO service_role;
