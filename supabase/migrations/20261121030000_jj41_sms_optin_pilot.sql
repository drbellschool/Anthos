-- Anthos Deep Dive 4.1 voluntary SMS coaching pilot.
-- Only trusted server-side service-role code may read these records.
create table if not exists public.anthos_jj41_sms_participants (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.anthos_jj4_rooms(id) on delete cascade,
 role text not null check (role in ('jack','jill')),
 phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
 encrypted_token text not null,
 join_consent_at timestamptz,
 stopped_at timestamptz,
 last_sent_scene smallint not null default -1 check (last_sent_scene between -1 and 5),
 last_sent_sophia boolean not null default false,
 last_choice_phase smallint not null default -1 check (last_choice_phase between -1 and 5),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (room_id,role)
);
create index if not exists jj41_sms_phone_lookup
 on public.anthos_jj41_sms_participants(phone_e164,created_at desc);
create table if not exists public.anthos_jj41_sms_webhook_events (
 provider_event_id text primary key,
 phone_e164 text not null,
 received_at timestamptz not null default now(),
 processing_state text not null default 'started' check (processing_state in ('started','complete','error')),
 updated_at timestamptz not null default now()
);
alter table public.anthos_jj41_sms_participants enable row level security;
alter table public.anthos_jj41_sms_webhook_events enable row level security;
revoke all on public.anthos_jj41_sms_participants from anon, authenticated, public;
revoke all on public.anthos_jj41_sms_webhook_events from anon, authenticated, public;
grant select, insert, update on public.anthos_jj41_sms_participants to service_role;
grant select, insert, update on public.anthos_jj41_sms_webhook_events to service_role;
comment on table public.anthos_jj41_sms_participants is
 'Only opt-in SMS test sessions. Raw invitation token is encrypted with a server-only key. User coach messages stay in JJ4 private rows.';
comment on table public.anthos_jj41_sms_webhook_events is
 'Telnyx inbound webhook idempotency, no private message bodies stored here.';
