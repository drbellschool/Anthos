-- Couple Discovery v1: additive, private server-side storage foundation.
-- Deliberately inaccessible to anon/authenticated until individual account auth,
-- authenticated API authorization, and mutual reveal endpoints are implemented.
create table if not exists public.couple_discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  question_key text not null check (length(question_key) between 3 and 100),
  petal_slug text references public.anthos_petals(slug) on delete set null,
  story_key text,
  chapter_number smallint check (chapter_number between 1 and 8),
  status text not null default 'collecting'
    check (status in ('collecting','mutually_shared','closed')),
  created_at timestamptz not null default now(),
  revealed_at timestamptz,
  unique(id,couple_id)
);
create table if not exists public.couple_discovery_answers (
  session_id uuid not null,
  couple_id uuid not null,
  participant_id uuid not null,
  self_choice text not null check (length(self_choice) between 1 and 100),
  predicted_choice text not null check (length(predicted_choice) between 1 and 100),
  explanation text not null default '' check (length(explanation) <= 360),
  share_authorized boolean not null default false,
  submitted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key(session_id,participant_id),
  foreign key(session_id,couple_id)
    references public.couple_discovery_sessions(id,couple_id) on delete cascade,
  foreign key(couple_id,participant_id)
    references public.couple_members(couple_id,user_id) on delete cascade
);
create index if not exists discovery_answers_by_couple
 on public.couple_discovery_answers(couple_id,submitted_at);
create table if not exists public.couple_discovery_activity_briefs (
  session_id uuid primary key references public.couple_discovery_sessions(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  shared_preferences jsonb not null default '[]'::jsonb
    check (jsonb_typeof(shared_preferences)='array'),
  status text not null default 'suggested'
    check (status in ('suggested','considering','approved','declined')),
  created_at timestamptz not null default now()
);
alter table public.couple_discovery_sessions enable row level security;
alter table public.couple_discovery_answers enable row level security;
alter table public.couple_discovery_activity_briefs enable row level security;
revoke all on public.couple_discovery_sessions from public,anon,authenticated;
revoke all on public.couple_discovery_answers from public,anon,authenticated;
revoke all on public.couple_discovery_activity_briefs from public,anon,authenticated;
grant select,insert,update,delete on public.couple_discovery_sessions to service_role;
grant select,insert,update,delete on public.couple_discovery_answers to service_role;
grant select,insert,update,delete on public.couple_discovery_activity_briefs to service_role;
comment on table public.couple_discovery_sessions is 'Private discovery rounds; not directly exposed to customers.';
comment on table public.couple_discovery_answers is 'One independent answer and prediction per member; share flag is explicit, default false. Never disclose before mutual approval.';
comment on table public.couple_discovery_activity_briefs is 'Minimum permitted actual preferences for future Paraclete handoffs; no guesses or hidden conversations.';
