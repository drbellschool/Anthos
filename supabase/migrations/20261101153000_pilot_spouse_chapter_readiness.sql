-- Each spouse independently chooses whether this chapter is ready for its consequence.
-- A new message or an explicit "keep talking" action clears both flags.
-- The current chapter is authoritative; flags from earlier chapters never count.
alter table public.anthos_pilot_participants
 add column if not exists ready_chapter smallint not null default 0;
alter table public.anthos_pilot_participants
 drop constraint if exists anthos_pilot_participants_ready_chapter_check;
alter table public.anthos_pilot_participants
 add constraint anthos_pilot_participants_ready_chapter_check
 check (ready_chapter between 0 and 8);
comment on column public.anthos_pilot_participants.ready_chapter is
 'Explicit per-spouse readiness for generating one shared chapter consequence. Zero means keep discussing.';
