-- Anthos: private two-invite Deep Dive pilot. This is not a customer-account model.
create table if not exists public.anthos_pilot_rooms (
 id uuid primary key default gen_random_uuid(),
 title text not null default 'Jack and Jill: The Saturday Surprise',
 status text not null default 'active' check (status in ('active','proposed','completed','closed')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '14 days'),
 ai_turns integer not null default 0 check (ai_turns between 0 and 12),
 proposed_answer text check (proposed_answer is null or char_length(proposed_answer) between 1 and 800),
 proposed_by text check (proposed_by is null or proposed_by in ('a','b'))
);
create table if not exists public.anthos_pilot_participants (
 room_id uuid not null references public.anthos_pilot_rooms(id) on delete cascade,
 role text not null check (role in ('a','b')),
 token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
 consented_at timestamptz,
 last_sent_at timestamptz,
 primary key (room_id,role)
);
create table if not exists public.anthos_pilot_messages (
 id bigint generated always as identity primary key,
 room_id uuid not null references public.anthos_pilot_rooms(id) on delete cascade,
 author text not null check (author in ('a','b','sophia','system')),
 body text not null check (char_length(body) between 1 and 900),
 created_at timestamptz not null default now()
);
create index if not exists anthos_pilot_messages_room_id_id_idx on public.anthos_pilot_messages(room_id,id);
create index if not exists anthos_pilot_participants_hash_idx on public.anthos_pilot_participants(token_hash);
alter table public.anthos_pilot_rooms enable row level security;
alter table public.anthos_pilot_participants enable row level security;
alter table public.anthos_pilot_messages enable row level security;
revoke all on public.anthos_pilot_rooms, public.anthos_pilot_participants, public.anthos_pilot_messages from public, anon, authenticated;
grant select,insert,update,delete on public.anthos_pilot_rooms, public.anthos_pilot_participants, public.anthos_pilot_messages to service_role;
revoke all on sequence public.anthos_pilot_messages_id_seq from public, anon, authenticated;
grant usage,select on sequence public.anthos_pilot_messages_id_seq to service_role;
comment on table public.anthos_pilot_rooms is 'Private short-lived invite-only pilot, API service-only; manual deletion or future cleanup required.';
