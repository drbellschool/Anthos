-- Prevent a Paraclete brief from being mislabeled as belonging to a
-- different couple than the original, mutually shared discovery session.
alter table public.couple_discovery_activity_briefs
  add constraint discovery_brief_session_couple_fkey
  foreign key (session_id,couple_id)
  references public.couple_discovery_sessions(id,couple_id)
  on delete cascade;
