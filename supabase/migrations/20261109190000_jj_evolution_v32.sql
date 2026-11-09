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
  or r.engine_version not in ('3.1.0','3.2.0')
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
