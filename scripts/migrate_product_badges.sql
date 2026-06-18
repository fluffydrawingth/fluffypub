-- "Hot" badge flag for products (admin-controlled). The "New" badge already exists
-- (is_new) and now also auto-shows for 30 days after creation on the frontend.
-- Safe to run multiple times.
alter table products
  add column if not exists is_hot boolean default false;
