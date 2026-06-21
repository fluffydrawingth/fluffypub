-- Community v6: Fluffy Creator profile fields + per-post recommended tools.
-- Run in Supabase SQL editor. Safe to re-run.

-- ── Fluffy Creator profile (on profiles) — shown only for approved creators ──
-- Separate from the lightweight customer community fields (community_about etc.).
alter table profiles
  add column if not exists creator_bio       text,
  add column if not exists creator_tiktok    text,
  add column if not exists creator_instagram text,
  add column if not exists creator_youtube   text,
  add column if not exists creator_website   text;

-- ── Per-post recommended coloring tools (Fluffy Creators only) ───────────────
-- Array of { name, url } — max 2 enforced in the API. Affiliate links allowed.
alter table community_posts
  add column if not exists recommended_tools jsonb default '[]'::jsonb;
