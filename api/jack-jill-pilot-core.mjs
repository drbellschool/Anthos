import {createHash,randomBytes} from "node:crypto";
import {MODEL_VERSION, MILESTONES, getTheme, lessonFocus, resolveReadiness, coachingGuide, storyGuide, storyIsSafe, avoidRepetitiveResponse} from "./jj2-learning-model.mjs";
const BASE="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const secret=()=>process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||"";
const hash=s=>createHash("sha256").update(s).digest("hex");
const fail=(msg,status=400)=>{throw Object.assign(new Error(msg),{status})};
const validToken=t=>typeof t==="string"&&/^[A-Za-z0-9_-]{43}$/.test(t);
const safeText=(x,n=1200)=>typeof x==="string"?x.trim().slice(0,n):"";
const REMINDER="This is a private browser pilot. No SMS is sent.";
async function db(table,query={},body,method="GET",opts={}){
 const k=secret();if(!k)fail("Private pilot database is not configured.",503);
 const url=new URL(BASE+table);for(const [a,b] of Object.entries(query))url.searchParams.set(a,b);
 const r=await fetch(url,{method,headers:{"apikey":k,"Authorization":"Bearer "+k,"Content-Type":"application/json","Prefer":opts.minimal?"return=minimal":"return=representation"},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(13000)});
 if(!r.ok)fail("Pilot database request failed.",502);
 if(opts.minimal)return [];
 return r.json().catch(()=>[]);
}
const roomTable="anthos_jj2_rooms",peopleTable="anthos_jj2_participants",msgTable="anthos_jj2_messages";
export async function createRoom(origin, requestedTheme="christmas"){
 if(!secret())fail("Pilot storage is not configured.",503);
 const theme=getTheme(requestedTheme);
 const tokens=[randomBytes(32).toString("base64url"),randomBytes(32).toString("base64url")];
 const rooms=await db(roomTable,{}, {title:"Jack & Jill: "+theme.title,canon:theme.opening,model_version:MODEL_VERSION,adventure_key:theme.id},"POST");
 const room=rooms[0];if(!room?.id)fail("Could not create room.",502);
 try{await db(peopleTable,{},[{room_id:room.id,role:"jack",token_hash:hash(tokens[0])},{room_id:room.id,role:"jill",token_hash:hash(tokens[1])}],"POST");}
 catch(e){await db(roomTable,{id:"eq."+room.id},undefined,"DELETE").catch(()=>{});throw e}
 return {ok:true,roomId:room.id,modelVersion:MODEL_VERSION,adventure:theme.id,expiresAt:room.expires_at,invitations:{a:origin+"/pilot/?invite="+tokens[0],b:origin+"/pilot/?invite="+tokens[1]},participants:{a:"Jack's coach",b:"Jill's coach"}};
}

async function auth(token){
 if(!validToken(token))fail("This invitation is missing or invalid.",401);
 const participants=await db(peopleTable,{token_hash:"eq."+hash(token),select:"*"});
 const person=participants[0];if(!person)fail("Invitation not found. This may be an old pilot link.",401);
 const rooms=await db(roomTable,{id:"eq."+person.room_id,select:"*"});
 const room=rooms[0];if(!room||new Date(room.expires_at).getTime()<Date.now())fail("This invitation has expired.",410);
 return {person,room};
}
async function messages(room,role){
 return db(msgTable,{room_id:"eq."+room.id,role:"eq."+role,order:"id.asc",limit:"150",select:"id,author,body,checkpoint,created_at"});
}
async function canonicalMessages(room){
 return db(msgTable,{room_id:"eq."+room.id,role:"eq.canon",order:"id.asc",select:"id,author,body,checkpoint,created_at"});
}
export async function status(token){
 const {person,room}=await auth(token);
 const transcript=person.consented_at?await messages(room,person.role):[];
 const shared=person.consented_at?await canonicalMessages(room):[];
 const submitted=person.submitted_checkpoint===room.checkpoint;
 const other=await db(peopleTable,{room_id:"eq."+room.id,role:"neq."+person.role,select:"role,submitted_checkpoint"});
 const both=other[0]?.submitted_checkpoint===room.checkpoint;
 return {ok:true,role:person.role,title:room.title,checkpoint:room.checkpoint,checkpointTotal:5,roomStatus:room.status,consent:!!person.consented_at,name:person.display_name||"",canon:room.canon,transcript,shared,submitted,otherSubmitted:both,processing:room.resolving,draft:submitted?"":person.draft||"",milestones:MILESTONES,learningFocus:lessonFocus(room.checkpoint,room.adventure_key).milestones,modelVersion:room.model_version||MODEL_VERSION,reflectionComplete:!!person.reflection,ready:person.ready_checkpoint===room.checkpoint,phase:person.learning_phase,info:REMINDER};
}
export async function consent(token,name){
 const c=await auth(token);
 const n=safeText(name,32);
 if(!n||!/^[\p{L}\p{M} .'-]+$/u.test(n))fail("Please provide your first name.");
 if(!c.person.consented_at)await db(peopleTable,{room_id:"eq."+c.room.id,role:"eq."+c.person.role},{display_name:n,consented_at:new Date().toISOString()},"PATCH");
 return status(token);
}
async function ai(instructions,input,max=380,format=null){
 const k=process.env.OPENAI_API_KEY?.trim();if(!k)fail("Sophia's AI connection is not configured.",503);
 let r;try{r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+k,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL?.trim()||"gpt-4.1-mini",store:false,instructions,input,max_output_tokens:max,...(format?{text:{format:{type:"json_schema",name:"anthos_jj2_"+format,strict:true,schema:format==="coaching"?{type:"object",additionalProperties:false,properties:{reply:{type:"string"},ready:{type:"boolean"},phase:{type:"string",enum:["hook","conflict","discovery","reattempt"]},learningEvidence:{type:"string"},learningMilestones:{type:"array",items:{type:"string",enum:["Recognize","Interpret","Navigate","Regulate","Differentiate","Discover","Apply","Reflect"]}},decision:{type:"string"},decisionEvidence:{type:"string"}},required:["reply","ready","phase","learningEvidence","learningMilestones","decision","decisionEvidence"]}:{type:"object",additionalProperties:false,properties:{outcome:{type:"string"},scene:{type:"string"},location:{type:"string"},tension:{type:"string"},research:{type:"string"},facts:{type:"array",items:{type:"string"}}},required:["outcome","scene","location","tension","research","facts"]}}}}:{})}),signal:AbortSignal.timeout(26000)});}catch{fail("Sophia couldn't respond right now. Please retry.",502)}
 if(!r.ok)fail("Sophia's AI service is temporarily unavailable.",502);
 const j=await r.json().catch(()=>({}));
 const text=(j.output||[]).filter(o=>o.type==="message").flatMap(o=>(o.content||[]).filter(x=>x.type==="output_text").map(x=>x.text)).join("\n").trim();
 if(!text)fail("Sophia did not complete her reply. Please retry.",502);
 return text;
}
export async function talk(token,message){
 const c=await auth(token);
 if(!c.person.consented_at)fail("Accept the pilot consent first.",403);
 if(c.room.status!=="active")fail("This pilot is complete or paused.",409);
 if(c.room.resolving||c.person.submitted_checkpoint===c.room.checkpoint)fail("Your decision is already submitted. Await the shared outcome.",409);
 const clean=safeText(message,900);
 if(clean.length<2)fail("Write what you'd tell your character.");
 const prior=(await messages(c.room,c.person.role)).slice(-12);
 const guide=coachingGuide({role:c.person.role,checkpoint:c.room.checkpoint,themeKey:c.room.adventure_key,name:c.person.display_name,canon:c.room.canon,history:prior});
 const params=JSON.stringify({...guide.context,latestMessage:clean,currentProvisionalAction:c.person.draft||null});
 let output=await ai(guide.instructions,params,690,"coaching");
 let guided;
 try{guided=JSON.parse(output)}catch{fail("Sophia's private response was incomplete.",502)}
 const validReply=x=>typeof x.reply==="string"&&avoidRepetitiveResponse(x.reply,prior.filter(m=>m.author==="sophia"));
 if(!validReply(guided)){
   output=await ai(guide.instructions+" Important: your previous response repeated an earlier question or was too short. Respond with a fresh consequence or insight; do not force another quiz.",params,690,"coaching");
   try{guided=JSON.parse(output)}catch{fail("Sophia could not finish her response.",502)}
 }
 if(!validReply(guided)||typeof guided.decision!=="string"||typeof guided.decisionEvidence!=="string")fail("Sophia could not produce a valid reply.",502);
 // The model proposes a character action. Server code validates that the
 // participant actually expressed it, then determines readiness independently.
 const character=c.person.role==="jack"?"Jack":"Jill";
 const evidence=guided.decisionEvidence.trim();
 const sourced=evidence.length>=8&&clean.toLowerCase().includes(evidence.toLowerCase());
 const ownsCharacter=new RegExp("^"+character+"\\b","i").test(guided.decision.trim());
 const newAction=sourced&&ownsCharacter?safeText(guided.decision,900):"";
 const action=newAction||safeText(c.person.draft,900);
 const ready=resolveReadiness({action,priorReady:c.person.ready_checkpoint===c.room.checkpoint});
 const currentEvidence=c.person.learning_log&&typeof c.person.learning_log==="object"&&!Array.isArray(c.person.learning_log)?c.person.learning_log:{};
 const milestones=Array.isArray(guided.learningMilestones)?guided.learningMilestones.filter(m=>MILESTONES.includes(m)).slice(0,3):[];
 const update={...currentEvidence};
 for(const milestone of milestones)update[milestone]={status:"explored",checkpoint:c.room.checkpoint,updated_at:new Date().toISOString()};
 await db(msgTable,{},[
   {room_id:c.room.id,role:c.person.role,author:"participant",checkpoint:c.room.checkpoint,body:clean},
   {room_id:c.room.id,role:c.person.role,author:"sophia",checkpoint:c.room.checkpoint,body:guided.reply.slice(0,2200)}
 ],"POST",{minimal:true});
 await db(peopleTable,{room_id:"eq."+c.room.id,role:"eq."+c.person.role},{
   draft:action||null,ready_checkpoint:ready?c.room.checkpoint:null,
   learning_phase:["hook","conflict","discovery","reattempt"].includes(guided.phase)?guided.phase:"discovery",
   learning_evidence:safeText(guided.learningEvidence,350),learning_log:update
 },"PATCH",{minimal:true});
 return status(token);
}

async function resolve(room){
 const current=(await db(roomTable,{id:"eq."+room.id,select:"*"}))[0];
 if(!current||current.status!=="active")return;
 const members=await db(peopleTable,{room_id:"eq."+room.id,select:"role,submitted_checkpoint,submitted_text"});
 if(members.length!==2||members.some(x=>x.submitted_checkpoint!==current.checkpoint||!x.submitted_text))return;
 if(current.resolving){
   if(!current.processing_at||Date.now()-new Date(current.processing_at).getTime()<70000)return;
   // Release only a demonstrably stale lock; never steal a live resolution.
   await db(roomTable,{id:"eq."+room.id,checkpoint:"eq."+current.checkpoint,resolving:"eq.true",processing_at:"lt."+new Date(Date.now()-70000).toISOString()},{resolving:false,processing_at:null},"PATCH",{minimal:true});
 }
 const claimed=await db(roomTable,{id:"eq."+room.id,checkpoint:"eq."+current.checkpoint,resolving:"eq.false"},
    {resolving:true,processing_at:new Date().toISOString()},"PATCH");
 if(!claimed.length)return;
 try{
   const jack=members.find(x=>x.role==="jack").submitted_text;
   const jill=members.find(x=>x.role==="jill").submitted_text;
   const guide=storyGuide({checkpoint:current.checkpoint,themeKey:current.adventure_key,canon:current.canon,jackAction:jack,jillAction:jill});
   let parsed=null;
   for(let attempt=0;attempt<2;attempt++){
     const raw=await ai(guide.instructions+(attempt?" The last output failed continuity or privacy checks. Correct any repetition or unsafe disclosure; keep both characters' ownership.":""),JSON.stringify(guide.context),1050,"story");
     try{parsed=JSON.parse(raw.replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/g,""))}catch{parsed=null}
     if(storyIsSafe(parsed,current.canon,[jack,jill]))break;
     parsed=null;
   }
   if(!parsed)fail("Sophia needs another attempt to resolve the scene.",502);
   const next={scene:parsed.scene.slice(0,1300),location:parsed.location.slice(0,120),
     tension:parsed.tension.slice(0,500),research:parsed.research.slice(0,500),
     facts:parsed.facts.slice(0,8).map(x=>String(x).slice(0,200))};
   // Postgres performs both the event insert and checkpoint transition atomically.
   // Duplicate calls cannot publish a second result.
   const committed=await db("rpc/anthos_jj2_commit_story",{},
      {p_room_id:room.id,p_checkpoint:current.checkpoint,p_outcome:parsed.outcome.slice(0,2500),p_canon:next},"POST");
   if(committed!==true)fail("The story has changed; refresh to see the latest outcome.",409);
 }catch(e){
   await db(roomTable,{id:"eq."+room.id,checkpoint:"eq."+current.checkpoint,resolving:"eq.true"},
      {resolving:false,processing_at:null},"PATCH",{minimal:true}).catch(()=>{});
   throw e;
 }
}

export async function submit(token){
 const c=await auth(token);
 if(!c.person.consented_at)fail("Accept the pilot consent first.",403);
 if(c.room.status!=="active")return status(token);
 if(c.person.submitted_checkpoint===c.room.checkpoint){await resolve(c.room);return status(token);}
 const draft=safeText(c.person.draft,900);
 if(!draft)fail("Share your advice with Sophia before advancing.");
 if(c.person.ready_checkpoint!==c.room.checkpoint)fail("Keep talking with Sophia before confirming this decision.");
 await db(peopleTable,{room_id:"eq."+c.room.id,role:"eq."+c.person.role},{submitted_text:draft,submitted_checkpoint:c.room.checkpoint},"PATCH",{minimal:true});
 await resolve(c.room);
 return status(token);
}

export async function reflect(token,reflection){
 const c=await auth(token);
 if(!c.person.consented_at)fail("Consent required.",403);
 if(c.room.status!=="complete")fail("Finish the story before reflecting.",409);
 if(c.person.reflection)return status(token);
 const clean=safeText(reflection,900);
 if(clean.length<12)fail("Write a brief practical reflection first.");
 const prior=await messages(c.room,c.person.role);
 const instructions=[
   "You are Sophia. The Jack and Jill fictional adventure is finished.",
   "This is a private adult-learning REFLECTION, not a therapy session, score or test.",
   "Acknowledge the participant's actual reflection in natural language. Suggest only one achievable real-world action they could voluntarily try.",
   "Do not interpret or disclose the other spouse's private reasoning. Do not diagnose, shame or insist on reconciliation.",
   "Speak warmly with personality in approximately 40-90 words. No chapter, phase, research, or milestone headings."
 ].join(" ");
 const reply=await ai(instructions,JSON.stringify({role:c.person.role,name:c.person.display_name,reflection:clean,privateContext:prior.slice(-6).map(x=>({author:x.author,body:x.body}))}),280);
 await db(msgTable,{},[
   {room_id:c.room.id,role:c.person.role,author:"participant",checkpoint:6,body:clean},
   {room_id:c.room.id,role:c.person.role,author:"sophia",checkpoint:6,body:reply.slice(0,2000)}
 ],"POST",{minimal:true});
 await db(peopleTable,{room_id:"eq."+c.room.id,role:"eq."+c.person.role},{reflection:clean},"PATCH",{minimal:true});
 return status(token);
}
