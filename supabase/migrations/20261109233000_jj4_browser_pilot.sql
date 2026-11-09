-- Dedicated Anthos 4.0 browser pilot, isolated from all previous JJ3 rooms.
-- Service-only PostgREST access; private coach advice is never exposed cross-role.
create table if not exists public.anthos_jj4_rooms (
 id uuid primary key default gen_random_uuid(),
 scenario_id uuid references public.anthos_jj2_scenarios(id) on delete restrict,
 title text not null,
 episode jsonb not null,
 phase_index smallint not null default 0 check (phase_index between 0 and 5),
 stage text not null default 'needs_scene' check (stage in ('needs_scene','generating','awaiting','flow','complete','retired')),
 processing_token uuid,
 processing_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '14 days'
);
create table if not exists public.anthos_jj4_participants (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.anthos_jj4_rooms(id) on delete cascade,
 role text not null check (role in ('jack','jill')),
 token_hash text not null unique,
 first_name text,
 joined_at timestamptz,
 submitted_phase smallint not null default -1,
 created_at timestamptz not null default now(),
 unique(room_id,role)
);
create table if not exists public.anthos_jj4_messages(
 id bigint generated always as identity primary key,
 room_id uuid not null references public.anthos_jj4_rooms(id) on delete cascade,
 role text not null check(role in ('jack','jill','shared')),
 kind text not null check(kind in ('scene','prompt','coach')),
 phase_index smallint not null check(phase_index between 0 and 5),
 body text not null check(length(body) between 1 and 2500),
 request_key uuid,
 created_at timestamptz not null default now(),
 unique(room_id,role,request_key)
);
create index if not exists anthos_jj4_messages_room_id_idx on public.anthos_jj4_messages(room_id,id);
alter table public.anthos_jj4_rooms enable row level security;
alter table public.anthos_jj4_participants enable row level security;
alter table public.anthos_jj4_messages enable row level security;
revoke all on public.anthos_jj4_rooms,public.anthos_jj4_participants,public.anthos_jj4_messages from anon,authenticated;
revoke all on sequence public.anthos_jj4_messages_id_seq from anon,authenticated;

create or replace function public.anthos_jj4_claim_scene(p_room uuid,p_claim uuid)
returns integer language plpgsql security invoker set search_path=public as $$
declare v_phase integer;
begin
 update public.anthos_jj4_rooms
 set phase_index=case when stage='flow' then phase_index+1 else phase_index end,
     stage='generating',processing_token=p_claim,processing_at=now(),updated_at=now()
 where id=p_room and phase_index between 0 and 5
   and (stage in ('needs_scene','flow') or
       (stage='generating' and processing_at<now()-interval '110 seconds'))
 returning phase_index into v_phase;
 return coalesce(v_phase,-1);
end $$;

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
revoke all on function public.anthos_jj4_claim_scene(uuid,uuid) from public,anon,authenticated;
revoke all on function public.anthos_jj4_commit_scene(uuid,uuid,integer,text,text,text) from public,anon,authenticated;
revoke all on function public.anthos_jj4_submit_coaching(uuid,uuid,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.anthos_jj4_claim_scene(uuid,uuid) to service_role;
grant execute on function public.anthos_jj4_commit_scene(uuid,uuid,integer,text,text,text) to service_role;
grant execute on function public.anthos_jj4_submit_coaching(uuid,uuid,integer,text,uuid) to service_role;
