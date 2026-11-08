-- Anthos: clean character-first Jack & Jill 3.0 pilot engine.
-- The preceding 2.x pilot data is preserved for audit, but no longer active.
update public.anthos_jj2_rooms set status='paused',resolving=false,processing_at=null
where status='active';
create table if not exists public.anthos_jj3_rooms(
 id uuid primary key default gen_random_uuid(),
 title text not null,
 scenario_id uuid references public.anthos_jj2_scenarios(id),
 mode text not null check(mode in('shared','individual')),
 petal_slug text,
 scene jsonb not null,
 step smallint not null default 1 check(step between 1 and 5),
 status text not null default 'active' check(status in('active','complete','retired')),
 processing_at timestamptz,
 processing_token uuid,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '30 days')
);
create table if not exists public.anthos_jj3_participants(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.anthos_jj3_rooms(id) on delete cascade,
 role text not null check(role in('jack','jill')),
 token_hash text not null unique,
 name text,
 consented_at timestamptz,
 pending_step smallint,
 pending_action text,
 submitted_step smallint,
 submitted_action text,
 private_memory jsonb not null default '{}'::jsonb,
 learning_log jsonb not null default '{}'::jsonb,
 reflection text,
 created_at timestamptz not null default now(),
 unique(room_id,role)
);
create table if not exists public.anthos_jj3_messages(
 id bigint generated always as identity primary key,
 room_id uuid not null references public.anthos_jj3_rooms(id) on delete cascade,
 role text not null check(role in('jack','jill','shared')),
 author text not null check(author in('coach','character','sophia','story')),
 kind text not null check(kind in('intro','reply','coach','aside','outcome','reflection')),
 step smallint not null check(step between 0 and 6),
 body text not null,
 request_key text,
 created_at timestamptz not null default now()
);
create unique index if not exists jj3_unique_intro
 on public.anthos_jj3_messages(room_id,role,step) where kind='intro';
create unique index if not exists jj3_unique_outcome
 on public.anthos_jj3_messages(room_id,step) where kind='outcome';
create unique index if not exists jj3_unique_request
 on public.anthos_jj3_messages(room_id,role,request_key)
 where kind='coach' and request_key is not null;
create index if not exists jj3_message_history on public.anthos_jj3_messages(room_id,role,id);
create index if not exists jj3_participants_room on public.anthos_jj3_participants(room_id);
alter table public.anthos_jj3_rooms enable row level security;
alter table public.anthos_jj3_participants enable row level security;
alter table public.anthos_jj3_messages enable row level security;
revoke all on public.anthos_jj3_rooms,public.anthos_jj3_participants,public.anthos_jj3_messages from anon,authenticated;
grant select,insert,update,delete on public.anthos_jj3_rooms,public.anthos_jj3_participants,public.anthos_jj3_messages to service_role;
grant usage,select on sequence public.anthos_jj3_messages_id_seq to service_role;

-- Atomic private exchange: both messages and the private decision are saved
-- together, or none are. Duplicate browser retries are harmless.
create or replace function public.anthos_jj3_write_turn(
 p_room uuid,p_participant uuid,p_step integer,p_key text,
 p_user text,p_character text,p_aside text,p_action text,
 p_memory jsonb,p_learning jsonb
) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.anthos_jj3_rooms%rowtype;
        p public.anthos_jj3_participants%rowtype;
begin
 select * into r from public.anthos_jj3_rooms where id=p_room for update;
 if not found or r.status<>'active' or r.step<>p_step or r.processing_token is not null then return false; end if;
 select * into p from public.anthos_jj3_participants where id=p_participant and room_id=p_room for update;
 if not found or p.consented_at is null or p.submitted_step=p_step then return false; end if;
 if exists(select 1 from public.anthos_jj3_messages where room_id=p_room and role=p.role and request_key=p_key and kind='coach') then return true; end if;
 if length(trim(coalesce(p_user,'')))<2 or length(trim(coalesce(p_character,'')))<8 or length(p_key)>90 then return false; end if;
 insert into public.anthos_jj3_messages(room_id,role,author,kind,step,body,request_key)
 values(p_room,p.role,'coach','coach',p_step,left(p_user,900),p_key),
       (p_room,p.role,'character','reply',p_step,left(p_character,2000),null);
 if length(trim(coalesce(p_aside,'')))>0 then
  insert into public.anthos_jj3_messages(room_id,role,author,kind,step,body)
  values(p_room,p.role,'sophia','aside',p_step,left(p_aside,950));
 end if;
 update public.anthos_jj3_participants
  set pending_step=case when length(trim(coalesce(p_action,'')))>=8 then p_step else pending_step end,
      pending_action=case when length(trim(coalesce(p_action,'')))>=8 then left(p_action,900) else pending_action end,
      private_memory=coalesce(p_memory,'{}'::jsonb),
      learning_log=coalesce(p_learning,'{}'::jsonb)
  where id=p_participant;
 return true;
end $$;

-- A single claim can drive the shared outcome; a stale claim may be replaced.
create or replace function public.anthos_jj3_claim(
 p_room uuid,p_step integer,p_token uuid
) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.anthos_jj3_rooms%rowtype; expected integer; actual integer;
begin
 select * into r from public.anthos_jj3_rooms where id=p_room for update;
 if not found or r.status<>'active' or r.step<>p_step then return false; end if;
 expected:=case when r.mode='individual' then 1 else 2 end;
 select count(*) into actual from public.anthos_jj3_participants
  where room_id=p_room and submitted_step=p_step and submitted_action is not null;
 if actual<>expected then return false; end if;
 if r.processing_token is not null and r.processing_at>now()-interval '100 seconds' then return false; end if;
 update public.anthos_jj3_rooms set processing_token=p_token,processing_at=now() where id=p_room;
 return true;
end $$;

create or replace function public.anthos_jj3_publish(
 p_room uuid,p_step integer,p_token uuid,p_outcome text,p_scene jsonb
) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.anthos_jj3_rooms%rowtype; expected integer; actual integer;
begin
 select * into r from public.anthos_jj3_rooms where id=p_room for update;
 if not found or r.status<>'active' or r.step<>p_step or r.processing_token is distinct from p_token then return false; end if;
 expected:=case when r.mode='individual' then 1 else 2 end;
 select count(*) into actual from public.anthos_jj3_participants
  where room_id=p_room and submitted_step=p_step and submitted_action is not null;
 if actual<>expected or length(trim(coalesce(p_outcome,'')))<30
  or p_scene is null or jsonb_typeof(p_scene)<>'object' or length(coalesce(p_scene->>'scene',''))<30 then return false; end if;
 if exists(select 1 from public.anthos_jj3_messages where room_id=p_room and step=p_step and kind='outcome') then return false; end if;
 insert into public.anthos_jj3_messages(room_id,role,author,kind,step,body)
 values(p_room,'shared','story','outcome',p_step,left(p_outcome,2500));
 update public.anthos_jj3_rooms
  set scene=p_scene,step=least(p_step+1,5),
      status=case when p_step>=5 then 'complete' else 'active' end,
      processing_token=null,processing_at=null
  where id=p_room;
 return true;
end $$;

create or replace function public.anthos_jj3_release(
 p_room uuid,p_step integer,p_token uuid
) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 update public.anthos_jj3_rooms set processing_token=null,processing_at=null
 where id=p_room and step=p_step and processing_token=p_token;
 return found;
end $$;

revoke all on function public.anthos_jj3_write_turn(uuid,uuid,integer,text,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.anthos_jj3_claim(uuid,integer,uuid) from public,anon,authenticated;
revoke all on function public.anthos_jj3_publish(uuid,integer,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.anthos_jj3_release(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.anthos_jj3_write_turn(uuid,uuid,integer,text,text,text,text,text,jsonb,jsonb) to service_role;
grant execute on function public.anthos_jj3_claim(uuid,integer,uuid) to service_role;
grant execute on function public.anthos_jj3_publish(uuid,integer,uuid,text,jsonb) to service_role;
grant execute on function public.anthos_jj3_release(uuid,integer,uuid) to service_role;
