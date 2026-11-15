-- Anthos 4.0 character simulation. Pinned to new pilot rooms only.
-- Reuses the atomic scene-commit RPC; existing room conversations stay on v4.
alter table public.anthos_jj4_rooms
 add column if not exists simulation_state jsonb;

create table if not exists public.anthos_jj4_simulation_events (
 room_id uuid not null references public.anthos_jj4_rooms(id) on delete cascade,
 phase smallint not null check(phase between 0 and 5),
 before_state jsonb not null,
 after_state jsonb not null,
 observed_event jsonb not null,
 created_at timestamptz not null default now(),
 primary key(room_id,phase)
);
alter table public.anthos_jj4_simulation_events enable row level security;
revoke all on public.anthos_jj4_simulation_events from public,anon,authenticated;
grant select,insert on public.anthos_jj4_simulation_events to service_role;

-- State, visible scene and prompts are committed in one transaction. If the
-- original scene RPC refuses the claim, neither the state nor event advances.
create or replace function public.anthos_jj4_commit_simulated_scene(
 p_room uuid,p_claim uuid,p_phase integer,p_story text,p_jack text,p_jill text,
 p_state jsonb,p_event jsonb
) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare before_snapshot jsonb; committed boolean;
begin
 select r.simulation_state into before_snapshot
 from public.anthos_jj4_rooms r where r.id=p_room for update;
 if before_snapshot is null
   or before_snapshot->>'version'<>'character-simulation-v1'
   or coalesce((before_snapshot->>'lastPhase')::integer,-999)<>p_phase-1
   or p_state is null or p_state->>'version'<>'character-simulation-v1'
   or coalesce((p_state->>'lastPhase')::integer,-999)<>p_phase
   or jsonb_typeof(p_state->'characters')<>'object'
   or jsonb_typeof(p_state->'objects')<>'array'
   or jsonb_typeof(p_event)<>'object'
   or length(coalesce(p_event->>'evidence',''))<12
   or exists(select 1 from public.anthos_jj4_simulation_events where room_id=p_room and phase=p_phase)
   then return false;end if;
 committed:=public.anthos_jj4_commit_scene(p_room,p_claim,p_phase,p_story,p_jack,p_jill);
 if not committed then return false;end if;
 update public.anthos_jj4_rooms set simulation_state=p_state where id=p_room;
 insert into public.anthos_jj4_simulation_events(room_id,phase,before_state,after_state,observed_event)
 values(p_room,p_phase,before_snapshot,p_state,p_event);
 return true;
end $$;
revoke all on function public.anthos_jj4_commit_simulated_scene(uuid,uuid,integer,text,text,text,jsonb,jsonb)
 from public,anon,authenticated;
grant execute on function public.anthos_jj4_commit_simulated_scene(uuid,uuid,integer,text,text,text,jsonb,jsonb)
 to service_role;
