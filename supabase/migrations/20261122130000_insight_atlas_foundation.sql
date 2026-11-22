-- Insight Atlas: durable, couple-scoped skill and evidence ledger.
-- This is an additive schema. No existing room, message or participant is changed.
-- Existing JJ4 rooms expire; Atlas never cascade-deletes yearlong evidence with a pilot room.
-- All Atlas records are server-only until a separate, explicit post-episode sharing gate is satisfied.
create table if not exists public.anthos_atlas_episodes (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 source_room_id uuid references public.anthos_jj4_rooms(id) on delete set null,
 story_key text not null check (length(story_key) between 1 and 160),
 story_title text not null check (length(story_title) between 1 and 240),
 episode_month date,
 engine_version text not null,
 status text not null default 'in_progress' check (status in ('in_progress','complete','archived')),
 husband_review_consent_at timestamptz,
 wife_review_consent_at timestamptz,
 review_unlocked_at timestamptz,
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 constraint atlas_review_gate check (review_unlocked_at is null or
   (status='complete' and husband_review_consent_at is not null and wife_review_consent_at is not null)),
 unique (couple_id,source_room_id)
);
create index if not exists atlas_episodes_couple_time
 on public.anthos_atlas_episodes(couple_id,created_at desc);

create table if not exists public.anthos_atlas_skill_catalog (
 skill_id text primary key check (skill_id ~ '^[a-z][a-z0-9-]{2,79}$'),
 skill_title text not null,
 research_foundation text not null,
 skill_description text not null,
 color_hex text not null check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
 code_version integer not null default 1 check (code_version>0),
 active boolean not null default true
);
comment on table public.anthos_atlas_skill_catalog is
 'Anthos-authored educational codebook, research-informed; not a validated couple assessment instrument.';

create table if not exists public.anthos_atlas_skill_states (
 couple_id uuid not null references public.couples(id) on delete cascade,
 subject text not null check (subject in ('husband','wife','jack','jill')),
 skill_id text not null references public.anthos_atlas_skill_catalog(skill_id) on delete restrict,
 score numeric(4,2) not null default 3.00 check (score between 1.00 and 5.00),
 evidence_count integer not null default 0 check (evidence_count>=0),
 revision integer not null default 0 check (revision>=0),
 last_observed_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key (couple_id,subject,skill_id)
);
comment on table public.anthos_atlas_skill_states is
 'Separate yearlong states for husband/wife coaching and Jack/Jill enacted behavior. Initial 3.00 is a provisional engine baseline, not a measured person score.';

create table if not exists public.anthos_atlas_evidence (
 id bigint generated always as identity primary key,
 couple_id uuid not null references public.couples(id) on delete cascade,
 episode_id uuid not null references public.anthos_atlas_episodes(id) on delete cascade,
 subject text not null check (subject in ('husband','wife','jack','jill')),
 evidence_lane text not null check (evidence_lane in ('coaching','character','story','safety')),
 skill_id text references public.anthos_atlas_skill_catalog(skill_id) on delete restrict,
 source_kind text not null check (source_kind in ('coach_message','character_message','room_event','open_turn','reflection')),
 source_ref text not null check (length(source_ref) between 1 and 160),
 source_quote text not null check (length(source_quote) between 1 and 1800),
 explanation text not null default '',
 observed_rating smallint check (observed_rating between 1 and 5),
 confidence numeric(4,3) check (confidence between 0 and 1),
 context_class text not null default 'relevant' check
  (context_class in ('selected','incidental','relevant','safety')),
 interpretation text not null default 'observed' check
  (interpretation in ('observed','ambiguous','quoted','joke','negated','refused')),
 safety_flag text,
 model_version text not null default 'atlas-v1',
 occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 constraint atlas_evidence_lane_subject check
  ((evidence_lane='coaching' and subject in ('husband','wife')) or
   (evidence_lane='character' and subject in ('jack','jill')) or
   evidence_lane in ('story','safety')),
 unique (episode_id,subject,skill_id,source_kind,source_ref,model_version)
);
create index if not exists atlas_evidence_couple_skill
 on public.anthos_atlas_evidence(couple_id,skill_id,occurred_at desc);
create index if not exists atlas_evidence_episode
 on public.anthos_atlas_evidence(episode_id,occurred_at,id);
comment on table public.anthos_atlas_evidence is
 'Immutable source anchors in the admin evidence trail. A quote or joke alone is not a verified enacted character action.';

create table if not exists public.anthos_atlas_movements (
 evidence_id bigint primary key references public.anthos_atlas_evidence(id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 subject text not null check (subject in ('husband','wife','jack','jill')),
 skill_id text not null references public.anthos_atlas_skill_catalog(skill_id) on delete restrict,
 previous_score numeric(4,2) not null check (previous_score between 1 and 5),
 new_score numeric(4,2) not null check (new_score between 1 and 5),
 delta numeric(4,2) generated always as (new_score-previous_score) stored,
 recorded_at timestamptz not null default now()
);
create index if not exists atlas_movements_couple_skill
 on public.anthos_atlas_movements(couple_id,subject,skill_id,recorded_at);

create table if not exists public.anthos_atlas_memories (
 id uuid primary key default gen_random_uuid(),
 couple_id uuid not null references public.couples(id) on delete cascade,
 originating_episode_id uuid references public.anthos_atlas_episodes(id) on delete set null,
 originating_evidence_id bigint references public.anthos_atlas_evidence(id) on delete set null,
 memory_key text not null check (length(memory_key) between 1 and 150),
 memory_summary text not null check (length(memory_summary) between 1 and 1400),
 characters text[] not null default array[]::text[],
 skill_ids text[] not null default array[]::text[],
 tags text[] not null default array[]::text[],
 tension text not null default 'unresolved' check(tension in ('resolved','unresolved','evolving')),
 salience smallint not null default 3 check(salience between 1 and 5),
 last_referenced_at timestamptz,
 created_at timestamptz not null default now(),
 unique(couple_id,memory_key)
);
create index if not exists atlas_memories_retrieval
 on public.anthos_atlas_memories(couple_id,salience desc,created_at desc);
comment on table public.anthos_atlas_memories is
 'Persistent character and relationship history. Reference never re-applies the originating movement.';

create table if not exists public.anthos_atlas_quality_runs (
 id uuid primary key default gen_random_uuid(),
 episode_id uuid references public.anthos_atlas_episodes(id) on delete cascade,
 test_id text not null check(length(test_id) between 1 and 140),
 engine_version text not null,
 rubric_version text not null default 'atlas-quality-v1',
 scores jsonb not null default '{}'::jsonb,
 evidence jsonb not null default '[]'::jsonb,
 critical_failures text[] not null default array[]::text[],
 overall numeric(4,2) check(overall between 0 and 10),
 pass boolean not null default false,
 created_at timestamptz not null default now(),
 constraint atlas_quality_pass check(not pass or
   (overall>=8 and cardinality(critical_failures)=0))
);
create index if not exists atlas_quality_runs_time
 on public.anthos_atlas_quality_runs(created_at desc);

-- No customer direct reads/writes. Access via couple-authorized server endpoints only.
alter table public.anthos_atlas_episodes enable row level security;
alter table public.anthos_atlas_skill_catalog enable row level security;
alter table public.anthos_atlas_skill_states enable row level security;
alter table public.anthos_atlas_evidence enable row level security;
alter table public.anthos_atlas_movements enable row level security;
alter table public.anthos_atlas_memories enable row level security;
alter table public.anthos_atlas_quality_runs enable row level security;
revoke all on public.anthos_atlas_episodes,public.anthos_atlas_skill_catalog,
 public.anthos_atlas_skill_states,public.anthos_atlas_evidence,
 public.anthos_atlas_movements,public.anthos_atlas_memories,
 public.anthos_atlas_quality_runs from public,anon,authenticated;
revoke all on sequence public.anthos_atlas_evidence_id_seq from public,anon,authenticated;
grant select,insert,update on public.anthos_atlas_episodes to service_role;
grant select,insert,update on public.anthos_atlas_skill_catalog to service_role;
grant select,insert,update on public.anthos_atlas_skill_states to service_role;
grant select,insert on public.anthos_atlas_evidence to service_role;
grant select,insert on public.anthos_atlas_movements to service_role;
grant select,insert,update on public.anthos_atlas_memories to service_role;
grant select,insert on public.anthos_atlas_quality_runs to service_role;
grant usage,select on sequence public.anthos_atlas_evidence_id_seq to service_role;
