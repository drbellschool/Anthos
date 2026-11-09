// Anthos 4.0 private browser pilot. Separate tables from the retired 3.x engine.
// All participant access is authenticated by a unique secret URL token; private coach
// messages are returned only to that role. Nothing sends an SMS.
import {createHash,randomBytes,randomUUID} from "node:crypto";
import {getScenario} from "./jj2-library.mjs";
import {normalizeStudio,PHASES} from "./episode-studio.mjs";
import {RESEARCH_SOURCES,draftSophiaClosure} from "./jj4-closure.mjs";

const BASE="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const R="anthos_jj4_rooms",P="anthos_jj4_participants",M="anthos_jj4_messages";
const ROLE=["jack","jill"];
const PHASES4=PHASES.map(x=>x.id);
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const sha=x=>createHash("sha256").update(x).digest("hex");
const brief=(s,max=1100)=>typeof s==="string"?s.trim().slice(0,max):"";
const error=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
async function db(resource,query={},body,method="GET"){
 const key=process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!key)error("Pilot database credentials are unavailable.",503);
 const url=new URL(BASE+resource);
 for(const [k,v] of Object.entries(query))url.searchParams.set(k,String(v));
 let res;try{res=await fetch(url,{method,headers:{
  apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",
  Prefer:"return=representation"},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
  signal:AbortSignal.timeout(15000)
 });}catch{error("Pilot database could not be reached.",502)}
 if(!res.ok)error(res.status===409?"The episode was updated. Refresh and retry.":"Pilot database rejected the operation.",res.status===409?409:502);
 return res.json().catch(()=>null);
}
async function participant(token){
 if(!TOKEN.test(token||""))error("This 4.0 invitation is missing or invalid.",401);
 const person=(await db(P,{token_hash:"eq."+sha(token),select:"*"}))?.[0];
 if(!person)error("This invitation does not exist or has been retired.",401);
 const room=(await db(R,{id:"eq."+person.room_id,select:"*"}))?.[0];
 if(!room||new Date(room.expires_at).getTime()<Date.now())error("This invitation expired.",410);
 if(room.stage==="retired")error("This episode pilot has been retired.",410);
 return {person,room};
}
function checkpoint(room){
 return room.phase_index<5?
 room.episode?.checkpoints?.find(c=>c.afterPhase===PHASES4[room.phase_index]):null;
}
function targetRoles(room){
 const audience=checkpoint(room)?.audience;
 return audience==="both"?ROLE:audience==="jack"?["jack"]:audience==="jill"?["jill"]:[];
}
export async function createRoom(origin,scenarioId,previousRoomId=null){
 if(!UUID.test(scenarioId||""))error("Choose a saved 4.0 episode first.");
 const scenario=await getScenario(scenarioId);
 if(scenario.mode!=="shared")error("The 4.0 dual-coach pilot currently supports shared episodes only.");
 if(!scenario.episode_studio)error("Save this 4.0 episode before launching a pilot.",409);
 const draft=normalizeStudio(scenario.episode_studio,scenario);
 if(previousRoomId!==null){
  if(!UUID.test(previousRoomId))error("Invalid previous test room identifier.");
  const previous=(await db(R,{id:"eq."+previousRoomId,select:"id,scenario_id,stage"}))?.[0];
  if(!previous||previous.scenario_id!==scenario.id)
   error("Previous test does not belong to this saved episode.",409);
 }
 if(!draft.primarySkill||!PHASES4.every(p=>draft.phases[p]?.trim().length>=30))
  error("Finish the primary objective and all six phase summaries before piloting.",409);
 const created=(await db(R,{},{
  title:draft.title,scenario_id:scenario.id,episode:draft,stage:"needs_scene",phase_index:0
 },"POST"))?.[0];
 if(!created?.id)error("Could not create the pilot room.",502);
 const invitations={};
 try{
  for(const role of ROLE){
   const secret=randomBytes(32).toString("base64url");
   await db(P,{},{room_id:created.id,role,token_hash:sha(secret)},"POST");
   invitations[role]=origin+"/pilot-v4/?invite="+secret;
  }
 }catch(err){
  await db(R,{id:"eq."+created.id},undefined,"DELETE").catch(()=>{});
  throw err;
 }
 let previousRetired=null;
 if(previousRoomId){
  try{
   const affected=await db(R,{id:"eq."+previousRoomId,scenario_id:"eq."+scenario.id},
    {stage:"retired",processing_token:null,processing_at:null,updated_at:new Date().toISOString()},"PATCH");
   previousRetired=Array.isArray(affected)&&affected.length===1;
  }catch{previousRetired=false}
 }
 return {ok:true,engine:"4.0.0",title:draft.title,roomId:created.id,
  invitations,expiresAt:created.expires_at,previousRetired,
  note:"Private browser pilot. No actual text messages will be sent."};
}
async function messages(room,role){
 const [scenes,mine,people]=await Promise.all([
  db(M,{room_id:"eq."+room.id,role:"eq.shared",order:"id.asc",limit:"40",select:"id,kind,body,phase_index,created_at"}),
  db(M,{room_id:"eq."+room.id,role:"eq."+role,order:"id.asc",limit:"60",select:"id,kind,body,phase_index,created_at"}),
  db(P,{room_id:"eq."+room.id,select:"role,joined_at,submitted_phase"})
 ]);
 return {scenes:scenes||[],mine:mine||[],people:people||[]};
}
export async function status(token){
 const {person,room}=await participant(token);
 const joined=!!person.joined_at;
 const {scenes,mine,people}=joined?await messages(room,person.role):{scenes:[],mine:[],people:[]};
 const targets=targetRoles(room),needsReply=room.stage==="awaiting"&&targets.includes(person.role)&&person.submitted_phase!==room.phase_index;
 const bothJoined=people.filter(x=>x.joined_at).length===2;
 const hasSophia=scenes.some(x=>x.kind==="sophia");
 return {ok:true,version:"4.0.0",title:room.title,role:person.role,
  character:person.role==="jack"?"Jack":"Jill",firstName:person.first_name||"",
  joined,bothJoined,phaseIndex:room.phase_index,phase:PHASES[room.phase_index]?.title||"Reflection",
  stage:room.stage,needsReply,submitted:person.submitted_phase===room.phase_index,
  waitingFor:room.stage==="awaiting"?targets.filter(role=>!people.find(x=>x.role===role&&x.submitted_phase===room.phase_index)):[],
  canContinue:bothJoined&&["needs_scene","flow"].includes(room.stage),
  scenes,messages:mine,finished:room.stage==="complete",
  hasSophia,closing:room.stage==="complete"&&!hasSophia&&!!room.processing_token,
  researchSources:hasSophia?RESEARCH_SOURCES:[],
  info:"Testing in browser only. Participants' private advice remains in their own private conversations."};
}
export async function join(token,name){
 const {person}=await participant(token);
 const first=brief(name,32);
 if(!/^[\p{L}\p{M} .'-]{1,32}$/u.test(first))error("Enter a first name to join.");
 if(!person.joined_at)await db(P,{id:"eq."+person.id,joined_at:"is.null"},
  {first_name:first,joined_at:new Date().toISOString()},"PATCH");
 return status(token);
}
const OUTPUT_SCHEMA={type:"object",additionalProperties:false,properties:{
 scene:{type:"string"},jackPrompt:{type:"string"},jillPrompt:{type:"string"}
},required:["scene","jackPrompt","jillPrompt"]};
async function directScene(room,phaseIndex){
 const key=process.env.OPENAI_API_KEY?.trim();
 if(!key)error("OpenAI is not configured for this pilot.",503);
 const [history,people]=await Promise.all([
  db(M,{room_id:"eq."+room.id,order:"id.desc",limit:"28",select:"id,kind,role,body,phase_index"}),
  db(P,{room_id:"eq."+room.id,select:"role,first_name,joined_at"})
 ]);
 const phase=PHASES4[phaseIndex];
 const storyDirection=room.episode.phases[phase];
 if(!storyDirection||storyDirection.trim().length<30)
  error("This phase has no saved Studio direction. Return to the Episode Studio before piloting.",409);
 const cp=checkpoint({...room,phase_index:phaseIndex});
 // Coach names belong to the private participants, never the fictional cast.
 const fictionalNames={jack:"Jack",jill:"Jill"};
 const scrub=value=>{
  let out=String(value||"");
  for(const person of people||[]){
   const name=person.first_name?.trim();
   if(!name||name.length<2||["jack","jill"].includes(name.toLowerCase()))continue;
   for(const candidate of new Set([name,name.toLowerCase(),name.toUpperCase()])){
    out=out.split(candidate).join(fictionalNames[person.role]||"the coach");
   }
  }
  return out;
 };
 const input={title:room.title,primaryObjective:room.episode.primarySkill,
  supportingSkills:room.episode.supportingSkills,researchNotes:room.episode.researchNotes,
  premise:room.episode.premise,phase,phaseNumber:phaseIndex+1,
  savedSixPhaseStoryboard:room.episode.phases,
  phaseStoryDirection:storyDirection,
  resolution:room.episode.closureCriteria,reflection:room.episode.reflectionPrompt,
  jackMotivation:room.episode.jackMotivation,jillMotivation:room.episode.jillMotivation,
  boundaries:room.episode.boundaries,voice:room.episode.tone,
  lockedEditorialFields:room.episode.locks||[],
  personalHumor:room.episode.humorNotes,runningGags:room.episode.runningGags,
  checkpoint:cp,fictionalCharacters:fictionalNames,
  history:(history||[]).reverse().map(m=>({role:m.role,kind:m.kind,
   phase:PHASES4[m.phase_index],body:scrub(m.body)}))};
 const instructions=[
  "You are the fictional shared-story director for Anthos Deep Dive 4.0, an educational marriage-growth adventure. NOT therapy.",
  "The administrator-authored Six-Phase Story Flow is a FIXED episode plan. Each of the six phases has its own saved summary in savedSixPhaseStoryboard. DO NOT invent another premise, competing subplot, different problem, surprise twist, timeline reset, new objective or alternative outcome.",
  "For this request, ONLY depict the particular saved phaseStoryDirection, building on the saved previous scenes and actual coaching. The exact phase summary is the next plot beat to enact, not a suggestion. Do not skip ahead to later phases, repeat earlier beats, or substitute an unrelated event.",
  "Use established details and the planned phase to render exactly ONE canonical story progression, roughly 110-180 words. Characters may improvise dialogue and small realistic actions ONLY within the authored plot beat; show consequences that lead naturally toward the next saved phase.",
  "Editor text marked lockedEditorialFields is canon and cannot be contradicted, overwritten, reframed, or replaced by model inventions. If coach advice clashes with established facts or the creator's boundaries, the character may consider that advice without rewriting the plan.",
  "A new story complication is allowed only when it follows directly from the saved plot beat, established situation, or actual coach advice. It must not create a new central conflict. Keep the plot within the six planned phases.",
  "Keep absolute continuity with all prior scene history and the stored episode premise. Do not restart the story, change locations without explanation, or invent messages the real coaches never sent.",
  "The fictional characters must ALWAYS be named Jack and Jill. The real husband and wife are separate PRIVATE coaches, never story characters. Do not use or guess the coaches' names in the fictional scenes.",
  "Coaches are the husband counseling Jack privately and the wife counseling Jill privately. Privately supplied advice can change fictional actions, but never quote, attribute, expose, paraphrase verbatim, or disclose one coach's message to the other.",
  "Honor the educational objectives without repeatedly explaining psychological theory. The characters are believable people, not puppets and not therapists. Make every phase distinct; advance toward a complete consequence-based ending by phase six.",
  "Use only humor ideas the editor actually supplied, when appropriate to the saved phase or checkpoint. Do not invent an unrelated comic premise. Do not force a joke or turn awkward intimacy into pressure, coercion or humiliation; maintain mutual respect and boundaries.",
  "At the end of this phase, follow exactly the checkpoint audience and purpose selected in the Studio. Do not ask for a reply if the checkpoint is disabled. Do not invent a third intervention or a different intended recipient.",
  "The authored six-phase storyboard and its locked passages outrank creativity. Each saved stage is mandatory in exact order: Hook, Conflict, Discovery, Reattempt, Outcome, Reflection.",
  "If the current phase is Reflection, conclude the fictional episode with earned closure and a concise practical, optional real-life reflection. No new conflict or request for coaching.",
  "Return JSON: scene, jackPrompt, jillPrompt. Each prompt must be a short, natural, personal text from that character asking their private friend about ONE consequential decision at this checkpoint.",
  "Checkpoint prompts must serve the exact saved checkpoint.purpose and should use checkpoint.humorCue only if it suits the moment. Do not invent a different lesson or decision. If checkpoint audience is none or current phase is Reflection, both prompts must be empty. If jack-only, Jill's prompt is empty, and vice versa. If both, create two distinctly personal private prompts, never a group message.",
  "If waitForReply is false, prompts may be scene observations and the story will continue without requiring an answer.",
  "Do not describe the coach's private messages in the canonical shared scene or the other private prompt.",
 ].join(" ");
 const model=process.env.ANTHOS_JJ4_MODEL?.trim()||process.env.OPENAI_MODEL?.trim()||"gpt-4.1-mini";
 let result;try{
  const response=await fetch("https://api.openai.com/v1/responses",{
   method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
   body:JSON.stringify({model,store:false,instructions,input:JSON.stringify(input),
    max_output_tokens:1600,text:{format:{type:"json_schema",name:"anthos_jj4_scene",strict:true,schema:OUTPUT_SCHEMA}}}),
   signal:AbortSignal.timeout(55000)
  });
  if(!response.ok)error("The character AI request failed.",502);
  const data=await response.json();
  const raw=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("");
  result=JSON.parse(raw);
 }catch(e){if(e.status)throw e;error("The character AI could not finish this scene. Please retry.",502)}
 if(brief(result.scene,2500).length<80)error("The AI didn't produce a complete scene; retry.",502);
 const audience=cp?.audience||"none";
 const fallback=(role)=>{const name=role==="jack"?"Jack":"Jill";return name+": "+brief(cp?.purpose||"I need your advice about the situation already unfolding.",420)+" What would you suggest?";};
 return {scene:brief(result.scene,2500),
  jackPrompt:["jack","both"].includes(audience)?brief(result.jackPrompt,1200)||fallback("jack"):"",
  jillPrompt:["jill","both"].includes(audience)?brief(result.jillPrompt,1200)||fallback("jill"):""};
}
export async function advance(token){
 const {person,room}=await participant(token);
 if(!person.joined_at)error("Join the episode first.",403);
 if(!["needs_scene","flow"].includes(room.stage))return status(token);
 const people=await db(P,{room_id:"eq."+room.id,select:"joined_at"});
 if(!people||people.length!==2||people.some(x=>!x.joined_at))return status(token);
 const claim=randomUUID();
 const phase=await db("rpc/anthos_jj4_claim_scene",{}, {p_room:room.id,p_claim:claim},"POST");
 if(typeof phase!=="number"||phase<0)return status(token);
 try{
  const latest=(await db(R,{id:"eq."+room.id,select:"*"}))?.[0];
  const rendered=await directScene(latest,phase);
  const saved=await db("rpc/anthos_jj4_commit_scene",{},
   {p_room:room.id,p_claim:claim,p_phase:phase,p_story:rendered.scene,
    p_jack:rendered.jackPrompt,p_jill:rendered.jillPrompt},"POST");
  if(saved!==true)error("This scene was already completed elsewhere.",409);
 }catch(e){
  await db(R,{id:"eq."+room.id,processing_token:"eq."+claim},
    {stage:"needs_scene",processing_token:null,processing_at:null},"PATCH").catch(()=>{});
  throw e;
 }
 return status(token);
}
/** Sophia's independent post-story epilogue.
 * Includes a research-grounded closing for older completed 4.0 pilots. */
export async function sophia(token){
 const {person,room}=await participant(token);
 if(!person.joined_at)error("Join the episode before Sophia's closing reflection.",403);
 if(room.stage!=="complete")return status(token);
 const claim=randomUUID();
 const acquired=await db("rpc/anthos_jj4_claim_closure",{},
  {p_room:room.id,p_claim:claim},"POST");
 if(acquired!==true)return status(token);
 try{
  const [scenes,people]=await Promise.all([
   db(M,{room_id:"eq."+room.id,role:"eq.shared",kind:"eq.scene",
    order:"phase_index.asc",limit:"6",select:"body,phase_index"}),
   db(P,{room_id:"eq."+room.id,select:"role,first_name"})
  ]);
  const sanitized=(scenes||[]).map(scene=>{
   let body=scene.body||"";
   for(const p of people||[]){
    const name=p.first_name?.trim();
    if(!name||name.length<2||["jack","jill"].includes(name.toLowerCase()))continue;
    for(const candidate of new Set([name,name.toLowerCase(),name.toUpperCase()])){
     body=body.split(candidate).join(p.role==="jack"?"Jack":"Jill");
    }
   }
   return {...scene,body};
  });
  const closure=await draftSophiaClosure(room.episode,sanitized);
  const committed=await db("rpc/anthos_jj4_commit_closure",{},
   {p_room:room.id,p_claim:claim,p_message:closure},"POST");
  if(committed!==true)error("Sophia's closing reflection could not be saved. Retry.",502);
 }catch(e){
  await db(R,{id:"eq."+room.id,processing_token:"eq."+claim,stage:"eq.complete"},
   {processing_token:null,processing_at:null},"PATCH").catch(()=>{});
  throw e;
 }
 return status(token);
}
export async function coach(token,body,requestKey){
 const {person,room}=await participant(token);
 if(!person.joined_at)error("Join before advising your character.",403);
 if(room.stage!=="awaiting")return status(token);
 const words=brief(body,900);
 if(words.length<2)error("Write a short suggestion to your character.");
 if(!UUID.test(requestKey||""))error("Invalid message request.");
 const saved=await db("rpc/anthos_jj4_submit_coaching",{},
  {p_room:room.id,p_participant:person.id,p_phase:room.phase_index,p_message:words,p_key:requestKey},"POST");
 if(saved!==true)return status(token);
 return status(token);
}
