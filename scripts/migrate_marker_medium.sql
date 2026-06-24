-- Add medium field to community_tags so marker/set names can be linked to a specific medium.
-- Only used for type='marker' rows (e.g. medium='Alcohol Marker').

alter table community_tags
  add column if not exists medium text;

-- Index for fast filtering by medium in the Add Post form suggestions query.
create index if not exists community_tags_medium_idx on community_tags(medium) where medium is not null;

notify pgrst, 'reload schema';
