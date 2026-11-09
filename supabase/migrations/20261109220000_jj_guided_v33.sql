-- Guided 3.3: users direct at pivotal beats 1,3,5; Jack & Jill take actions autonomously at 2,4.
-- Additive change; completed 3.2 and active 3.1 rooms retain their prior protocol.
alter table public.anthos_jj3_rooms add column if not exists guidance_mode text not null default 'legacy';
alter table public.anthos_jj3_rooms drop constraint if exists anthos_jj3_rooms_guidance_mode_ck;
alter table public.anthos_jj3_rooms add constraint anthos_jj3_rooms_guidance_mode_ck
 check (guidance_mode in ('legacy','guided'));

-- v3.2: allow new full-journey rooms while old 3.1 trajectories continue unchanged.
-- Keeps the same service-only RPC and atomic append-only publication semantics.
create or replace function public.anthos_jj3_publish_evolution(
 p_room uuid,
 p_step integer,
 p_token uuid,
 p_outcome text,
 p_scene jsonb,
 p_evolution jsonb,
 p_effects jsonb
) returns boolean
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare r public.anthos_jj3_rooms%rowtype;
        expected integer;
        actual integer;
begin
 select * into r from public.anthos_jj3_rooms where id=p_room for update;
 if not found or r.status<>'active' or r.step<>p_step
  or r.engine_version not in ('3.1.0','3.2.0','3.3.0')
  or r.processing_token is distinct from p_token then return false; end if;
 expected:=case when r.mode='individual' then 1 else 2 end;
 select count(*) into actual from public.anthos_jj3_participants
  where room_id=p_room and submitted_step=p_step and submitted_action is not null;
 if actual<>expected then return false; end if;
 if exists(select 1 from public.anthos_jj3_messages
  where room_id=p_room and step=p_step and kind='outcome') then return false; end if;
 if exists(select 1 from public.anthos_jj3_evolution_events
  where room_id=p_room and step=p_step) then return false; end if;
 if length(trim(coalesce(p_outcome,'')))<90
  or p_scene is null or jsonb_typeof(p_scene)<>'object'
  or length(trim(coalesce(p_scene->>'scene','')))<55
  or p_evolution is null or jsonb_typeof(p_evolution)<>'object'
  or p_evolution->>'version'<>'evolution-1'
  or jsonb_typeof(p_evolution->'characters')<>'object'
  or jsonb_typeof(p_evolution->'arc')<>'object'
  or coalesce((p_evolution->>'completedBeats')::integer,-1)<>p_step
  or r.evolution_state is null
  or r.evolution_state->>'version'<>'evolution-1'
  or coalesce((r.evolution_state->>'completedBeats')::integer,-1)<>p_step-1
  or p_effects is null or jsonb_typeof(p_effects)<>'object' then return false; end if;
 insert into public.anthos_jj3_messages(room_id,role,author,kind,step,body)
 values(p_room,'shared','story','outcome',p_step,left(p_outcome,2500));
 insert into public.anthos_jj3_evolution_events(room_id,step,engine_version,before_state,after_state,observed_effects)
 values(p_room,p_step,r.engine_version,r.evolution_state,p_evolution,p_effects);
 update public.anthos_jj3_rooms
  set scene=p_scene,
      evolution_state=p_evolution,
      step=least(p_step+1,5),
      status=case when p_step>=5 then 'complete' else 'active' end,
      processing_token=null,
      processing_at=null
  where id=p_room;
 return true;
end $$;
revoke all on function public.anthos_jj3_publish_evolution(uuid,integer,uuid,text,jsonb,jsonb,jsonb)
 from public,anon,authenticated;
grant execute on function public.anthos_jj3_publish_evolution(uuid,integer,uuid,text,jsonb,jsonb,jsonb)
 to service_role;

create or replace function public.anthos_jj3_commit_coach_move(
 p_room uuid,p_participant uuid,p_step integer,p_key text,p_user text,p_action text
) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.anthos_jj3_rooms%rowtype;
        p public.anthos_jj3_participants%rowtype;
begin
 select * into r from public.anthos_jj3_rooms where id=p_room for update;
 if not found or not r.autoplay
  or not ((r.engine_version='3.2.0' and r.guidance_mode='legacy' and p_step=1)
    or (r.engine_version='3.3.0' and r.guidance_mode='guided' and p_step in (1,3,5)))
  or r.mode<>'shared' or r.status<>'active' or r.step<>p_step
  or r.processing_token is not null then return false; end if;
 select * into p from public.anthos_jj3_participants
  where id=p_participant and room_id=p_room for update;
 if not found or p.consented_at is null or p.submitted_step=p_step then return false; end if;
 if length(trim(coalesce(p_user,'')))<2 or length(p_user)>900
  or length(trim(coalesce(p_action,'')))<15 or length(p_action)>900
  or length(coalesce(p_key,''))<20 or length(p_key)>90 then return false; end if;
 if (p.role='jack' and p_action not like 'Jack %')
   or (p.role='jill' and p_action not like 'Jill %') then return false; end if;
 if exists(select 1 from public.anthos_jj3_messages
  where room_id=p_room and role=p.role and step=p_step and kind='coach') then return false; end if;
 insert into public.anthos_jj3_messages(room_id,role,author,kind,step,body,request_key)
 values(p_room,p.role,'coach','coach',p_step,p_user,p_key);
 update public.anthos_jj3_participants
 set pending_step=p_step,pending_action=p_action,submitted_step=p_step,submitted_action=p_action
 where id=p_participant;
 return true;
end $$;
revoke all on function public.anthos_jj3_commit_coach_move(uuid,uuid,integer,text,text,text)
 from public,anon,authenticated;
grant execute on function public.anthos_jj3_commit_coach_move(uuid,uuid,integer,text,text,text)
 to service_role;

-- One atomic, server-owned next pair of actions. The story director generates
-- these from observable shared events and fictional states, not spouse chats.
create or replace function public.anthos_jj3_autoplay_moves(
 p_room uuid,p_step integer,p_jack text,p_jill text
) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.anthos_jj3_rooms%rowtype;
        participants integer;
begin
 select * into r from public.anthos_jj3_rooms where id=p_room for update;
 if not found or not r.autoplay
  or not ((r.engine_version='3.2.0' and r.guidance_mode='legacy' and p_step between 2 and 5)
    or (r.engine_version='3.3.0' and r.guidance_mode='guided' and p_step in (2,4)))
  or r.mode<>'shared' or r.status<>'active' or r.step<>p_step
  or r.processing_token is not null
  or r.evolution_state->>'version'<>'evolution-1'
  or coalesce((r.evolution_state->>'completedBeats')::integer,-1)<>p_step-1
  then return false; end if;
 if length(trim(coalesce(p_jack,'')))<15 or length(p_jack)>900
  or length(trim(coalesce(p_jill,'')))<15 or length(p_jill)>900
  or p_jack not like 'Jack %' or p_jill not like 'Jill %'
  then return false; end if;
 select count(*) into participants from public.anthos_jj3_participants
 where room_id=p_room and role in ('jack','jill') and consented_at is not null
  and (submitted_step is null or submitted_step<>p_step);
 if participants<>2 then return false; end if;
 update public.anthos_jj3_participants
 set pending_step=p_step,
     pending_action=case role when 'jack' then p_jack else p_jill end,
     submitted_step=p_step,
     submitted_action=case role when 'jack' then p_jack else p_jill end
 where room_id=p_room and role in ('jack','jill');
 if not found then return false;end if;
 return true;
end $$;
revoke all on function public.anthos_jj3_autoplay_moves(uuid,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.anthos_jj3_autoplay_moves(uuid,integer,text,text)
 to service_role;