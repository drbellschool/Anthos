-- Add a durable, concurrency-safe three-moment structure to the existing live Deep Dive pilot.
-- Rooms created before this update retain their messages and remain readable.
alter table public.anthos_pilot_rooms
  add column if not exists story_beat smallint not null default 1;
alter table public.anthos_pilot_rooms
  add constraint anthos_pilot_rooms_story_beat_range
  check (story_beat between 1 and 3);
comment on column public.anthos_pilot_rooms.story_beat is
  '1 = initial disagreement, 2 = complications, 3 = underlying need; pilot progress only.';
