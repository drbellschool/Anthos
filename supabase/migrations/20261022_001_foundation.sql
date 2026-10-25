-- Anthos foundational schema — not yet deployed.
-- Apply only after reviewing data lifecycle, auth configuration and RLS policies.
-- Requires Supabase Auth (auth.users). Intentionally grants no client table access.
create extension if not exists pgcrypto;

create table if not exists public.participants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  age_18_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','active','paused','ended')),
  created_at timestamptz not null default now()
);
create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.participants(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  status text not null default 'invited' check (status in ('invited','accepted','left')),
  primary key (couple_id,user_id)
);
create unique index if not exists one_active_couple_per_user on public.couple_members(user_id)
  where status='accepted';
-- Two-person limit and separate, confirmed invitation acceptance must be enforced
-- transactionally in the trusted service layer before activating a couple.

create table if not exists public.sms_consents (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(user_id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  program text not null default 'threefold' check (program='threefold'),
  state text not null default 'pending' check (state in ('pending','opted_in','opted_out')),
  method text not null check (method in ('keyword','web','manual_verified')),
  disclosure_version text not null,
  evidence_reference text,
  consented_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (state <> 'opted_in' or consented_at is not null),
  check (state <> 'opted_out' or opted_out_at is not null)
);
create index if not exists sms_consent_phone_lookup on public.sms_consents(phone_e164,created_at desc);

-- Immutable audit events, populated only by trusted backend/webhook code.
create table if not exists public.sms_consent_events (
  id uuid primary key default gen_random_uuid(),
  consent_id uuid not null references public.sms_consents(id) on delete restrict,
  event_type text not null check(event_type in ('opt_in_requested','opt_in_confirmed','opt_out','help','reconsent','carrier_sync')),
  occurred_at timestamptz not null default now(),
  provider_event_id text unique,
  source text not null,
  metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.partner_shares (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references public.participants(user_id),
  recipient_id uuid not null references public.participants(user_id),
  item_type text not null check (item_type in ('whisper','plan','milestone')),
  item_reference uuid not null,
  confirmed_at timestamptz not null,
  created_at timestamptz not null default now(),
  check(sender_id <> recipient_id)
);
-- Ensure both sender and recipient belong to this couple when implementing server commands.
create table if not exists public.deep_dive_progress (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(user_id) on delete cascade,
  story_key text not null,
  story_version integer not null check(story_version > 0),
  chapter integer not null default 1 check(chapter between 1 and 8),
  completed integer not null default 0 check(completed between 0 and 8),
  mastery text check(mastery in ('demonstrated','not_yet_demonstrated')),
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(participant_id,story_key,story_version)
);
create table if not exists public.sms_outbox (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(user_id) on delete cascade,
  consent_id uuid not null references public.sms_consents(id),
  recipient_e164 text not null,
  body text not null check(char_length(body) between 1 and 1600),
  status text not null default 'held' check(status in ('held','queued','sent','delivered','failed','cancelled')),
  idempotency_key text not null unique,
  provider_message_id text unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
-- Outbound jobs MUST recheck latest consent state and carrier approval immediately
-- before sending. STOP webhook handling must atomically suppress pending messages.

alter table public.participants enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.sms_consents enable row level security;
alter table public.sms_consent_events enable row level security;
alter table public.partner_shares enable row level security;
alter table public.deep_dive_progress enable row level security;
alter table public.sms_outbox enable row level security;

-- Fail-closed: authenticated/anon clients get NO policies or direct table access.
revoke all on table public.participants,public.couples,public.couple_members,
 public.sms_consents,public.sms_consent_events,public.partner_shares,
 public.deep_dive_progress,public.sms_outbox from anon,authenticated;
-- Add narrow policies or vetted server-only RPCs after threat modeling.
