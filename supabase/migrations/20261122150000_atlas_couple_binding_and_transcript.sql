-- Insight Atlas: prospective, two-person authenticated room binding and durable
-- transcript archive. Existing private pilots cannot be silently linked.
create table if not exists public.anthos_atlas_room_claims(
 room_id uuid not null references public.anthos_jj4_rooms(id) on delete cascade,
 couple_id uuid not null references public.couples(id) on delete cascade,
 role text not null check(role in ('jack','jill')),
 user_id uuid not null references public.participants(user_id) on delete cascade,
 shared_review_disclosure_ack_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 primary key (room_id,role),
 unique(room_id,user_id)
);
create index if not exists atlas_claims_member on public.anthos_atlas_room_claims(couple_id,user_id);
create unique index if not exists atlas_one_room_one_couple on public.anthos_atlas_episodes(source_room_id)
 where source_room_id is not null;

create table if not exists public.anthos_atlas_transcript(
 id bigint generated always as identity primary key,
 episode_id uuid not null,
 couple_id uuid not null,
 source_key text not null check(length(source_key) between 3 and 160),
 actor text not null check(actor in ('husband','wife','jack','jill','sophia','shared')),
 kind text not null check(kind in ('coach','character','story','intro','sophia')),
 scene_day smallint check(scene_day between 0 and 5),
 body text not null check(length(body) between 1 and 1800),
 source_time timestamptz not null default now(),
 archived_at timestamptz not null default now(),
 unique(episode_id,source_key),
 foreign key(episode_id,couple_id) references public.anthos_atlas_episodes(id,couple_id) on delete cascade
);
create index if not exists atlas_transcript_episode on public.anthos_atlas_transcript(episode_id,source_time,id);

alter table public.anthos_atlas_room_claims enable row level security;
alter table public.anthos_atlas_transcript enable row level security;
revoke all on public.anthos_atlas_room_claims,public.anthos_atlas_transcript from public,anon,authenticated;
revoke all on sequence public.anthos_atlas_transcript_id_seq from public,anon,authenticated;
grant select,insert,update on public.anthos_atlas_room_claims to service_role;
grant select,insert on public.anthos_atlas_transcript to service_role;
grant usage,select on sequence public.anthos_atlas_transcript_id_seq to service_role;

create or replace function public.anthos_atlas_claim_room(
 p_room uuid,p_couple uuid,p_user uuid,p_role text,p_invite_hash text,
 p_ack_shared_future_review boolean
) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.anthos_jj4_rooms%rowtype;
 n int; linked_id uuid; existing public.anthos_atlas_room_claims%rowtype;
begin
 if p_ack_shared_future_review is distinct from true then
  raise exception 'Read the shared-review disclosure before linking';end if;
 if p_role not in ('jack','jill') or length(coalesce(p_invite_hash,''))<>64 then
  raise exception 'Invalid Atlas invite role/hash';end if;
 select * into r from public.anthos_jj4_rooms where id=p_room for update;
 if not found or r.stage='retired' or r.expires_at<=now()
  or r.episode #>> '{authored43,version}' <> '4.3.0'
  or coalesce(jsonb_array_length(case when jsonb_typeof(r.episode #> '{authored43,turns}')='array'
    then r.episode #> '{authored43,turns}' else '[]'::jsonb end),0)>0
  or exists(select 1 from public.anthos_jj4_messages
       where room_id=p_room and kind='coach')
 then raise exception 'Only new, uncoached 4.3 rooms can be linked';end if;
 if not exists(select 1 from public.couple_members cm
   join public.couples c on c.id=cm.couple_id
   where cm.couple_id=p_couple and cm.user_id=p_user
    and cm.status='active' and c.status='active')
 then raise exception 'Current active couple membership required';end if;
 if not exists(select 1 from public.anthos_jj4_participants
   where room_id=p_room and role=p_role and token_hash=p_invite_hash)
 then raise exception 'Invite token does not match this participant';end if;
 if exists(select 1 from public.anthos_atlas_room_claims
   where room_id=p_room and (couple_id<>p_couple
    or (role=p_role and user_id<>p_user)
    or (role<>p_role and user_id=p_user)))
 then raise exception 'Room already claimed or invalid couple identities';end if;
 insert into public.anthos_atlas_room_claims(room_id,couple_id,user_id,role)
 values(p_room,p_couple,p_user,p_role)
 on conflict (room_id,role) do nothing;
 select count(*) into n from public.anthos_atlas_room_claims
  where room_id=p_room and couple_id=p_couple;
 if n=2 then
  insert into public.anthos_atlas_episodes(couple_id,source_room_id,story_key,
    story_title,episode_month,engine_version)
  values(p_couple,p_room,'jj4:'||coalesce(r.scenario_id::text,'microwave'),
    left(r.title,240),date_trunc('month',now())::date,'4.3.0')
  on conflict(couple_id,source_room_id) do nothing;
 end if;
 select id into linked_id from public.anthos_atlas_episodes
  where source_room_id=p_room and couple_id=p_couple;
 return linked_id; -- null until both spouses explicitly link.
end $$;
revoke all on function public.anthos_atlas_claim_room(uuid,uuid,uuid,text,text,boolean)
 from public,anon,authenticated;
grant execute on function public.anthos_atlas_claim_room(uuid,uuid,uuid,text,text,boolean) to service_role;
