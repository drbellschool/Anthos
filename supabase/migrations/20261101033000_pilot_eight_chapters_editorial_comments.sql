-- Maintain legacy 3-scene pilot rooms while enabling the new 8-chapter co-op story.
alter table public.anthos_pilot_rooms drop constraint if exists anthos_pilot_rooms_story_beat_range;
alter table public.anthos_pilot_rooms add constraint anthos_pilot_rooms_story_beat_range check (story_beat between 1 and 8);
alter table public.anthos_pilot_rooms add column if not exists story_format text not null default 'short';
alter table public.anthos_pilot_rooms drop constraint if exists anthos_pilot_rooms_story_format_check;
alter table public.anthos_pilot_rooms add constraint anthos_pilot_rooms_story_format_check check (story_format in ('short','full'));
create table if not exists public.anthos_pilot_comments(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.anthos_pilot_rooms(id) on delete cascade,
 author_role text not null check (author_role in ('a','b')),
 chapter_number smallint not null check (chapter_number between 1 and 8),
 target_kind text not null check (target_kind in ('chapter','option','message','general','answer')),
 target_index integer,
 target_excerpt text not null default '',
 feedback text not null check (char_length(feedback) between 3 and 1400),
 created_at timestamptz not null default now(),
 check ((target_kind='option' and target_index between 0 and 2) or (target_kind='message' and target_index >= 1) or (target_kind not in ('option','message') and target_index is null))
);
create index if not exists anthos_pilot_comments_room_idx on public.anthos_pilot_comments(room_id,created_at desc);
alter table public.anthos_pilot_comments enable row level security;
revoke all on public.anthos_pilot_comments from public,anon,authenticated;
grant select,insert,update,delete on public.anthos_pilot_comments to service_role;
comment on table public.anthos_pilot_comments is 'Private per-spouse beta editorial notes; do not expose in shared couple chat.';
