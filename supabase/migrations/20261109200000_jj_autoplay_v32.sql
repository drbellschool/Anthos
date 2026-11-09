-- Autonomous shared Jack & Jill story progression.
-- Existing rooms remain unchanged unless explicitly enabled.
alter table public.anthos_jj3_rooms add column if not exists autoplay boolean not null default false;

-- One friend's private advice => one committed fictional move, atomically.
-- No filler character acknowledgement text is added to the private chat.
create or replace function public.anthos_jj3_commit_coach_move(
 p_room uuid,p_participant uuid,p_step integer,p_key text,p_user text,p_action text
) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.anthos_jj3_rooms%rowtype;
        p public.anthos_jj3_participants%rowtype;
begin
 select * into r from public.anthos_jj3_rooms where id=p_room for update;
 if not found or not r.autoplay or r.engine_version<>'3.2.0'
  or r.mode<>'shared' or r.status<>'active' or r.step<>1 or p_step<>1
  or r.processing_token is not null then return false; end if;
 select * into p from public.anthos_jj3_participants
  where id=p_participant and room_id=p_room for update;
 if not found or p.consented_at is null or p.submitted_step=1 then return false; end if;
 if length(trim(coalesce(p_user,'')))<2 or length(p_user)>900
  or length(trim(coalesce(p_action,'')))<15 or length(p_action)>900
  or length(coalesce(p_key,''))<20 or length(p_key)>90 then return false; end if;
 if (p.role='jack' and p_action not like 'Jack %')
   or (p.role='jill' and p_action not like 'Jill %') then return false; end if;
 if exists(select 1 from public.anthos_jj3_messages
  where room_id=p_room and role=p.role and step=1 and kind='coach') then return false; end if;
 insert into public.anthos_jj3_messages(room_id,role,author,kind,step,body,request_key)
 values(p_room,p.role,'coach','coach',1,p_user,p_key);
 update public.anthos_jj3_participants
 set pending_step=1,pending_action=p_action,submitted_step=1,submitted_action=p_action
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
 if not found or not r.autoplay or r.engine_version<>'3.2.0'
  or r.mode<>'shared' or r.status<>'active' or r.step<>p_step
  or p_step not between 2 and 5 or r.processing_token is not null
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