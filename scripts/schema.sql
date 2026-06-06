-- ============================================================
-- Fluffy Pub — Supabase Schema
-- Run this entire file in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── profiles (extends Supabase auth.users) ──────────────────
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  name        text not null default '',
  role        text not null default 'customer' check (role in ('customer','artist','admin')),
  bio         text default '',
  artist_slug text unique,
  favorites   text[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-set artist_slug for artists
create or replace function public.set_artist_slug()
returns trigger as $$
begin
  if new.role = 'artist' and new.artist_slug is null then
    new.artist_slug := lower(regexp_replace(new.name, '\s+', '-', 'g'));
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists before_profile_update on public.profiles;
create trigger before_profile_update
  before insert or update on public.profiles
  for each row execute procedure public.set_artist_slug();

-- ── products ─────────────────────────────────────────────────
create table if not exists public.products (
  id           uuid default uuid_generate_v4() primary key,
  title        text not null,
  slug         text not null unique,
  price        numeric(10,2) not null,
  original_price numeric(10,2),
  artist_id    uuid references public.profiles(id) on delete set null,
  artist_name  text not null default '',
  artist_slug  text default '',
  category     text not null,
  description  text default '',
  image        text default '🎨',
  type         text not null default 'digital' check (type in ('digital','physical')),
  pages        integer default 0,
  rating       numeric(3,2) default 0,
  reviews      integer default 0,
  tags         text[] default '{}',
  featured     boolean default false,
  bestseller   boolean default false,
  is_new       boolean default true,
  active       boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists products_slug_idx on public.products(slug);
create index if not exists products_artist_idx on public.products(artist_id);
create index if not exists products_active_idx on public.products(active);

-- ── orders ───────────────────────────────────────────────────
create table if not exists public.orders (
  id                uuid default uuid_generate_v4() primary key,
  user_id           uuid references public.profiles(id) on delete set null,
  guest_email       text,
  customer_name     text not null,
  customer_email    text not null,
  customer_phone    text,
  shipping_address  jsonb,
  items             jsonb not null default '[]',
  subtotal          numeric(10,2) not null,
  discount          numeric(10,2) default 0,
  total             numeric(10,2) not null,
  promo_code        text,
  status            text not null default 'pending_payment'
                    check (status in ('pending_payment','paid','packing','shipped','delivered','cancelled')),
  payment_status    text not null default 'pending'
                    check (payment_status in ('pending','paid','refunded')),
  type              text not null default 'digital' check (type in ('digital','physical')),
  tracking_number   text,
  shipping_provider text,
  paid_at           timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);

-- ── theme ────────────────────────────────────────────────────
create table if not exists public.theme (
  id            integer primary key default 1,
  config        jsonb not null default '{}',
  updated_at    timestamptz default now(),
  constraint single_row check (id = 1)
);

-- Insert default theme row
insert into public.theme (id, config) values (1, '{
  "primaryColor": "#f472b6",
  "secondaryColor": "#c084fc",
  "accentColor": "#fb923c",
  "bgColor": "#fdf2f8",
  "bgColor2": "#faf5ff",
  "textColor": "#4a1942",
  "fontFamily": "''Nunito'', sans-serif",
  "logoText": "Fluffy Pub",
  "logoEmoji": "🐰",
  "heroTitle": "Color Your World ✨",
  "heroSubtitle": "Adorable coloring books for every dreamer 🌸",
  "bannerText": "🌟 Free shipping on orders over $30! Use FLUFFY15 for 15% off 🌸",
  "bannerBg": "#f472b6",
  "sections": ["hero","featured","categories","artists","newsletter"]
}') on conflict (id) do nothing;

-- ── Row Level Security ───────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.products  enable row level security;
alter table public.orders    enable row level security;
alter table public.theme     enable row level security;

-- profiles: users can read all, only update own
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- products: anyone reads active, artists manage own, admins manage all
create policy "Active products are public"
  on public.products for select using (active = true);

create policy "Artists can insert own products"
  on public.products for insert
  with check (auth.uid() = artist_id);

create policy "Artists can update own products"
  on public.products for update
  using (auth.uid() = artist_id);

create policy "Admins can do everything on products"
  on public.products for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- orders: authenticated users see own, admins see all
create policy "Users see own orders"
  on public.orders for select
  using (user_id = auth.uid());

create policy "Anyone can create orders"
  on public.orders for insert
  with check (true);

create policy "Admins see all orders"
  on public.orders for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- theme: anyone can read, only admins update
create policy "Theme is publicly readable"
  on public.theme for select using (true);

create policy "Only admins can update theme"
  on public.theme for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── Seed products (run after creating an artist account) ─────
-- NOTE: Replace 'YOUR-ARTIST-USER-ID' with the UUID from auth.users
-- after you create the artist@mochi.art account via the app.

-- Example (uncomment and fill in after signup):
/*
insert into public.products
  (title, slug, price, original_price, artist_id, artist_name, artist_slug, category, description, image, type, pages, rating, reviews, tags, featured, bestseller, is_new)
values
  ('Bunny Garden Dreams','bunny-garden-dreams',8.99,12.99,'YOUR-ARTIST-USER-ID','Mochi Arts','mochi-arts','Animals','Hop through enchanting gardens filled with playful bunnies, blooming flowers, and whimsical butterflies.','🐰','digital',30,4.9,247,'{"bunnies","garden","spring"}',true,true,false),
  ('Celestial Mandalas','celestial-mandalas',9.99,null,'YOUR-ARTIST-USER-ID','Mochi Arts','mochi-arts','Mandala','Journey through the cosmos with intricate mandala designs featuring moons, stars, and constellations.','🌙','digital',40,4.8,189,'{"stars","moon","cosmic"}',true,false,false),
  ('Sweet Kawaii World','sweet-kawaii-world',7.99,null,'YOUR-ARTIST-USER-ID','Mochi Arts','mochi-arts','Kawaii','Adorable kawaii characters, yummy food friends, and super cute scenes to bring to life with your colors!','🍓','digital',25,5.0,312,'{"cute","food","characters"}',true,true,true),
  ('Enchanted Forest','enchanted-forest',10.99,null,'YOUR-ARTIST-USER-ID','Mochi Arts','mochi-arts','Fantasy','Step into a magical forest where fairies dance among giant mushrooms and fireflies light the way.','🍄','digital',35,4.7,156,'{"forest","fairies","mushrooms"}',false,false,true),
  ('Botanical Bliss','botanical-bliss',9.49,null,'YOUR-ARTIST-USER-ID','Mochi Arts','mochi-arts','Botanicals','Lush botanical illustrations featuring exotic flowers, tropical leaves, and delicate succulents.','🌿','digital',45,4.6,203,'{"flowers","leaves","nature"}',false,false,false),
  ('Winter Wonderland','winter-wonderland',8.49,11.99,'YOUR-ARTIST-USER-ID','Mochi Arts','mochi-arts','Seasonal','Cozy winter scenes with snowflakes, woodland animals in scarves, and festive holiday magic.','❄️','digital',28,4.9,178,'{"winter","snow","holiday"}',false,false,false),
  ('Ocean Friends','ocean-friends',8.99,null,'YOUR-ARTIST-USER-ID','Mochi Arts','mochi-arts','Animals','Dive deep with adorable sea creatures, mermaids, coral reefs, and underwater kingdoms!','🐠','digital',32,4.8,134,'{"ocean","fish","mermaids"}',false,false,true),
  ('Dragon Tales','dragon-tales',11.99,null,'YOUR-ARTIST-USER-ID','Mochi Arts','mochi-arts','Fantasy','Epic fantasy adventures with friendly dragons, mystical castles, and brave little knights.','🐉','digital',38,4.9,267,'{"dragons","castles","magic"}',true,true,false);
*/
