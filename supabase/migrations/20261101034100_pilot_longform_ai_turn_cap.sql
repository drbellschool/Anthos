alter table public.anthos_pilot_rooms drop constraint if exists anthos_pilot_rooms_ai_turns_check;
alter table public.anthos_pilot_rooms add constraint anthos_pilot_rooms_ai_turns_check check (ai_turns between 0 and 24);
