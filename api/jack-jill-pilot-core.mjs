import {createHash,randomBytes} from "node:crypto";
const BASE="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const secret=()=>process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||"";
const hash=s=>createHash("sha256").update(s).digest("hex");
const fail=(msg,status=400)=>{throw Object.assign(new Error(msg),{status})};
const validToken=t=>typeof t==="string"&&/^[A-Za-z0-9_-]{43}$/.test(t);
const safeText=(x,n=1200)=>typeof x==="string"?x.trim().slice(0,n):"";
const REMINDER="This is a private browser pilot. No SMS is sent.";
const FOCUS=[["Recognize","Interpret"],["Interpret","Navigate"],["Navigate","Regulate"],["Regulate","Differentiate"],["Discover","Apply","Reflect"]];
const MILESTONES=["Recognize","Interpret","Navigate","Regulate","Differentiate","Discover","Apply","Reflect"];
async function db(table,query={},body,method="GET",opts={}){
 const k=secret();if(!k)fail("Private pilot database is not configured.",503);
 const url=new URL(BASE+table);for(const [a,b] of Object.entries(query))url.searchParams.set(a,b);
 const r=await fetch(url,{method,headers:{"apikey":k,"Authorization":"Bearer "+k,"Content-Type":"application/json","Prefer":opts.minimal?"return=minimal":"return=representation"},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(13000)});
 if(!r.ok)fail("Pilot database request failed.",502);
 if(opts.minimal)return [];
 return r.json().catch(()=>[]);
}
const roomTable="anthos_jj2_rooms",peopleTable="anthos_jj2_participants",msgTable="anthos_jj2_messages";
export async function createRoom(origin){
 if(!secret())fail("Pilot storage is not configured.",503);
 const tokens=[randomBytes(32).toString("base64url"),randomBytes(32).toString("base64url")];
 const rooms=await db(roomTable,{}, {title:"Jack & Jill: A Christmas Conundrum"},"POST");
 const room=rooms[0];if(!room?.id)fail("Could not create room.",502);
 try{await db(peopleTable,{},[{room_id:room.id,role:"jack",token_hash:hash(tokens[0])},{room_id:room.id,role:"jill",token_hash:hash(tokens[1])}],"POST");}
 catch(e){await db(roomTable,{id:"eq."+room.id},undefined,"DELETE").catch(()=>{});throw e}
 return {ok:true,roomId:room.id,expiresAt:room.expires_at,invitations:{a:origin+"/pilot/?invite="+tokens[0],b:origin+"/pilot/?invite="+tokens[1]},participants:{a:"Jack's coach",b:"Jill's coach"}};
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
 return {ok:true,role:person.role,title:room.title,checkpoint:room.checkpoint,checkpointTotal:5,roomStatus:room.status,consent:!!person.consented_at,name:person.display_name||"",canon:room.canon,transcript,shared,submitted,otherSubmitted:both,processing:room.resolving,draft:submitted?"":person.draft||"",milestones:MILESTONES,learningFocus:FOCUS[Math.min(room.checkpoint-1,4)],reflectionComplete:!!person.reflection,info:REMINDER};
}
export async function consent(token,name){
 const c=await auth(token);
 const n=safeText(name,32);
 if(!n||!/^[\p{L}\p{M} .'-]+$/u.test(n))fail("Please provide your first name.");
 if(!c.person.consented_at)await db(peopleTable,{room_id:"eq."+c.room.id,role:"eq."+c.person.role},{display_name:n,consented_at:new Date().toISOString()},"PATCH");
 return status(token);
}
async function ai(instructions,input,max=380){
 const k=process.env.OPENAI_API_KEY?.trim();if(!k)fail("Sophia's AI connection is not configured.",503);
 let r;try{r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+k,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL?.trim()||"gpt-4.1-mini",store:false,instructions,input,max_output_tokens:max}),signal:AbortSignal.timeout(26000)});}catch{fail("Sophia couldn't respond right now. Please retry.",502)}
 if(!r.ok)fail("Sophia's AI service is temporarily unavailable.",502);
 const j=await r.json().catch(()=>({}));
 const text=(j.output||[]).filter(o=>o.type==="message").flatMap(o=>(o.content||[]).filter(x=>x.type==="output_text").map(x=>x.text)).join("\n").trim();
 if(!text)fail("Sophia did not complete her reply. Please retry.",502);
 return text;
}
const coachInstructions=`You are Sophia, witty research-informed facilitator of Anthos Deep Dive 2.0, The Jack & Jill Method. This is NOT therapy. Address ONLY this authenticated participant. One spouse privately advises Jack and the other privately advises Jill. Never claim you know what the spouse privately said, thought or felt. This is a playful improvisational fictional marriage adventure, not prewritten chapters. Maintain scene continuity. Answer the participant's actual new text directly and specifically, including objections. You may explore small hypothetical consequences ('Jack imagines...') but never assert that a shared event occurred before a coordinated checkpoint. In roughly 60-125 words: acknowledge their concrete reasoning, offer a warm witty observation, weave a precise, modest research-backed idea when appropriate (Gottman: bids/repair; Schnarch: differentiated self/regulated response; Aron: shared novelty/self-expansion), and invite one meaningful response. Don't turn every message into a lecture. No diagnosis, no 'correct answers', no forced lessons. If the user seems ready, suggest they use "See what happens"; never claim to submit on their behalf. Avoid quoting private words to the other spouse. If content signals coercion, abuse or immediate safety concerns, stop comedic escalation and prioritize safety, not a relationship game.`;
export async function talk(token,message){
 const c=await auth(token);
 if(!c.person.consented_at)fail("Accept the pilot consent first.",403);
 if(c.room.status!=="active")fail("This pilot is complete or paused.",409);
 if(c.room.resolving||c.person.submitted_checkpoint===c.room.checkpoint)fail("Your decision is already submitted. Await the shared outcome.",409);
 const clean=safeText(message,900);if(!clean||clean.length<2)fail("Write what you'd tell your character.");
 const prior=(await messages(c.room,c.person.role)).slice(-12);
 const role=c.person.role==="jack"?"Jack":"Jill";
 const response=await ai(coachInstructions+" The instructional milestones for this decision are "+FOCUS[Math.min(c.room.checkpoint-1,4)].join(", ")+". The overall story should progress naturally through Hook, Conflict, Discovery, Reattempt, Outcome and Reflection; the stages are goals, not scripted screens. Ask about their reasoning, challenge a missed pattern gently, and allow a revised approach before recommending advancement.",JSON.stringify({coachName:c.person.display_name,character:role,checkpoint:c.room.checkpoint,scene:c.room.canon,prior:prior.map(x=>({author:x.author,body:x.body})),latest:clean}),350);
 await db(msgTable,{},[{room_id:c.room.id,role:c.person.role,author:"participant",checkpoint:c.room.checkpoint,body:clean},{room_id:c.room.id,role:c.person.role,author:"sophia",checkpoint:c.room.checkpoint,body:response.slice(0,2200)}],"POST",{minimal:true});
 await db(peopleTable,{room_id:"eq."+c.room.id,role:"eq."+c.person.role},{draft:clean},"PATCH",{minimal:true});
 return status(token);
}
async function resolve(room){
 const fresh=(await db(roomTable,{id:"eq."+room.id,select:"*"}))[0];
 if(!fresh||fresh.status!=="active")return;
 const members=await db(peopleTable,{room_id:"eq."+room.id,select:"role,submitted_checkpoint,submitted_text"});
 if(members.length!==2||members.some(x=>x.submitted_checkpoint!==fresh.checkpoint))return;
 if(fresh.resolving && fresh.processing_at && Date.now()-new Date(fresh.processing_at).getTime()<70000)return;
 const claimed=await db(roomTable,{id:"eq."+room.id,checkpoint:"eq."+fresh.checkpoint,resolving:"eq.false"},{resolving:true,processing_at:new Date().toISOString()},"PATCH");
 if(!claimed.length)return;
 try{
  const j=members.find(x=>x.role==="jack")?.submitted_text||"";
  const l=members.find(x=>x.role==="jill")?.submitted_text||"";
  const prompt=`You are Sophia, a skilled improvisational story director for fictional married couple Jack and Jill. Both players submitted their own character's intended decision. Create ONE canonical event that combines BOTH instructions with meaningful consequences, cohesive location/timeline, and escalating playful comedy, while preserving fictional agency and research-based relationship learning. No prewritten chapters. Preserve facts already established. No direct quotes, private confessions or references to real participants; only fictional Jack and Jill behavior. Do not invent any private disclosures. Keep real participant wording out of the shared story. Return ONLY valid JSON with keys "outcome","scene","location","tension","research","facts". outcome 80-130 words including immediate consequence and a concrete fictional event. scene 35-75 words describing the next dilemma, except after fifth checkpoint when scene is a warm closing. research one short accurate skill/insight tied to actual fictional behavior (Gottman, Schnarch or Aron, with no invented citation). facts array up to 6 short continuity facts. No clinical diagnosis. Avoid using the same location repeatedly without causal transition. The first outcome must materially depend on both choices.`;
  const raw=await ai(prompt,JSON.stringify({checkpoint:fresh.checkpoint,previous:fresh.canon,JackDecision:j,JillDecision:l,phase:fresh.checkpoint===1?"hook and conflict":fresh.checkpoint===5?"climax and reflection":"escalation, discovery, reattempt"}),1050);
  let parsed;try{parsed=JSON.parse(raw.replace(/^\`\`\`(?:json)?\s*|\s*\`\`\`$/g,""))}catch{fail("Sophia's story result was incomplete.",502)}
  for(const k of ["outcome","scene","location","tension","research"])if(typeof parsed[k]!=="string"||parsed[k].trim().length<8)fail("Sophia's story failed validation.",502);
  if(!Array.isArray(parsed.facts))fail("Story continuity failed validation.",502);
  const next={scene:parsed.scene.slice(0,1300),location:parsed.location.slice(0,120),tension:parsed.tension.slice(0,500),research:parsed.research.slice(0,500),facts:parsed.facts.slice(0,6).map(x=>String(x).slice(0,200))};
  await db(msgTable,{}, {room_id:room.id,role:"canon",author:"story",checkpoint:fresh.checkpoint,body:parsed.outcome.slice(0,2500)},"POST");
  const done=fresh.checkpoint>=5;
  await db(roomTable,{id:"eq."+room.id,checkpoint:"eq."+fresh.checkpoint,resolving:"eq.true"},{canon:next,checkpoint:done?5:fresh.checkpoint+1,status:done?"complete":"active",resolving:false,processing_at:null},"PATCH",{minimal:true});
 }catch(e){
  await db(roomTable,{id:"eq."+room.id,resolving:"eq.true"},{resolving:false,processing_at:null},"PATCH",{minimal:true}).catch(()=>{});
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
 await db(peopleTable,{room_id:"eq."+c.room.id,role:"eq."+c.person.role},{submitted_text:draft,submitted_checkpoint:c.room.checkpoint},"PATCH",{minimal:true});
 await resolve(c.room);
 return status(token);
}

export async function reflect(token,reflection){
 const c=await auth(token);
 if(!c.person.consented_at)fail("Consent required.",403);
 if(c.room.status!=="complete")fail("Finish the story before reflecting.",409);
 const clean=safeText(reflection,900);
 if(clean.length<12)fail("Write a brief practical reflection first.");
 await db(peopleTable,{room_id:"eq."+c.room.id,role:"eq."+c.person.role},{reflection:clean},"PATCH",{minimal:true});
 const prior=await messages(c.room,c.person.role);
 const reply=await ai(coachInstructions+" The story is finished. Briefly affirm the concrete skill this participant wants to practice, offer one realistic small action they can choose, and close warmly. Do not reveal their words to the other spouse. No more story checkpoints.",JSON.stringify({reflection:clean,role:c.person.role,prior:prior.slice(-5).map(x=>({author:x.author,body:x.body}))}),230);
 await db(msgTable,{},[{room_id:c.room.id,role:c.person.role,author:"participant",checkpoint:6,body:clean},{room_id:c.room.id,role:c.person.role,author:"sophia",checkpoint:6,body:reply.slice(0,2000)}],"POST",{minimal:true});
 return status(token);
}
