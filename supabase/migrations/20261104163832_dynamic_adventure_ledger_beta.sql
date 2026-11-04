-- Gated Dynamic Adventure Engine; existing classic/fluid rooms are untouched.
alter table public.anthos_pilot_rooms
 drop constraint anthos_pilot_rooms_conversation_mode_check;
alter table public.anthos_pilot_rooms
 add constraint anthos_pilot_rooms_conversation_mode_check
 check (conversation_mode in ('classic','fluid','dynamic'));
create table if not exists public.anthos_dynamic_adventures(
 room_id uuid primary key references public.anthos_pilot_rooms(id) on delete cascade,
 version integer not null default 0 check (version>=0),
 processing boolean not null default false,
 state jsonb not null check (jsonb_typeof(state)='object'),
 updated_at timestamptz not null default now()
);
alter table public.anthos_dynamic_adventures enable row level security;
revoke all on public.anthos_dynamic_adventures from public,anon,authenticated;
grant select,insert,update,delete on public.anthos_dynamic_adventures to service_role;
comment on table public.anthos_dynamic_adventures is 'Private beta continuity ledger and eight relationship checkpoint evidence; accessible only through server-side consent-checked pilot APIs.';
