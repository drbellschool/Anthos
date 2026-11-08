-- An explicit, participant-authored move must remain possible when AI misses natural advice.
-- The actual shared event is still gated by anthos_jj3_submit and both participants.
create or replace function public.anthos_jj3_set_choice(
 p_room uuid,p_participant uuid,p_step integer,p_action text
) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.anthos_jj3_rooms%rowtype;
        p public.anthos_jj3_participants%rowtype;
begin
 select * into r from public.anthos_jj3_rooms where id=p_room for update;
 if not found or r.status<>'active' or r.step<>p_step or r.processing_token is not null then return false; end if;
 select * into p from public.anthos_jj3_participants where id=p_participant and room_id=p_room for update;
 if not found or p.consented_at is null or p.submitted_step=p_step then return false; end if;
 if length(trim(coalesce(p_action,'')))<10 or length(p_action)>900 then return false; end if;
 update public.anthos_jj3_participants
    set pending_step=p_step,pending_action=p_action
    where id=p_participant;
 return true;
end $$;
revoke all on function public.anthos_jj3_set_choice(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.anthos_jj3_set_choice(uuid,uuid,integer,text) to service_role;