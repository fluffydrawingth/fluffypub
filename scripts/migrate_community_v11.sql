-- Community v11: Highlights & Events
create table if not exists community_highlights (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'announcement'
    check (type in ('challenge','giveaway','announcement','partner','sponsored')),
  cover_image text,
  description text,
  start_date date,
  end_date date,
  link_url text,
  status text not null default 'draft'
    check (status in ('draft','active','expired')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

notify pgrst, 'reload schema';
