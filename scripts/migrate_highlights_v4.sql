-- Add show_in_header flag to community_highlights
-- Allows admins to pin up to 3 items to the "What's happening" widget
-- in the Community page header area.

alter table community_highlights
  add column if not exists show_in_header boolean default false;

notify pgrst, 'reload schema';
