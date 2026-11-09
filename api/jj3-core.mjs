import {createHash,randomBytes,randomUUID} from "node:crypto";
import {getScenario} from "./jj2-library.mjs";
import {ENGINE_VERSION,initialEvolution,validEvolution,characterEvolutionContext,evolutionStoryPrompt,EVOLUTION_STORY_SCHEMA,validateEvolutionStory,evolveState} from "./jj-evolution.mjs";
import {VERSION,FOCUS,MILESTONES,CHARACTER,seededIntroduction,privatePrompt,storyPrompt,actionFromCoach,actionFromCharacterAgreement,actionFromCharacterWords,ownCharacterIntent,briefApproval,asksForAction,explicitGoAhead,checkCharacterReply,soundsTooPolished,plainCharacterLanguage,RESPONSE_SCHEMA,STORY_SCHEMA,validStory} from "./jj3-model.mjs";

const BASE="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const secret=()=>process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||"";
const sha=s=>createHash("sha256").update(s).digest("hex");
const safe=(x,n=1200)=>typeof x==="string"?x.trim().slice(0,n):"";
const problem=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const tokenOK=t=>typeof t==="string"&&/^[A-Za-z0-9_-]{43}$/.test(t);
const uuidOK=t=>typeof t==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
async function db(resource,query={},body,method="GET"){
 const k=secret();if(!k)problem("Pilot storage is not configured.",503);
 const url=new URL(BASE+resource);for(const [n,v] of Object.entries(query))url.searchParams.set(n,String(v));
 let res;try{res=await fetch(url,{method,headers:{"apikey":k,Authorization:"Bearer "+k,"Content-Type":"application/json","Prefer":"return=representation"},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(13000)});
 }catch{problem("The pilot database could not be reached. Please retry.",502)}
 if(!res.ok)problem(res.status===409?"The story changed. Reload and try again.":"The pilot database rejected the request.",res.status===409?409:502);
 return res.json().catch(()=>null);
}
const tables={rooms:"anthos_jj3_rooms",people:"anthos_jj3_participants",messages:"anthos_jj3_messages"};
async function participant(token){
 if(!tokenOK(token))problem("This invitation is missing or invalid. Old pilot invitations have been retired.",401);
 const p=(await db(tables.people,{token_hash:"eq."+sha(token),select:"*"}))?.[0];
 if(!p)problem("This is an old or invalid invitation. Ask for a new Jack & Jill 3.0 link.",401);
 const room=(await db(tables.rooms,{id:"eq."+p.room_id,select:"*"}))?.[0];
 if(!room||new Date(room.expires_at).getTime()<Date.now())problem("This invitation has expired.",410);
 if(room.status==="retired")problem("This pilot has been retired. Please use a new invitation.",410);
 return {person:p,room};
}
async function scenarioFor(room){
 if(room.scenario_id)return getScenario(room.scenario_id);
 return {title:room.title,opening_scene:room.scene?.scene||"",learning_objective:room.scene?.tension||"",
  petal_slug:room.petal_slug,research_lenses:["gottman","schnarch","aron"],mode:room.mode};
}
async function privateMessages(room,role){
 return await db(tables.messages,{room_id:"eq."+room.id,role:"eq."+role,order:"id.asc",limit:"180",select:"id,author,kind,body,step,created_at,request_key"})||[];
}
async function outcomes(room){
 return await db(tables.messages,{room_id:"eq."+room.id,role:"eq.shared",order:"id.asc",limit:"10",select:"id,author,kind,body,step,created_at"})||[];
}
export async function createRoom(origin,scenarioId,soloRole="jack"){
 if(!uuidOK(scenarioId))problem("Choose a scenario from the 12-Petal Manager.");
 const scenario=await getScenario(scenarioId);
 if(!["shared","individual"].includes(scenario.mode))problem("Scenario has an invalid format.");
 const role=soloRole==="jill"?"jill":"jack";
 const canon={scene:scenario.opening_scene,location:"Opening scene",
  facts:[],tension:scenario.learning_objective,research:scenario.research_lenses||[],title:scenario.title};
 const created=await db(tables.rooms,{},{
  title:scenario.title,scenario_id:scenario.id,petal_slug:scenario.petal_slug,
  mode:scenario.mode,scene:canon,engine_version:ENGINE_VERSION,
  evolution_state:initialEvolution(scenario)
 },"POST");
 const room=created?.[0];if(!room?.id)problem("Could not create a fresh room.",502);
 const keys=[randomBytes(32).toString("base64url"),randomBytes(32).toString("base64url")];
 const people=scenario.mode==="shared"?[
  {room_id:room.id,role:"jack",token_hash:sha(keys[0])},
  {room_id:room.id,role:"jill",token_hash:sha(keys[1])}
 ]:[{room_id:room.id,role,token_hash:sha(keys[0])}];
 try{await db(tables.people,{},people,"POST");}catch(e){
  await db(tables.rooms,{id:"eq."+room.id},undefined,"DELETE").catch(()=>{});
  throw e;
 }
 const base=origin+"/pilot/?invite=";
 return {ok:true,version:ENGINE_VERSION,roomId:room.id,title:room.title,experienceMode:scenario.mode,
  invitations:{a:base+keys[0],...(scenario.mode==="shared"?{b:base+keys[1]}:{})},
  participants:scenario.mode==="shared"?{a:"Jack's friend",b:"Jill's friend"}:{a:role==="jack"?"Jack's friend":"Jill's friend"},
  expiresAt:room.expires_at};
}
export async function status(token){
 const {person:p,room:r}=await participant(token);
 const consent=!!p.consented_at;
 const [privateLog,shared,others]=consent?await Promise.all([
  privateMessages(r,p.role),outcomes(r),
  db(tables.people,{room_id:"eq."+r.id,role:"neq."+p.role,select:"role,submitted_step"})
 ]):[[],[],[]];
 const mine=p.submitted_step===r.step&&r.status==="active";
 const partnerSubmitted=r.mode==="individual"||others?.[0]?.submitted_step===r.step;
 return {ok:true,version:r.engine_version||VERSION,title:r.title,role:p.role,character:CHARACTER[p.role].firstName,
  mode:r.mode,step:r.step,totalSteps:5,status:r.status,scene:r.scene,consent,name:p.name||"",
  messages:privateLog,shared,submitted:mine,otherSubmitted:!!partnerSubmitted,
  processing:!!r.processing_token,action:mine?"":p.pending_step===r.step?p.pending_action||"":"",
  reflectionComplete:!!p.reflection,hasIntro:privateLog.some(m=>m.kind==="intro"&&m.step===r.step),
  identity:CHARACTER[p.role].identity,
  learningHint:FOCUS[r.step-1]||[],info:"Browser-only private pilot. No SMS is sent."};
}
export async function join(token,name){
 const {person:p,room:r}=await participant(token);
 if(r.status!=="active")problem("This pilot is no longer active.",409);
 const n=safe(name,32);
 if(!/^[\p{L}\p{M} .'-]{1,32}$/u.test(n))problem("Enter your first name to join.");
 if(!p.consented_at)await db(tables.people,{id:"eq."+p.id,consented_at:"is.null"},{name:n,consented_at:new Date().toISOString()},"PATCH");
 return status(token);
}
async function model(instructions,input,schema,name="anthos_jj3"){
 const key=process.env.OPENAI_API_KEY?.trim();
 if(!key)problem("Character AI isn't configured.",503);
 let last="unavailable";
 for(let attempt=0;attempt<2;attempt++){
  try{
   const res=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({model:process.env.OPENAI_MODEL?.trim()||"gpt-4.1-mini",
     store:false,instructions,input:JSON.stringify(input),
     max_output_tokens:attempt?2300:1500,
     text:{format:{type:"json_schema",name,strict:true,schema}}}),
    signal:AbortSignal.timeout(attempt?30000:25000)
   });
   if(!res.ok){last="provider";if(res.status===400||res.status===401||res.status===403||res.status===429)break;continue}
   const json=await res.json();
   if(json.status==="incomplete"){last="incomplete";continue}
   const output=(json.output||[]).filter(x=>x.type==="message").flatMap(x=>(x.content||[])
    .filter(y=>y.type==="output_text").map(y=>y.text)).join("\n").trim();
   if(!output){last="empty";continue}
   const parsed=JSON.parse(output);
   if(parsed&&typeof parsed==="object")return parsed;
  }catch{last="incomplete"}
 }
 problem(last==="provider"?"The character service is unavailable. Your message is still here to retry.":"The character couldn't finish that thought. Your message is still here—please try again.",502);
}
export async function begin(token){
 const {person:p,room:r}=await participant(token);
 if(!p.consented_at)problem("Accept the pilot invitation before beginning.",403);
 if(r.status!=="active"||p.submitted_step===r.step)return status(token);
 const recent=await privateMessages(r,p.role);
 if(recent.some(m=>m.kind==="intro"&&m.step===r.step))return status(token);
 const scenario=await scenarioFor(r);
 let intro="";
 if(r.step===1&&/mountain/i.test(scenario.title))intro=seededIntroduction(p.role,scenario,p.name);
 else {
  const g=privatePrompt({role:p.role,name:p.name,scenario,scene:r.scene,step:r.step,history:recent,
   memory:p.private_memory,latest:"The shared fictional scene just advanced because of actual choices. Respond to what changed, your NEW wants and any gains or costs, not the original disagreement.",pending:null,
   evolution:r.engine_version===ENGINE_VERSION?characterEvolutionContext(r.evolution_state,p.role):null});
  try{
   const result=await model(g.instructions+" This is a NEW CHARACTER INTRO; the coach has not spoken. Return empty action, evidence, characterProposal, proposalEvidence, and sophiaAside.",g.input,RESPONSE_SCHEMA,"jj3_intro");
   if(checkCharacterReply(result,recent))intro=safe(plainCharacterLanguage(result.characterReply),1600);
  }catch{/* Safe, explicit fallback below; no invented canonical event. */}
  if(!intro){
   if(r.step===1)intro=seededIntroduction(p.role,scenario,p.name);
   else {
   const name=CHARACTER[p.role].firstName;
   intro=name==="Jack"
    ?"Okay, buddy, new development. "+safe(r.scene?.scene,280)+" I have opinions, a questionable plan, and a growing suspicion that I'm about to embarrass myself. I want to handle this without flattening what Jill cares about. What would you tell me?"
    :"Oh, this has become a situation. "+safe(r.scene?.scene,280)+" I have a pretty good idea what I want, but I'm afraid it will sound selfish if I say it out loud. Can I tell you my plan before I make things worse?";
  }
  }
 }
 try{
  await db(tables.messages,{},{
   room_id:r.id,role:p.role,author:"character",kind:"intro",step:r.step,body:intro
  },"POST");
 }catch(e){
  const current=await privateMessages(r,p.role);
  if(!current.some(m=>m.kind==="intro"&&m.step===r.step))throw e;
 }
 return status(token);
}
export async function talk(token,text,requestKey){
 const {person:p,room:r}=await participant(token);
 if(!p.consented_at)problem("Join the pilot before responding.",403);
 if(r.status!=="active"||r.processing_token||p.submitted_step===r.step)problem("This story moment is already submitted or moving forward. Refresh to continue.",409);
 const clean=safe(text,900);
 if(clean.length<2)problem("Tell your character what you're thinking.");
 if(!uuidOK(requestKey))problem("This message needs a valid request identifier.");
 const history=await privateMessages(r,p.role);
 if(history.some(x=>x.request_key===requestKey))return status(token);
 const scenario=await scenarioFor(r);
 const oldAction=p.pending_step===r.step?p.pending_action||"":"";
 const guide=privatePrompt({role:p.role,name:p.name,scenario,scene:r.scene,step:r.step,history,
   memory:p.private_memory,latest:clean,pending:oldAction,
   evolution:r.engine_version===ENGINE_VERSION?characterEvolutionContext(r.evolution_state,p.role):null});
 let response=await model(guide.instructions,guide.input,RESPONSE_SCHEMA,"jj3_character_reply");
 if(!checkCharacterReply(response,history)||soundsTooPolished(response.characterReply)){
  // Soft retry: a formulaic "you've convinced me" is just as immersion-breaking
  // as a repeated reply. An imperfect retry should never create an infinite stall.
  try{
   const revised=await model(guide.instructions+
    " Your previous reply was either repetitive or sounded too agreeable and polished. Be a person, not a worksheet: respond with one honest thought, a concrete detail, and some genuine uncertainty or pushback. Avoid tidy lessons and filler.",
    guide.input,RESPONSE_SCHEMA,"jj3_character_reply");
   if(checkCharacterReply(revised,history))response=revised;
  }catch{/* Preserve the usable first reply rather than losing the entire exchange. */}
 }
 if(!checkCharacterReply(response,history))problem("The character's response repeated itself. Your message is still here—please retry.",502);
 response.characterReply=plainCharacterLanguage(response.characterReply);
 response.sophiaAside=plainCharacterLanguage(response.sophiaAside);
 // The coach may authorize a fictional action in normal speech. The story
 // resolves without another button once both coaches independently do so.
 const previousReply=[...history].reverse().find(m=>m.step===r.step&&m.author==="character");
 const previousIntent=ownCharacterIntent(p.role,previousReply?.body);
 const currentIntent=ownCharacterIntent(p.role,response.characterReply);
 // Real people can decide to act: an affirmative "sounds good" accepts the
 // plan the character just proposed, even if the new reply paraphrases it.
 const acceptedPrevious=briefApproval(clean)&&previousIntent;
 const next=acceptedPrevious
   ||actionFromCoach(p.role,clean,response.action,response.evidence)
   ||actionFromCharacterAgreement(p.role,clean,response.characterReply,
     response.characterProposal,response.proposalEvidence)
   ||actionFromCharacterWords(p.role,clean,response.characterReply)
   ||oldAction;
 const shouldAct=!!next&&(
   (!!previousIntent&&briefApproval(clean))
   ||(!!currentIntent&&(explicitGoAhead(clean)||asksForAction(clean)))
 );
 const milestones=Array.isArray(response.learningMilestones)?response.learningMilestones.filter(x=>MILESTONES.includes(x)).slice(0,3):[];
 const learning=p.learning_log&&typeof p.learning_log==="object"&&!Array.isArray(p.learning_log)?{...p.learning_log}:{};
 for(const m of milestones)learning[m]={status:"explored",step:r.step};
 const memory={note:safe(response.privateMemory,380)||p.private_memory?.note||""};
 let aside=safe(response.sophiaAside,490);
 const recentAsides=history.filter(m=>m.author==="sophia"&&m.step===r.step).length;
 // A generic "compromise is good" lecture is not a useful interruption.
 // Let the character respond first; only offer an occasional practical aside
 // after the opening exchange of a checkpoint, when there is something real to notice.
 if(recentAsides>0||history.filter(m=>m.author==="coach"&&m.step===r.step).length===0
    ||/\b(?:research|empathizing|mutual respect|connection|reducing tension|preferences|styles)\b/i.test(aside))
   aside="";
 const inserted=await db("rpc/anthos_jj3_write_turn",{},{
  p_room:r.id,p_participant:p.id,p_step:r.step,p_key:requestKey,
  p_user:clean,p_character:safe(response.characterReply,2000),
  p_aside:aside,p_action:next,p_memory:memory,p_learning:learning
 },"POST");
 if(inserted!==true)problem("The scene advanced while you were writing. Refresh and try again.",409);
 // A clear go-ahead is the confirmation. Vague brainstorming remains private chat.
 // The two-step SQL commit is idempotent, and resolveRoom atomically waits for
 // both participants (or one in an individual Deep Dive).
 if(shouldAct){
  const committed=await db("rpc/anthos_jj3_submit",{},{
   p_room:r.id,p_participant:p.id,p_step:r.step
  },"POST");
  if(committed===true){
   try{await resolveRoom(r)}
   catch(e){
    // The coach's actual words and committed character move are already durable.
    // Return the current state; automatic progress polling retries publication.
    // Do not ask the coach to resubmit their message or click a hidden button.
   }
  }
 }
 return status(token);
}
async function resolveRoom(room){
 const current=(await db(tables.rooms,{id:"eq."+room.id,select:"*"}))?.[0];
 if(!current||current.status!=="active")return;
 const members=await db(tables.people,{room_id:"eq."+room.id,select:"role,submitted_step,submitted_action"});
 const expected=current.mode==="individual"?1:2;
 if(members?.length!==expected||members.some(p=>p.submitted_step!==current.step||!p.submitted_action))return;
 const claimToken=randomUUID();
 const claimed=await db("rpc/anthos_jj3_claim",{},{
  p_room:room.id,p_step:current.step,p_token:claimToken
 },"POST");
 if(claimed!==true)return;
 try{
  const scenario=await scenarioFor(current);
  const actions=members.map(p=>({character:p.role==="jack"?"Jack":"Jill",action:p.submitted_action}));
  const evolving=current.engine_version===ENGINE_VERSION;
  if(evolving&&!validEvolution(current.evolution_state))
   problem("The story state needs repair before it can advance. No choices were lost.",502);
  const prompt=evolving
   ?evolutionStoryPrompt({mode:current.mode,scenario,scene:current.scene,step:current.step,
     actions,evolution:current.evolution_state})
   :storyPrompt({mode:current.mode,scenario,scene:current.scene,step:current.step,actions});
  let story=null,validationProblems=[];
  for(let attempt=0;attempt<2;attempt++){
   try{
    const retry=attempt
     ?" Your prior outcome was not usable: "+validationProblems.slice(0,5).join(", ")+
      ". Show the consequences and make the new dilemma different from the opening conflict."
     :"";
    const candidate=await model(prompt.instructions+retry,prompt.input,
     evolving?EVOLUTION_STORY_SCHEMA:STORY_SCHEMA,evolving?"jj_evolution_outcome":"jj3_story_outcome");
    const verdict=evolving
     ?validateEvolutionStory(candidate,current.evolution_state,current.step,actions)
     :{ok:validStory(candidate,current.step),errors:["invalid_story"]};
    if(verdict.ok){story=candidate;break}
    validationProblems=verdict.errors;
   }catch(e){if(attempt===1)throw e}
  }
  if(!story)problem("The next event needs a fresh attempt; your choices remain saved.",502);
  const next={scene:safe(plainCharacterLanguage(story.nextScene),1800),location:safe(story.location,140),
   tension:safe(story.tension,500),facts:story.facts.slice(0,8).map(x=>safe(x,200)),
   research:safe(story.researchNote,450),title:scenario.title};
  const evolved=evolving?evolveState(current.evolution_state,story,current.step,actions):null;
  const published=await db(evolving?"rpc/anthos_jj3_publish_evolution":"rpc/anthos_jj3_publish",{},{
   p_room:room.id,p_step:current.step,p_token:claimToken,
   p_outcome:safe(plainCharacterLanguage(story.outcome),2500),p_scene:next,
   ...(evolving?{p_evolution:evolved,p_effects:{jack:story.impacts.jack,jill:story.impacts.jill,
     relationshipConnection:story.relationshipConnection,relationshipTrust:story.relationshipTrust}}:{})
  },"POST");
  if(published!==true)problem("Another story update completed first. Refresh the page.",409);
 }catch(e){
  await db("rpc/anthos_jj3_release",{},{
   p_room:room.id,p_step:current.step,p_token:claimToken
  },"POST").catch(()=>{});
  throw e;
 }
}
/** A manually confirmed move is available even if AI misses a natural-language suggestion.
 * It never publishes or submits automatically; it only becomes a pending proposal.
 */
export async function choose(token,raw){
 const {person:p,room:r}=await participant(token);
 if(!p.consented_at)problem("Join before choosing a move.",403);
 if(r.status!=="active"||r.processing_token||p.submitted_step===r.step)
  problem("This story moment has already moved on. Refresh to continue.",409);
 const clean=safe(raw,820);
 if(clean.length<10)problem("Describe one specific thing your character could do or say.");
 const name=p.role==="jack"?"Jack":"Jill",other=p.role==="jack"?"Jill":"Jack";
 if(new RegExp("^"+other+"\\s+(?:should|needs?|has to|must|will|can|could)\\b","i").test(clean))
  problem("You can only choose what "+name+" will do. "+other+"'s coach controls their choices.");
 let move=clean;
 if(!new RegExp("^"+name+"\\b","i").test(clean)){
  const own=new RegExp("^(?:I (?:think|want|would like) "+name+" to|let "+name+")\\s+","i");
  move=own.test(clean)?name+" will "+clean.replace(own,""):name+" tries this: "+clean;
 }
 const saved=await db("rpc/anthos_jj3_set_choice",{},{
  p_room:r.id,p_participant:p.id,p_step:r.step,p_action:move
 },"POST");
 if(saved!==true)problem("The scene changed while you were choosing. Refresh and try again.",409);
 return status(token);
}
export async function submit(token){
 const {person:p,room:r}=await participant(token);
 if(!p.consented_at)problem("Join before submitting.",403);
 if(r.status!=="active")return status(token);
 if(p.submitted_step!==r.step){
  const committed=await db("rpc/anthos_jj3_submit",{},{p_room:r.id,p_participant:p.id,p_step:r.step},"POST");
  if(committed!==true)problem("Choose a fictional move before advancing.",409);
 }
 await resolveRoom(r);
 return status(token);
}
export async function progress(token){
 const {person:p,room:r}=await participant(token);
 if(!p.consented_at)problem("Join before checking the outcome.",403);
 if(r.status==="active"){
  try{await resolveRoom(r)}
  catch{/* Keep waiting; a later automatic check can retry without losing actions. */}
 }
 return status(token);
}
export async function reflect(token,reflection){
 const {person:p,room:r}=await participant(token);
 if(!p.consented_at)problem("Join before reflecting.",403);
 if(r.status!=="complete")problem("Finish the adventure before reflecting.",409);
 if(p.reflection)return status(token);
 const clean=safe(reflection,900);
 if(clean.length<12)problem("Write one practical thing you'd like to carry into real life.");
 const scenario=await scenarioFor(r);
 const guide=privatePrompt({role:p.role,name:p.name,scenario,scene:r.scene,step:5,
  history:(await privateMessages(r,p.role)).slice(-8),memory:p.private_memory,latest:clean,pending:null,
   evolution:r.engine_version===ENGINE_VERSION?characterEvolutionContext(r.evolution_state,p.role):null});
 let closing="";
 try{
  const response=await model(guide.instructions+" The adventure has FINISHED. No new move is possible; leave action, evidence, characterProposal and proposalEvidence empty. The coach is reflecting on a real-life relationship skill. Respond warmly as "+CHARACTER[p.role].firstName+" with a short personal farewell and one funny callback; no new fictional decision.",guide.input,RESPONSE_SCHEMA,"jj3_final_reflection");
  closing=safe(plainCharacterLanguage(response.characterReply),1100);
 }catch{closing=p.role==="jack"?"Thanks for having my back. I'm going to try actually listening before I pack three kinds of hiking boots next time.":"Thanks for being in my corner. I'm keeping my books, my opinions, and maybe a little room for the unexpected."}
 const saved=await db(tables.people,{id:"eq."+p.id,reflection:"is.null"},{reflection:clean},"PATCH");
 if(saved?.length){
  await db(tables.messages,{},[
   {room_id:r.id,role:p.role,author:"coach",kind:"reflection",step:6,body:clean},
   {room_id:r.id,role:p.role,author:"character",kind:"reflection",step:6,body:closing}
  ],"POST");
 }
 return status(token);
}
