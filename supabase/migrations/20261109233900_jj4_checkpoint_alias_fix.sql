-- Fix the deployed v4 RPC checkpoint JSONB aliases; no existing rooms are changed.
create or replace function public.anthos_jj4_commit_scene(
 p_room uuid,p_claim uuid,p_phase integer,p_story text,p_jack text,p_jill text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare r record; cp jsonb; aud text; wait_flag boolean; phase_name text; next_stage text;
begin
 select * into r from public.anthos_jj4_rooms where id=p_room for update;
 if not found or r.stage<>'generating' or r.processing_token is distinct from p_claim or r.phase_index<>p_phase then return false;end if;
 if length(trim(coalesce(p_story,'')))<80 or length(p_story)>2500 then return false;end if;
 insert into public.anthos_jj4_messages(room_id,role,kind,phase_index,body)
 values(p_room,'shared','scene',p_phase,p_story);
 phase_name := (array['hook','conflict','discovery','reattempt','outcome'])[p_phase+1];
 cp:=null;
 if p_phase<5 then
  select value into cp from jsonb_array_elements(coalesce(r.episode->'checkpoints','[]'::jsonb)) as e(value)
    where value->>'afterPhase'=phase_name limit 1;
 end if;
 aud:=coalesce(cp->>'audience','none');
 wait_flag:=coalesce((cp->>'waitForReply')::boolean,false);
 if aud in ('jack','both') and length(trim(coalesce(p_jack,'')))>15 then
  insert into public.anthos_jj4_messages(room_id,role,kind,phase_index,body) values(p_room,'jack','prompt',p_phase,left(p_jack,1200));
 end if;
 if aud in ('jill','both') and length(trim(coalesce(p_jill,'')))>15 then
  insert into public.anthos_jj4_messages(room_id,role,kind,phase_index,body) values(p_room,'jill','prompt',p_phase,left(p_jill,1200));
 end if;
 next_stage:=case when p_phase=5 then 'complete'
  when wait_flag and aud in ('jack','jill','both') then 'awaiting' else 'flow' end;
 update public.anthos_jj4_rooms set stage=next_stage,processing_token=null,processing_at=null,updated_at=now()
 where id=p_room;
 return true;
end $$;

create or replace function public.anthos_jj4_submit_coaching(
 p_room uuid,p_participant uuid,p_phase integer,p_message text,p_key uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
declare r record; who record; phase_name text; cp jsonb; aud text; both_ready boolean;
begin
 select * into r from public.anthos_jj4_rooms where id=p_room for update;
 if not found or r.stage<>'awaiting' or r.phase_index<>p_phase then return false; end if;
 select * into who from public.anthos_jj4_participants where id=p_participant and room_id=p_room for update;
 if not found or who.joined_at is null then return false; end if;
 phase_name:=(array['hook','conflict','discovery','reattempt','outcome'])[p_phase+1];
 select value into cp from jsonb_array_elements(coalesce(r.episode->'checkpoints','[]'::jsonb)) as e(value)
 where value->>'afterPhase'=phase_name limit 1;
 aud:=coalesce(cp->>'audience','none');
 if (who.role='jack' and aud not in ('jack','both')) or
    (who.role='jill' and aud not in ('jill','both')) or
     who.submitted_phase=p_phase then return false;end if;
 if length(trim(p_message))<2 or length(p_message)>900 then return false;end if;
 insert into public.anthos_jj4_messages(room_id,role,kind,phase_index,body,request_key)
 values(p_room,who.role,'coach',p_phase,trim(p_message),p_key);
 update public.anthos_jj4_participants set submitted_phase=p_phase where id=who.id;
 select (aud='jack' or coalesce((select submitted_phase=p_phase from public.anthos_jj4_participants
 where room_id=p_room and role='jill'),false))
 and (aud='jill' or coalesce((select submitted_phase=p_phase from public.anthos_jj4_participants
 where room_id=p_room and role='jack'),false)) into both_ready;
 if both_ready then update public.anthos_jj4_rooms set stage='flow',updated_at=now() where id=p_room;end if;
 return true;
end $$;
