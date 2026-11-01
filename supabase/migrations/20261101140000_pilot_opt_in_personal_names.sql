-- Opt-in, spouse-supplied first name/nickname for pilot personalization.
-- Existing invitations and consented rooms remain valid with NULL names.
alter table public.anthos_pilot_participants
  add column if not exists display_name text;
alter table public.anthos_pilot_participants
  drop constraint if exists anthos_pilot_participants_display_name_check;
alter table public.anthos_pilot_participants
  add constraint anthos_pilot_participants_display_name_check
  check (display_name is null or (char_length(display_name) between 1 and 32));
comment on column public.anthos_pilot_participants.display_name is
  'First name or nickname, voluntarily provided by invite owner and shared with spouse and Sophia within the room.';
