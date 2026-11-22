-- Semantic event identity is a score ledger invariant, not an AI prompt.
-- A new message/request key cannot cause an already-observed action to score again.
-- Existing legacy records are not edited.
alter table public.anthos_atlas_evidence
 add column if not exists canonical_action_code text;
create unique index if not exists atlas_once_per_character_action
 on public.anthos_atlas_evidence
 (episode_id,subject,skill_id,canonical_action_code)
 where evidence_lane='character' and observed_rating is not null
 and canonical_action_code is not null;
create unique index if not exists atlas_once_per_normalized_quote
 on public.anthos_atlas_evidence
 (episode_id,subject,skill_id,md5(regexp_replace(lower(btrim(source_quote)),'[^a-z0-9]+','','g')))
 where observed_rating is not null;

create or replace function public.anthos_atlas_record_observation(
 p_episode_id uuid,
 p_subject text,
 p_skill_id text,
 p_source_kind text,
 p_source_ref text,
 p_quote text,
 p_explanation text,
 p_rating smallint,
 p_confidence numeric,
 p_context_class text default 'relevant',
 p_interpretation text default 'observed',
 p_safety_flag text default null
) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp
as $$
declare
 ep public.anthos_atlas_episodes%rowtype;
 message_text text;
 message_role text;
 source_role text;
 turn_json jsonb;
 existing_id bigint;
 inserted_id bigint;
 semantic_action text;
 source_norm text;
 prior numeric(4,2);
 result_score numeric(4,2);
 movement numeric;
 lane text;
begin
 select * into ep from public.anthos_atlas_episodes
 where id=p_episode_id for share;
 if not found or ep.source_room_id is null
 then raise exception 'Atlas episode has no verified source room';end if;
 if p_subject not in ('husband','wife','jack','jill') or
    p_skill_id is null or length(p_skill_id)<3 or
    p_source_ref is null or length(p_source_ref)>160 or
    p_quote is null or length(btrim(p_quote))<4 or
    length(p_quote)>1800
 then raise exception 'Invalid Atlas evidence parameters';end if;
 if p_rating is not null and (p_rating<1 or p_rating>5 or
    p_confidence is null or p_confidence<0 or p_confidence>1)
 then raise exception 'Invalid scoring evidence';end if;
 if p_context_class not in ('selected','incidental','relevant','safety') or
    p_interpretation not in ('observed','ambiguous','quoted','joke','negated','refused')
 then raise exception 'Invalid evidence classification';end if;

 lane:=case when p_subject in ('husband','wife') then 'coaching' else 'character' end;
 source_role:=case when p_subject in ('husband','jack') then 'jack' else 'jill' end;

 if p_source_kind='coach_message' and lane='coaching' then
  if p_source_ref !~ '^[0-9]{1,18}$' then raise exception 'Invalid coach source ID';end if;
  select m.body into message_text
   from public.anthos_jj4_messages m
   where m.id=p_source_ref::bigint and m.room_id=ep.source_room_id
    and m.role=source_role and m.kind='coach';
 elsif p_source_kind='room_event' and lane='character' then
  if p_source_ref !~ '^[0-9]{1,18}$' then raise exception 'Invalid event source ID';end if;
  select m.body::jsonb->>'event' into message_text
   from public.anthos_jj4_messages m
   where m.id=p_source_ref::bigint and m.room_id=ep.source_room_id
    and m.role='shared' and m.kind='scene'
    and m.body::jsonb->'assessment'->>'role'=p_subject;
 elsif p_source_kind='open_turn' then
  select r.episode #> '{authored43,turns}' into turn_json
   from public.anthos_jj4_rooms r where r.id=ep.source_room_id;
  select v into turn_json from jsonb_array_elements(
     case when jsonb_typeof(turn_json)='array' then turn_json else '[]'::jsonb end
    ) v where v->>'key'=p_source_ref and v->>'role'=source_role limit 1;
  message_text:=case when lane='coaching' then turn_json->>'body'
    else turn_json->>'event' end;
  if lane='character' then
   semantic_action:=nullif(btrim(turn_json->>'eventCode'),'');
   if semantic_action is null or
      semantic_action not like p_subject||':%' then
    raise exception 'Canonical character action identity is missing or mismatched';
   end if;
  end if;
 else
  raise exception 'Evidence source kind/subject combination is not supported';
 end if;
 if message_text is null or position(btrim(p_quote) in message_text)=0
 then raise exception 'Evidence quote is not present in the verified source';end if;
 source_norm:=md5(regexp_replace(lower(btrim(p_quote)),'[^a-z0-9]+','','g'));
 if lane='character' and p_source_kind='room_event' then
  semantic_action:='room_event:'||source_norm;
 end if;

 -- A subject/skill row lock serializes concurrent scene and SMS updates.
 insert into public.anthos_atlas_skill_states(couple_id,subject,skill_id)
 values(ep.couple_id,p_subject,p_skill_id)
 on conflict do nothing;
 select score into prior from public.anthos_atlas_skill_states
 where couple_id=ep.couple_id and subject=p_subject and skill_id=p_skill_id
 for update;
 if prior is null then raise exception 'Atlas score state unavailable';end if;
 -- Two independent anti-gaming checks under the score-row lock:
 -- (1) same enacted semantic action, even if the event's phrasing changes;
 -- (2) same normalized quotation, even if a retry invents another message ID.
 -- Scoring is not a reward for repeating the same story beat or recommendation.
 select e.id into existing_id from public.anthos_atlas_evidence e
 where e.episode_id=p_episode_id and e.subject=p_subject
   and e.skill_id=p_skill_id and e.observed_rating is not null
   and ((lane='character' and semantic_action is not null
          and e.canonical_action_code=semantic_action)
        or md5(regexp_replace(lower(btrim(e.source_quote)),
                    '[^a-z0-9]+','','g'))=source_norm)
 limit 1;
 if existing_id is not null then
  return jsonb_build_object('applied',false,'reason','repeated-action-or-quotation',
    'evidenceId',existing_id,'score',prior);
 end if;

 insert into public.anthos_atlas_evidence(
  couple_id,episode_id,subject,evidence_lane,skill_id,
  source_kind,source_ref,source_quote,explanation,
  observed_rating,confidence,context_class,interpretation,safety_flag,
  canonical_action_code,model_version
 ) values (
  ep.couple_id,p_episode_id,p_subject,lane,p_skill_id,
  p_source_kind,p_source_ref,btrim(p_quote),coalesce(p_explanation,''),
  p_rating,p_confidence,p_context_class,p_interpretation,p_safety_flag,semantic_action,'atlas-v1'
 )
 on conflict(episode_id,subject,skill_id,source_kind,source_ref,model_version)
 do nothing returning id into inserted_id;
 if inserted_id is null then
  select id into existing_id from public.anthos_atlas_evidence
   where episode_id=p_episode_id and subject=p_subject and skill_id=p_skill_id
     and source_kind=p_source_kind and source_ref=p_source_ref and model_version='atlas-v1';
  return jsonb_build_object('applied',false,'reason','duplicate-source','evidenceId',existing_id);
 end if;

 if p_rating is null or p_confidence<0.6 then
  return jsonb_build_object('applied',false,'reason','unobserved-or-low-confidence',
      'evidenceId',inserted_id,'score',prior);
 end if;
 movement:=greatest(-0.35,least(0.35,0.25*(p_rating-prior)*p_confidence));
 result_score:=round(greatest(1,least(5,prior+movement))::numeric,2);
 insert into public.anthos_atlas_movements(
   evidence_id,couple_id,subject,skill_id,previous_score,new_score
 ) values(inserted_id,ep.couple_id,p_subject,p_skill_id,prior,result_score);
 update public.anthos_atlas_skill_states
 set score=result_score,evidence_count=evidence_count+1,revision=revision+1,
  last_observed_at=now(),updated_at=now()
 where couple_id=ep.couple_id and subject=p_subject and skill_id=p_skill_id;
 return jsonb_build_object('applied',true,'evidenceId',inserted_id,
  'previousScore',prior,'newScore',result_score,'subject',p_subject,'skillId',p_skill_id);
end $$;


comment on column public.anthos_atlas_evidence.canonical_action_code
 is 'Server-verified canonical event identity from 4.3 room JSON. One character action can move a given skill once even if quoted differently.';
