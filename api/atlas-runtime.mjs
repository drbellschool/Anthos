// Server-only Insight Atlas bridge for 4.3 rooms. A room must first be
// explicitly linked to a verified couple. Never guess a couple from an invite,
// name, phone, or email; never use unbound pilots as yearlong memory sources.
import {storySupabaseBase,storySupabaseHeaders} from "./jj4-database-config.mjs";
import {incidentalIntimacyReview,memoryContext} from "./insight-atlas-model.mjs";
import {openTurns43} from "./jj42-conversations.mjs";
import {SKILL_IDS43} from "./jj43-developmental.mjs";

const table=(x)=>["anthos_atlas_episodes","anthos_atlas_skill_states","anthos_atlas_memories","anthos_atlas_evidence","anthos_jj4_messages"].includes(x);
const key=()=>process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
async function atlasDb(resource,params={},payload,method="GET",fetchImpl=fetch){
 if(!key())throw Error("Atlas storage is not configured.");
 if(!table(resource)&&resource!=="rpc/anthos_atlas_record_observation")throw Error("Invalid Atlas resource.");
 if(method!=="GET"){
  if(process.env.ANTHOS_ATLAS_WRITES_ENABLED!=="1")throw Error("Atlas write mode is locked pending release certification.");
  if(process.env.VERCEL_ENV==="preview"&&process.env.ANTHOS_QA_STRICT_ISOLATION!=="1")
   throw Error("Atlas preview writes require a separate Quality Lab database.");
 }
 const url=new URL(storySupabaseBase()+resource);
 for(const [name,value] of Object.entries(params))url.searchParams.set(name,String(value));
 const h=storySupabaseHeaders(key());
 if(params.on_conflict&&method==="POST")h.Prefer="return=representation,resolution=ignore-duplicates";
 const res=await fetchImpl(url.toString(),{method,headers:h,
  ...(payload===undefined?{}:{body:JSON.stringify(payload)}),signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw Error("Atlas evidence storage failed ("+res.status+").");
 return res.json();
}
export function slimAtlasContext(atlas,role,focus=SKILL_IDS43){
 if(!atlas)return null;
 const character=role==="jack"?"jack":"jill",coach=role==="jack"?"husband":"wife";
 // Never put the other spouse's private advice or coaching trace in the prompt.
 const getScore=(subject,id)=>atlas.scores?.[subject]?.[id]??3;
 const chosen=Object.fromEntries(focus.map(id=>[id,getScore(character,id)]));
 const coachScores=Object.fromEntries(focus.map(id=>[id,getScore(coach,id)]));
 return {character,characterSkills:chosen,coachSkills:coachScores,
  rememberedEvents:memoryContext(atlas.memories||[],focus).map(m=>({
   key:m.memoryKey,summary:m.summary,originatingEvidenceId:m.originatingEvidenceId,
   referenceOnly:true
  }))};
}
export async function atlasForRoom(roomId,{fetchImpl=fetch}={}){
 const rows=await atlasDb("anthos_atlas_episodes",{
  select:"id,couple_id,source_room_id,status,story_key",
  source_room_id:"eq."+roomId,limit:1},undefined,"GET",fetchImpl);
 if(!rows?.length)return null;
 const ep=rows[0];
 const [states,memories]=await Promise.all([
  atlasDb("anthos_atlas_skill_states",{select:"subject,skill_id,score",
    couple_id:"eq."+ep.couple_id,limit:200},undefined,"GET",fetchImpl),
  atlasDb("anthos_atlas_memories",{select:"memory_key,memory_summary,skill_ids,salience,originating_evidence_id",
    couple_id:"eq."+ep.couple_id,order:"salience.desc,created_at.desc",limit:40},undefined,"GET",fetchImpl)
 ]);
 const scores={husband:{},wife:{},jack:{},jill:{}};
 for(const s of states||[])if(scores[s.subject])scores[s.subject][s.skill_id]=Number(s.score);
 return {episodeId:ep.id,coupleId:ep.couple_id,storyKey:ep.story_key,scores,
  memories:(memories||[]).map(m=>({memoryKey:m.memory_key,summary:m.memory_summary,
   skillIds:m.skill_ids,salience:m.salience,originatingEvidenceId:m.originating_evidence_id}))};
}
const subjectOf=role=>role==="jack"?"husband":"wife";
const replySubject=role=>role==="jack"?"jack":"jill";
export function atlasTurnObservations(turn){
 const role=turn?.role;
 if(!["jack","jill"].includes(role)||!turn.key)return [];
 const coach=subjectOf(role),character=replySubject(role),result=[];
 const add=(subject,skillId,sourceQuote,observedRating,confidence,contextClass,explanation,interpretation="observed",safetyFlag=null)=>{
  if(!sourceQuote?.trim()||!skillId)return;
  result.push({subject,skillId,sourceKind:"open_turn",sourceRef:turn.key,
   quote:sourceQuote,explanation,observedRating,confidence,contextClass,
   interpretation,safetyFlag});
 };
 for(const id of SKILL_IDS43){
  const rate=turn.assessment?.coaching?.[id];
  if(!turn.duplicateCoaching&&Number.isInteger(rate))add(coach,id,turn.body,rate,0.8,"selected",
   "Coach recommendation coded against the episode's skill rubric.");
  const enacted=turn.assessment?.behavior?.[id];
  if(Number.isInteger(enacted)&&turn.event)add(character,id,turn.event,enacted,0.9,"selected",
   "Character behavior observed in a committed canonical action.");
 }
 const coded=Array.isArray(turn.incidentalObservations)?turn.incidentalObservations:null;
 if(coded!==null){
  for(const x of coded){
   if(!["coaching","character"].includes(x.lane)||(x.lane==="coaching"&&turn.duplicateCoaching))continue;
   const source=x.lane==="coaching"?turn.body:turn.event;
   if(!source||!source.includes(x.quote)||!Number.isInteger(x.rating)||
      x.rating<1||x.rating>5||x.confidence<0.6)continue;
   add(x.lane==="coaching"?coach:character,x.skillId,x.quote,x.rating,x.confidence,
    "incidental",x.explanation,x.interpretation,x.safetyFlag);
  }
 }else if(!turn.duplicateCoaching){
  const fallback=incidentalIntimacyReview(turn.body);
  for(const x of fallback.observations||[])add(coach,x.skillId,turn.body,
   x.rating,x.confidence,"incidental","Unexpected intimacy-related coaching recommendation.",
   fallback.interpretation==="rejects-transaction"?"refused":
   fallback.interpretation==="joke-with-instruction"?"joke":"observed",fallback.safetyFlag);
 }
 return result;
}
async function applyOne(atlas,o,fetchImpl){
 return atlasDb("rpc/anthos_atlas_record_observation",{},{
  p_episode_id:atlas.episodeId,p_subject:o.subject,p_skill_id:o.skillId,
  p_source_kind:o.sourceKind,p_source_ref:o.sourceRef,
  p_quote:o.quote,p_explanation:o.explanation,p_rating:o.observedRating,
  p_confidence:o.confidence,p_context_class:o.contextClass,p_interpretation:o.interpretation,
  p_safety_flag:o.safetyFlag}, "POST",fetchImpl);
}
// Always reconcile all committed turns, not only the most recent. If the room
// update succeeded but an evidence API call failed, next access catches up.
// The DB function uses a transaction and uniqueness constraint per skill/source.
export async function reconcileAtlasOpenTurns(room,{fetchImpl=fetch}={}){
 const atlas=await atlasForRoom(room.id,{fetchImpl});
 if(!atlas)return null;
 const turns=openTurns43(room.episode);
 const already=await atlasDb("anthos_atlas_evidence",{
  select:"subject,skill_id,source_kind,source_ref",
  episode_id:"eq."+atlas.episodeId,limit:2000},undefined,"GET",fetchImpl);
 const seen=new Set((already||[]).map(x=>[x.subject,x.skill_id,x.source_kind,x.source_ref].join("|")));
 const outcomes=[];
 for(const turn of turns){
  const observations=atlasTurnObservations(turn);
  for(const observation of observations){
   const key=[observation.subject,observation.skillId,observation.sourceKind,observation.sourceRef].join("|");
   if(seen.has(key))continue;
   outcomes.push(await applyOne(atlas,observation,fetchImpl));
   seen.add(key);
  }
  // The shared fictional event, not private advice, is the future-memory fact.
  // Stored once, even if a text retry or room reconciliation repeats.
  const event=String(turn.event||"").trim();
  if(event&&turn.key){
   const skills=[...new Set(observations.map(x=>x.skillId))];
   const sensitive=skills.some(x=>x==="i-nontransactional"||x==="i-sexual-respect"||x==="i-consent-boundaries");
   await atlasDb("anthos_atlas_memories",{on_conflict:"couple_id,memory_key"},{
    couple_id:atlas.coupleId,originating_episode_id:atlas.episodeId,
    memory_key:"turn:"+turn.key,memory_summary:event.slice(0,1400),
    characters:[turn.role],skill_ids:skills,
    tags:["canonical-event",sensitive?"incidental-intimacy":"general"],
    tension:/rejected|furious|defensive|dismissed|angry|hurt/i.test(event)?"unresolved":"evolving",
    salience:sensitive?5:3
   },"POST",fetchImpl);
  }
 }
 return {atlas:await atlasForRoom(room.id,{fetchImpl}),observations:outcomes.length,
  applied:outcomes.filter(x=>x?.applied).length};
}
