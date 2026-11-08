import test from "node:test";
import assert from "node:assert/strict";
import {createHash,randomUUID} from "node:crypto";
import {status,join,begin,talk,submit,progress,reflect,createRoom} from "../api/jj3-core.mjs";

const rid="11111111-1111-4111-8111-111111111111";
const sid="a718d5e5-31bd-4bfa-9aa6-1712505015d1";
const tokens={jack:"j".repeat(43),jill:"l".repeat(43)};
const hash=s=>createHash("sha256").update(s).digest("hex");
const scenario={id:sid,title:"One of Us Loves Mountains",petal_slug:"adventure-play",mode:"shared",
 opening_scene:"Jack has packed hiking gear. Jill has brought her books. Both want a different weekend in the same cabin.",
 learning_objective:"Respect the distinct needs for rest and adventure.",research_lenses:["gottman","schnarch","aron"]};

function harness(mode="shared",{invalidFirst=false}={}){
 let room={id:rid,title:scenario.title,scenario_id:sid,petal_slug:"adventure-play",mode,
  status:"active",step:1,scene:{scene:scenario.opening_scene,tension:scenario.learning_objective},
  processing_token:null,processing_at:null,expires_at:"2099-01-01"};
 const people=[{id:"22222222-2222-4222-8222-222222222222",room_id:rid,role:"jack",token_hash:hash(tokens.jack),
    name:null,consented_at:null,pending_step:null,pending_action:null,submitted_step:null,submitted_action:null,
    private_memory:{},learning_log:{},reflection:null},
  {id:"33333333-3333-4333-8333-333333333333",room_id:rid,role:"jill",token_hash:hash(tokens.jill),
    name:null,consented_at:null,pending_step:null,pending_action:null,submitted_step:null,submitted_action:null,
    private_memory:{},learning_log:{},reflection:null}];
 if(mode==="individual")people.pop();
 const messages=[];let next=0,aiCalls=0,badReturned=false;
 const oldFetch=globalThis.fetch,oldSecret=process.env.SUPABASE_SERVICE_ROLE_KEY,oldAI=process.env.OPENAI_API_KEY;
 process.env.SUPABASE_SERVICE_ROLE_KEY="fake-service-test";
 process.env.OPENAI_API_KEY="fake-ai-test";
 function out(v,code=200){return new Response(JSON.stringify(v),{status:code,headers:{"Content-Type":"application/json"}})}
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url),method=options.method||"GET",body=options.body?JSON.parse(options.body):null;
  if(u.hostname==="api.openai.com"){
   aiCalls++;
   const input=JSON.parse(body.input);
   const type=body.text?.format?.name;
   if(invalidFirst&&!badReturned&&type==="jj3_character_reply"){
     badReturned=true;
     return out({status:"incomplete",output:[]});
   }
   const reply=type==="jj3_story_outcome"?
      {outcome:"Jack starts toward his mountain, and Jill heads for the reading terrace. Both have chosen independently, so their morning becomes funny and complicated. A ranger announces the ridge has closed while a festival starts on the lakeshore, setting up an unexpected reunion later in the day.",
       nextScene:"The ridge is closed by fog. The once-quiet reading terrace is now filled with festival musicians and someone dressed as an inflatable moose. Jack and Jill each need a fresh plan before lunchtime.",
       location:"Lakeside pavilion",tension:"Both original plans are disrupted",facts:["The ridge closed","The lake festival began"],researchNote:"Different needs can coexist."}
    :{characterReply:type==="jj3_intro"?"Buddy, that happened so fast. I'm worried Jill thinks I only care about hiking. I have a ridiculous plan, but I'm not sure I should say it out loud. Can you help me think through it?":
       "Oh, that's a real suggestion. I want to try that, but I'm nervous I'll come off as selfish. Part of me wants adventure and part of me wants Jill to feel heard. I might even apologize to the inflatable moose if this gets any stranger.",
      sophiaAside:"",action:"",evidence:"",privateMemory:"Still afraid to seem unadventurous.",
      learningMilestones:["Recognize"]};
   return out({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(reply)}]}]});
  }
  const path=u.pathname,qs=u.searchParams;
  if(path.endsWith("/rpc/anthos_jj3_write_turn")){
   const p=people.find(x=>x.id===body.p_participant);
   if(!p||room.step!==body.p_step||room.status!=="active"||p.submitted_step===room.step)return out(false);
   if(messages.some(x=>x.kind==="coach"&&x.role===p.role&&x.request_key===body.p_key))return out(true);
   messages.push({id:++next,room_id:rid,role:p.role,author:"coach",kind:"coach",step:room.step,body:body.p_user,request_key:body.p_key});
   messages.push({id:++next,room_id:rid,role:p.role,author:"character",kind:"reply",step:room.step,body:body.p_character});
   if(body.p_aside)messages.push({id:++next,room_id:rid,role:p.role,author:"sophia",kind:"aside",step:room.step,body:body.p_aside});
   if(body.p_action){p.pending_step=room.step;p.pending_action=body.p_action}
   p.private_memory=body.p_memory;p.learning_log=body.p_learning;
   return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_submit")){
   const p=people.find(x=>x.id===body.p_participant);
   if(!p||room.step!==body.p_step||p.pending_step!==room.step)return out(false);
   p.submitted_step=room.step;p.submitted_action=p.pending_action;return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_claim")){
   if(room.step!==body.p_step||room.status!=="active"||room.processing_token)return out(false);
   if(people.some(p=>p.submitted_step!==room.step||!p.submitted_action))return out(false);
   room.processing_token=body.p_token;room.processing_at=new Date().toISOString();return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_publish")){
   if(room.step!==body.p_step||room.processing_token!==body.p_token)return out(false);
   messages.push({id:++next,room_id:rid,role:"shared",author:"story",kind:"outcome",step:room.step,body:body.p_outcome});
   room.scene=body.p_scene;room.step=Math.min(5,room.step+1);room.status=body.p_step>=5?"complete":"active";
   room.processing_token=null;room.processing_at=null;return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_release")){room.processing_token=null;return out(true)}
  let rows=path.endsWith("/anthos_jj3_rooms")?[room]:path.endsWith("/anthos_jj3_participants")?people:
    path.endsWith("/anthos_jj3_messages")?messages:path.endsWith("/anthos_jj2_scenarios")?[scenario]:[];
  const filter=[...qs].filter(([k])=>!["select","limit","order"].includes(k));
  const filtered=rows.filter(x=>filter.every(([k,v])=>{
   if(v==="is.null")return x[k]===null||x[k]===undefined;
   if(v.startsWith("eq."))return String(x[k])===v.slice(3);
   if(v.startsWith("neq."))return String(x[k])!==v.slice(4);
   return true;
  }));
  if(method==="GET")return out(filtered.map(x=>({...x})));
  if(method==="PATCH"){
   for(const x of filtered)Object.assign(x,body);
   return out(filtered.map(x=>({...x})));
  }
  if(method==="POST"){
   const records=Array.isArray(body)?body:[body];
   const added=records.map(b=>({...b,id:++next}));
   if(path.endsWith("/anthos_jj3_messages"))messages.push(...added);
   else if(path.endsWith("/anthos_jj3_participants"))people.push(...added);
   else if(path.endsWith("/anthos_jj3_rooms")){room={...added[0],id:rid,step:1,status:"active",expires_at:"2099-01-01"};return out([room])}
   return out(added);
  }
  if(method==="DELETE")return out(filtered);
  return out({error:"Unexpected mock route "+method+" "+path},500);
 };
 return {get people(){return people},get room(){return room},get messages(){return messages},get aiCalls(){return aiCalls},
  restore(){globalThis.fetch=oldFetch;if(oldSecret===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldSecret;
    if(oldAI===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldAI;}};
}
test("3.0 private character conversation is distinct, with genuine character introductions",async()=>{
 const h=harness();
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  const jack=await begin(tokens.jack),jill=await begin(tokens.jill);
  assert.match(jack.messages[0].body,/Okay, buddy/i);
  assert.match(jill.messages[0].body,/Can I confess/i);
  assert.equal(jack.messages[0].author,"character");
  assert.equal(jill.messages[0].author,"character");
  assert.notEqual(jack.messages[0].body,jill.messages[0].body);
  assert.equal((await status(tokens.jill)).messages.some(x=>x.body.includes("Okay, buddy")),false);
  assert.equal((await begin(tokens.jack)).messages.length,1,"Repeat introduction must not duplicate.");
 }finally{h.restore()}
});
test("3.0 imperfect Jack decision remains his exact choice and doesn't need Sophia approval",async()=>{
 const h=harness();
 try{
  await join(tokens.jack,"Adam");await begin(tokens.jack);
  const suggestion="Jack needs to tell Jill he wants the mountain hike even if it seems selfish.";
  const result=await talk(tokens.jack,suggestion,randomUUID());
  assert.equal(result.action,suggestion);
  assert.equal(result.messages.at(-1).author,"character");
  const second=await talk(tokens.jack,"No, Jill needs to support Jack.",randomUUID());
  assert.equal(second.action,suggestion,"Jill-only instruction can't replace Jack's move");
  assert.equal(h.room.step,1);
 }finally{h.restore()}
});
test("3.0 malformed AI output retries without losing the user turn or inventing a canned response",async()=>{
 const h=harness("shared",{invalidFirst:true});
 try{
  await join(tokens.jack,"Adam");await begin(tokens.jack);
  const message="Jack should go hiking on his own and invite Jill to meet at lunch.";
  const result=await talk(tokens.jack,message,randomUUID());
  assert.equal(result.action,message);
  assert.equal(h.messages.filter(x=>x.author==="coach").length,1);
  assert.equal(h.messages.filter(x=>x.author==="character"&&x.kind==="reply").length,1);
  assert.equal(h.aiCalls,2);
 }finally{h.restore()}
});
test("3.0 two private coaches must both confirm; one shared outcome; fresh next-scene character hook",async()=>{
 const h=harness();
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  await begin(tokens.jack);await begin(tokens.jill);
  for(let step=1;step<=5;step++){
   if(step>1){assert.equal((await begin(tokens.jack)).messages.filter(m=>m.kind==="intro"&&m.step===step).length,1)}
   await talk(tokens.jack,"Jack should choose the ridge trail and stay open to meeting Jill later.",randomUUID());
   await talk(tokens.jill,"Jill should say she needs rest and suggest they meet at lunch.",randomUUID());
   await submit(tokens.jack);
   assert.equal(h.room.step,step,"Story must wait for other coach.");
   await submit(tokens.jill);
   assert.equal(h.messages.filter(m=>m.kind==="outcome").length,step);
   assert.equal(h.room.status,step===5?"complete":"active");
  }
  const a=await status(tokens.jack),b=await status(tokens.jill);
  assert.deepEqual(a.shared,b.shared);
  assert.equal(b.messages.some(m=>m.body.includes("Buddy, that happened")),false);
  assert.equal(a.status,"complete");
  const final=await reflect(tokens.jack,"I want to ask about our plans before assuming my idea wins.");
  assert.equal(final.reflectionComplete,true);
  assert.equal((await status(tokens.jill)).reflectionComplete,false);
 }finally{h.restore()}
});
test("3.0 solo scenario doesn't require fictional spouse to have a separate human coach",async()=>{
 const h=harness("individual");
 try{
  await join(tokens.jack,"Adam");await begin(tokens.jack);
  await talk(tokens.jack,"Jack should stop and admit he needs a different plan.",randomUUID());
  const result=await submit(tokens.jack);
  assert.equal(result.step,2);
  assert.equal(h.messages.filter(m=>m.kind==="outcome").length,1);
  assert.equal(h.people.length,1);
 }finally{h.restore()}
});
