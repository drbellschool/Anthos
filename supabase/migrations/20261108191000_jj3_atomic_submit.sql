-- Commit a participant's chosen fictional move exactly once.
create or replace function public.anthos_jj3_submit(
 p_room uuid,p_participant uuid,p_step integer
) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.anthos_jj3_rooms%rowtype;
        p public.anthos_jj3_participants%rowtype;
begin
 select * into r from public.anthos_jj3_rooms where id=p_room for update;
 if not found or r.status<>'active' or r.step<>p_step or r.processing_token is not null then return false; end if;
 select * into p from public.anthos_jj3_participants where id=p_participant and room_id=p_room for update;
 if not found or p.consented_at is null then return false; end if;
 if p.submitted_step=p_step then return true; end if;
 if p.pending_step<>p_step or length(trim(coalesce(p.pending_action,'')))<8 then return false; end if;
 update public.anthos_jj3_participants
   set submitted_step=p_step,submitted_action=p.pending_action
   where id=p_participant;
 return true;
end $$;
revoke all on function public.anthos_jj3_submit(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.anthos_jj3_submit(uuid,uuid,integer) to service_role;
