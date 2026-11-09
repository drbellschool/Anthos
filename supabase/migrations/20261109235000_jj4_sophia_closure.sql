-- Anthos 4.0: Sophia research-based closing reflection, one per room.
-- Preserve existing 4.0 room history; closing reflections also work for completed rooms.
alter table public.anthos_jj4_messages
 drop constraint if exists anthos_jj4_messages_kind_check;
alter table public.anthos_jj4_messages
 add constraint anthos_jj4_messages_kind_check
 check (kind in ('scene','prompt','coach','sophia'));
create unique index if not exists anthos_jj4_single_sophia_closure
 on public.anthos_jj4_messages (room_id) where role='shared' and kind='sophia';

create or replace function public.anthos_jj4_claim_closure(p_room uuid,p_claim uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
declare v_room uuid;
begin
 update public.anthos_jj4_rooms r
 set processing_token=p_claim,processing_at=now(),updated_at=now()
 where r.id=p_room and r.stage='complete'
 and (r.processing_token is null or r.processing_at<now()-interval '100 seconds')
 and not exists (select 1 from public.anthos_jj4_messages m
   where m.room_id=r.id and m.role='shared' and m.kind='sophia')
 returning r.id into v_room;
 return v_room is not null;
end $$;

create or replace function public.anthos_jj4_commit_closure(
 p_room uuid,p_claim uuid,p_message text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare r record;
begin
 select * into r from public.anthos_jj4_rooms where id=p_room for update;
 if not found or r.stage<>'complete' or r.processing_token is distinct from p_claim then return false;end if;
 if length(trim(coalesce(p_message,'')))<120 or length(p_message)>2500 then return false;end if;
 insert into public.anthos_jj4_messages(room_id,role,kind,phase_index,body)
 values(p_room,'shared','sophia',5,trim(p_message))
 on conflict do nothing;
 update public.anthos_jj4_rooms
 set processing_token=null,processing_at=null,updated_at=now() where id=p_room;
 return exists(select 1 from public.anthos_jj4_messages m
   where m.room_id=p_room and m.role='shared' and m.kind='sophia');
end $$;
revoke all on function public.anthos_jj4_claim_closure(uuid,uuid) from public,anon,authenticated;
revoke all on function public.anthos_jj4_commit_closure(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.anthos_jj4_claim_closure(uuid,uuid) to service_role;
grant execute on function public.anthos_jj4_commit_closure(uuid,uuid,text) to service_role;
