-- Anthos product decision: Insight Atlas is a shared couple workspace by default.
-- No per-spouse disclosure-acknowledgment or per-episode opt-in.
-- Authentication and couple membership remain mandatory; outsiders excluded.
-- These columns are unused in production: no Atlas episodes or claims existed.
alter table public.anthos_atlas_episodes drop constraint if exists atlas_review_gate;
alter table public.anthos_atlas_episodes drop column if exists review_unlocked_at;
alter table public.anthos_atlas_episodes drop column if exists husband_review_consent_at;
alter table public.anthos_atlas_episodes drop column if exists wife_review_consent_at;
alter table public.anthos_atlas_room_claims drop column if exists shared_review_disclosure_ack_at;

drop function if exists public.anthos_atlas_claim_room(uuid,uuid,uuid,text,text,boolean);
create function public.anthos_atlas_claim_room(
 p_room uuid,p_couple uuid,p_user uuid,p_role text,p_invite_hash text
) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.anthos_jj4_rooms%rowtype;
 n int; linked_id uuid; existing public.anthos_atlas_room_claims%rowtype;
begin
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
revoke all on function public.anthos_atlas_claim_room(uuid,uuid,uuid,text,text)
 from public,anon,authenticated;
grant execute on function public.anthos_atlas_claim_room(uuid,uuid,uuid,text,text) to service_role;

comment on table public.anthos_atlas_episodes is
 'Shared, authenticated couple-owned Insight Atlas episodes. No separate Deep Dive review permission.';
comment on table public.anthos_atlas_room_claims is
 'Each spouse proves role-specific access and active couple membership, not consent to share within the couple.';
