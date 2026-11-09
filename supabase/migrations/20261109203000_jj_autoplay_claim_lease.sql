-- High-reasoning fictional story calls can use 65s + 75s retry.
-- The old 100s claim lease let parallel progress requests steal a LIVE claim.
-- Extend it to cover the full bounded inference window; released claims
-- still become available immediately after an actual error.
create or replace function public.anthos_jj3_claim(p_room uuid,p_step integer,p_token uuid)
returns boolean language plpgsql security invoker
set search_path=public,pg_temp as $$
declare r public.anthos_jj3_rooms%rowtype;
 expected integer; actual integer;
begin
 select * into r from public.anthos_jj3_rooms where id=p_room for update;
 if not found or r.status<>'active' or r.step<>p_step then return false; end if;
 expected:=case when r.mode='individual' then 1 else 2 end;
 select count(*) into actual from public.anthos_jj3_participants
  where room_id=p_room and submitted_step=p_step and submitted_action is not null;
 if actual<>expected then return false; end if;
 if r.processing_token is not null
  and r.processing_at>now()-interval '180 seconds' then return false; end if;
 update public.anthos_jj3_rooms
  set processing_token=p_token,processing_at=now() where id=p_room;
 return true;
end $$;
revoke all on function public.anthos_jj3_claim(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.anthos_jj3_claim(uuid,integer,uuid) to service_role;