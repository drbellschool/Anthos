-- Anthos curriculum library: twelve petals; draft Deep Dive versions; authored chapters.
-- This is a content repository, not a client-writable progress store.
-- The existing public.deep_dive_progress table remains separate and user-private.

create table if not exists public.anthos_petals (
  slug text primary key check (slug ~ '^[a-z0-9-]{3,80}$'),
  sort_order smallint not null unique check (sort_order between 1 and 12),
  name text not null unique,
  purpose text not null,
  primary_lenses text[] not null default '{}'::text[],
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.anthos_petals is 'Twelve relationship domains. Sort order is display order, not a mandated calendar sequence.';

create table if not exists public.deep_dive_stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9-]{3,100}$'),
  story_version integer not null default 1 check (story_version > 0),
  petal_slug text not null references public.anthos_petals(slug) on delete restrict,
  title text not null check (length(trim(title)) between 3 and 160),
  summary text not null default '',
  learning_objective text not null check (length(trim(learning_objective)) >= 12),
  status text not null default 'draft'
    check (status in ('draft','in_review','published','retired')),
  primary_lenses text[] not null default '{}'::text[],
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(slug,story_version),
  constraint published_requires_date check
    (status <> 'published' or published_at is not null)
);
create index if not exists deep_dive_stories_petal_status_idx
  on public.deep_dive_stories(petal_slug,status,slug);
comment on table public.deep_dive_stories is 'One immutable version per authored Deep Dive. Draft metadata is not a playable story.';

create table if not exists public.deep_dive_chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.deep_dive_stories(id) on delete cascade,
  chapter_number smallint not null check (chapter_number between 1 and 8),
  title text not null check (length(trim(title)) > 0),
  setting text not null default '',
  narrative text not null,
  prompt text,
  choices jsonb,
  takeaway text,
  transition_text text,
  is_independent_mastery boolean not null default false,
  ending_variants jsonb,
  created_at timestamptz not null default now(),
  unique(story_id,chapter_number),
  constraint independent_mastery_is_chapter_seven
    check (is_independent_mastery = (chapter_number = 7)),
  constraint authored_six_choices
    check (choices is null or
      (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) = 6)),
  constraint seventh_chapter_requires_choices
    check (chapter_number <> 7 or choices is not null),
  constraint eighth_chapter_not_a_choice
    check (chapter_number <> 8 or choices is null),
  constraint endings_only_on_eight
    check (ending_variants is null or
      (chapter_number = 8 and jsonb_typeof(ending_variants)='array'
        and jsonb_array_length(ending_variants)=6))
);
create index if not exists deep_dive_chapters_story_number_idx
  on public.deep_dive_chapters(story_id,chapter_number);
comment on table public.deep_dive_chapters is 'Eight milestones per authored story; mastery is independently assessed at chapter seven. Publication requires server-side content validation.';

alter table public.anthos_petals enable row level security;
alter table public.deep_dive_stories enable row level security;
alter table public.deep_dive_chapters enable row level security;

-- With all content in draft or review, the browser must not get direct
-- write access, accidentally publish content, or reveal authoring notes.
revoke all on table public.anthos_petals, public.deep_dive_stories,
  public.deep_dive_chapters from public, anon, authenticated;
grant select, insert, update, delete on table public.anthos_petals,
  public.deep_dive_stories, public.deep_dive_chapters to service_role;

-- Prevent progress from referencing missing story versions. The current
-- progress table is empty; this preserves referential integrity when
-- trusted progress writes are introduced.
alter table public.deep_dive_progress
  add constraint deep_dive_progress_story_version_fkey
  foreign key (story_key,story_version)
  references public.deep_dive_stories(slug,story_version)
  on update restrict on delete restrict;
