-- Authenticated Anthos editorial review queue. Story content and participant progress
-- remain separate. No customer/anonymous direct access.
create table if not exists public.deep_dive_editorial_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.deep_dive_stories(id) on delete restrict,
  chapter_number smallint not null check (chapter_number between 1 and 8),
  target_kind text not null check (target_kind in
    ('chapter_title','narrative','prompt','option_text','option_impact',
     'option_coach','takeaway','transition','repair_text','ending')),
  target_index smallint check (target_index between 0 and 5),
  source_text text not null check (length(source_text) between 1 and 5000),
  feedback text not null check (length(trim(feedback)) between 3 and 1400),
  proposed_text text check (proposed_text is null or length(proposed_text) between 1 and 5000),
  proposal_reason text,
  risk text not null default 'unassessed'
    check (risk in ('unassessed','low','review_required')),
  status text not null default 'pending'
    check (status in ('pending','suggested','accepted','dismissed','needs_review')),
  ai_model text,
  created_at timestamptz not null default now(),
  proposed_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint editorial_index_required check
    (case when target_kind in ('option_text','option_impact','option_coach','ending','repair_text')
      then target_index is not null else target_index is null end),
  constraint editorial_ending_is_last check (target_kind <> 'ending' or chapter_number=8),
  constraint editorial_proposal_status check (status not in ('suggested','accepted') or proposed_text is not null)
);
create index if not exists deep_dive_editorial_comments_work_queue
 on public.deep_dive_editorial_comments(status,created_at);
create index if not exists deep_dive_editorial_comments_story
 on public.deep_dive_editorial_comments(story_id,chapter_number,target_kind,target_index);
-- Only one approved overlay per content location for a given story version.
create unique index if not exists deep_dive_editorial_one_accepted_per_location
 on public.deep_dive_editorial_comments(story_id,chapter_number,target_kind,coalesce(target_index,-1))
 where status='accepted';
alter table public.deep_dive_editorial_comments enable row level security;
revoke all on public.deep_dive_editorial_comments from public,anon,authenticated;
grant select,insert,update on public.deep_dive_editorial_comments to service_role;
comment on table public.deep_dive_editorial_comments is
 'Admin-only line-level notes and optional AI replacement proposals; accepting an overlay never changes canonical chapters, customer data, or published story grades.';
