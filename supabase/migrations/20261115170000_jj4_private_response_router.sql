-- Anthos 4.0: independent private questions and durable participation pause.
-- Additive changes; existing scenes, coaching rows and pilot state are unchanged.
alter table public.anthos_jj4_participants
 add column if not exists paused_at timestamptz;
alter table public.anthos_jj4_messages
 drop constraint if exists anthos_jj4_messages_kind_check;
alter table public.anthos_jj4_messages
 add constraint anthos_jj4_messages_kind_check
 check(kind in ('scene','prompt','coach','sophia','question','reply'));

-- Store private question and in-character reply in one transaction. Prevent
-- automatic phase submission; no cross-role exposure. Service key only.
create or replace function public.anthos_jj4_store_private_question(
 p_room uuid,p_participant uuid,p_phase integer,p_question text,p_reply text,p_key uuid
) returns text language plpgsql security invoker set search_path=public as $$
declare r record; who record; n integer;
begin
 select * into r from public.anthos_jj4_rooms where id=p_room for update;
 if not found or r.stage<>'awaiting' or r.phase_index<>p_phase then return 'unavailable'; end if;
 select * into who from public.anthos_jj4_participants
 where id=p_participant and room_id=p_room for update;
 if not found or who.joined_at is null or who.paused_at is not null or who.submitted_phase=p_phase
   then return 'unavailable'; end if;
 if exists(select 1 from public.anthos_jj4_messages
  where room_id=p_room and role=who.role and request_key=p_key) then return 'duplicate';end if;
 if length(trim(coalesce(p_question,'')))<2 or length(p_question)>900
  or length(trim(coalesce(p_reply,'')))<5 or length(p_reply)>900 then return 'invalid'; end if;
 select count(*) into n from public.anthos_jj4_messages
 where room_id=p_room and role=who.role and kind='question' and phase_index=p_phase;
 if n>=2 then return 'limit';end if;
 insert into public.anthos_jj4_messages(room_id,role,kind,phase_index,body,request_key)
 values(p_room,who.role,'question',p_phase,trim(p_question),p_key);
 insert into public.anthos_jj4_messages(room_id,role,kind,phase_index,body)
 values(p_room,who.role,'reply',p_phase,trim(p_reply));
 return 'saved';
end $$;

-- A paused participant blocks new scene claims, including those made by the
-- other participant, while preserving the last committed scene and phase.
create or replace function public.anthos_jj4_claim_scene(p_room uuid,p_claim uuid)
returns integer language plpgsql security invoker set search_path=public as $$
declare v_phase integer;
begin
 update public.anthos_jj4_rooms r
 set phase_index=case when stage='flow' then phase_index+1 else phase_index end,
     stage='generating',processing_token=p_claim,processing_at=now(),updated_at=now()
 where r.id=p_room and r.phase_index between 0 and 5
   and not exists (
    select 1 from public.anthos_jj4_participants p
    where p.room_id=r.id and p.joined_at is not null and p.paused_at is not null
   )
   and (r.stage in ('needs_scene','flow') or
       (r.stage='generating' and r.processing_at<now()-interval '110 seconds'))
 returning phase_index into v_phase;
 return coalesce(v_phase,-1);
end $$;

revoke all on function public.anthos_jj4_store_private_question(uuid,uuid,integer,text,text,uuid)
 from public,anon,authenticated;
grant execute on function public.anthos_jj4_store_private_question(uuid,uuid,integer,text,text,uuid)
 to service_role;
