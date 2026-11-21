import test from "node:test";
import assert from "node:assert/strict";
import {createHash,randomUUID} from "node:crypto";
import api from "../api/jack-jill-v4.mjs";
import {buildAuthored41,AUTHORED_TITLES} from "../api/jj4-authored41.mjs";

// Two-role integration against the ACTUAL JJ4 HTTP handler, with an in-memory
// stand-in for the 4.0 Supabase RPC semantics. No customer records, API tokens,
// OpenAI calls, database changes, or unrelated stories.
const url="https://anthos.test/api/jack-jill-v4";
const roomId="99000000-0000-4000-8000-000000000001";
const sha=x=>createHash("sha256").update(x).digest("hex");
function makeFixture({failSubmitOnce=false,title="The Four-Hundred-Dollar Surprise"}={}){
 const tokens={jack:"J".repeat(43),jill:"L".repeat(43)};
 const episode=buildAuthored41({
  title,pilotMode:"shared",
  sophiaIntro:"Sophia welcomes the husband and wife and explains how shared decisions and attentive listening are different skills."
 });
 const room={id:roomId,scenario_id:randomUUID(),title:episode.title,episode,
  stage:"needs_scene",phase_index:0,expires_at:"2099-01-01T00:00:00.000Z",
  created_at:"2026-11-20T15:00:00.000Z",processing_token:null,simulation_state:null};
 const people=[
  {id:"99000000-0000-4000-8000-000000000011",room_id:roomId,role:"jack",token_hash:sha(tokens.jack),
   joined_at:null,submitted_phase:-1,first_name:null,paused_at:null},
  {id:"99000000-0000-4000-8000-000000000012",room_id:roomId,role:"jill",token_hash:sha(tokens.jill),
   joined_at:null,submitted_phase:-1,first_name:null,paused_at:null}
 ];
 const messages=[];let nextId=1,externalCalls=0,failSubmit=failSubmitOnce;
 const add=(role,kind,phase,body,key=null)=>messages.push({
  id:nextId++,room_id:roomId,role,kind,phase_index:phase,body,
  request_key:key,created_at:"2026-11-20T15:00:00.000Z"});
 const rows={anthos_jj4_rooms:[room],anthos_jj4_participants:people,anthos_jj4_messages:messages};
 const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
 function filtered(name,urlObj){
  let all=rows[name]?.slice()||[];
  const cols=[...urlObj.searchParams.entries()].filter(([key])=>!["select","order","limit"].includes(key));
  for(const [key,value] of cols){
   if(value.startsWith("eq."))all=all.filter(x=>String(x[key])===value.slice(3));
   else if(value==="is.null")all=all.filter(x=>x[key]===null||x[key]===undefined);
  }
  const order=urlObj.searchParams.get("order");
  if(order){const [key,dir]=order.split(".");all.sort((a,b)=>a[key]===b[key]?0:(a[key]<b[key]?-1:1)*(dir==="desc"?-1:1))}
  const limit=Number(urlObj.searchParams.get("limit")||0);
  if(limit>0)all=all.slice(0,limit);
  const select=urlObj.searchParams.get("select");
  if(select&&select!=="*"){
   const fields=select.split(",");
   all=all.map(row=>Object.fromEntries(fields.map(f=>[f,row[f]])));
  }
  return all;
 }
 async function fakeFetch(input,options={}){
  const u=new URL(String(input)), name=u.pathname.split("/rest/v1/")[1];
  if(!name){externalCalls++;throw Error("Unexpected outside-service network call: "+u.hostname)}
  const method=options.method||"GET",body=options.body?JSON.parse(options.body):{};
  if(method==="GET")return respond(filtered(name,u));
  if(method==="PATCH"){
   const affected=filtered(name,u);
   for(const rec of affected)Object.assign(rows[name].find(x=>x.id===rec.id),body);
   return respond(affected);
  }
  if(name==="rpc/anthos_jj4_claim_scene"){
   if(!["needs_scene","flow"].includes(room.stage))return respond(-1);
   if(room.stage==="flow")room.phase_index++;
   room.stage="generating";room.processing_token=body.p_claim;return respond(room.phase_index);
  }
  if(name==="rpc/anthos_jj4_commit_scene"){
   assert.equal(room.stage,"generating");
   assert.equal(room.phase_index,body.p_phase);
   assert.equal(room.processing_token,body.p_claim);
   add("shared","scene",room.phase_index,body.p_story);
   if(room.phase_index<4){
    add("jack","prompt",room.phase_index,body.p_jack);
    add("jill","prompt",room.phase_index,body.p_jill);
    room.stage="awaiting";
   }else room.stage=room.phase_index===5?"complete":"flow";
   room.processing_token=null;return respond(true);
  }
  if(name==="rpc/anthos_jj4_store_private_question"){
   const p=people.find(x=>x.id===body.p_participant);
   if(room.stage!=="awaiting"||!p||p.joined_at===null||p.submitted_phase===room.phase_index)return respond("unavailable");
   if(messages.some(x=>x.room_id===roomId&&x.role===p.role&&x.request_key===body.p_key))return respond("duplicate");
   if(messages.filter(x=>x.role===p.role&&x.phase_index===room.phase_index&&x.kind==="question").length>=2)return respond("limit");
   add(p.role,"question",room.phase_index,body.p_question,body.p_key);
   add(p.role,"reply",room.phase_index,body.p_reply);
   return respond("saved");
  }
  if(name==="rpc/anthos_jj4_submit_coaching"){
   if(failSubmit){failSubmit=false;return respond({error:"Transient test outage"},503)}
   const p=people.find(x=>x.id===body.p_participant);
   if(room.stage!=="awaiting"||!p||p.joined_at===null||p.submitted_phase===room.phase_index)return respond(false);
   add(p.role,"coach",room.phase_index,body.p_message,body.p_key);
   p.submitted_phase=room.phase_index;
   if(people.every(x=>x.submitted_phase===room.phase_index))room.stage="flow";
   return respond(true);
  }
  if(name==="rpc/anthos_jj4_claim_closure"){
   if(room.stage!=="complete"||messages.some(x=>x.kind==="sophia"))return respond(false);
   room.processing_token=body.p_claim;return respond(true);
  }
  if(name==="rpc/anthos_jj4_commit_closure"){
   assert.equal(room.processing_token,body.p_claim);
   add("shared","sophia",room.phase_index,body.p_message);
   room.processing_token=null;return respond(true);
  }
  throw Error("Unimplemented fake store operation: "+name+" "+method);
 }
 async function request(role,action,details){
  const r=await api.fetch(new Request(url,{
   method:action?"POST":"GET",
   headers:{"x-anthos-v4-invite":tokens[role],
    ...(action?{"origin":"https://anthos.test","content-type":"application/json"}:{})},
   ...(action?{body:JSON.stringify({action,...details})}:{})
  }));
  const body=await r.json();
  assert.equal(r.status,200,JSON.stringify(body));
  assert.equal(body.ok,true,JSON.stringify(body));
  return body;
 }
 return {tokens,room,people,messages,request,fakeFetch,getExternalCalls:()=>externalCalls};
}
test("actual JJ4 HTTP route completes six scenes and Sophia with separate private coaching",async()=>{
 const fx=makeFixture(),oldFetch=globalThis.fetch,oldKey=process.env.SUPABASE_SECRET_KEY,oldAI=process.env.OPENAI_API_KEY;
 globalThis.fetch=fx.fakeFetch;process.env.SUPABASE_SECRET_KEY="synthetic-test-key";delete process.env.OPENAI_API_KEY;
 try{
  assert.equal((await fx.request("jack")).joined,false);
  await fx.request("jack","join",{name:"Husband"});
  await fx.request("jill","join",{name:"Wife"});
  assert.equal((await fx.request("jack")).bothJoined,true);
  let current=await fx.request("jack","advance");
  assert.equal(current.scenes.filter(x=>x.kind==="scene").length,1);
  const coaching={
   jack:[
    ["own","Own the missed repair and ask what she needed."],
    ["ask","Listen before you defend your point."],
    ["explain","Explain why losing the savings scared you."],
    ["own","Acknowledge the delay, then share your concern."]
   ],
   jill:[
    ["explain","Don't apologize; this is Jack's fault."],
    ["own","Acknowledge using savings without telling Jack."],
    ["ask","Ask why the savings matter to him."],
    ["own","Own your choice but explain your frustration."]
   ]
  };
  for(let phase=0;phase<4;phase++){
   assert.equal(fx.room.phase_index,phase);
   assert.equal(fx.room.stage,"awaiting");
   let jack=await fx.request("jack"),jill=await fx.request("jill");
   assert.equal(jack.needsReply,true);
   assert.equal(jill.needsReply,true);
   assert.equal(jack.coachChoices.length,3);
   assert.equal(jill.coachChoices.length,3);
   for(const role of ["jack","jill"]){
    const opt=coaching[role][phase][0];
    const st=await fx.request(role,"choice",{optionId:opt,requestKey:randomUUID()});
    assert.equal(st.selectedOption,opt);
    assert.equal(st.coachChoices.length,0);
   }
   jack=await fx.request("jack");jill=await fx.request("jill");
   assert.ok(jack.messages.some(x=>x.kind==="reply"));
   assert.ok(jill.messages.some(x=>x.kind==="reply"));
   assert.equal(jack.messages.some(x=>x.body.includes("I can apologize for surprising him.")),false,"Jack cannot see Jill's objection");
   const privateAdvice=coaching.jack[phase][1];
   await fx.request("jack","coach",{message:privateAdvice,requestKey:randomUUID()});
   assert.equal(fx.room.stage,"awaiting","the first coach must not advance both people");
   assert.equal((await fx.request("jill")).messages.some(x=>x.body===privateAdvice),false);
   await fx.request("jill","coach",{message:coaching.jill[phase][1],requestKey:randomUUID()});
   assert.equal(fx.room.stage,"flow");
   current=await fx.request("jack","advance");
   assert.equal(current.scenes.filter(x=>x.kind==="scene").length,phase+2);
  }
  assert.equal(fx.room.phase_index,4);
  assert.equal(fx.room.stage,"flow");
  current=await fx.request("jill","advance");
  assert.equal(current.scenes.filter(x=>x.kind==="scene").length,6);
  assert.equal(fx.room.stage,"complete");
  current=await fx.request("jack","closure");
  assert.equal(current.hasSophia,true);
  assert.match(current.scenes.find(x=>x.kind==="sophia").body,/SOPHIA · A CLOSING THOUGHT/);
  assert.equal(fx.messages.filter(x=>x.kind==="scene").length,6);
  assert.equal(fx.messages.filter(x=>x.kind==="sophia").length,1);
  assert.equal(fx.messages.filter(x=>x.kind==="coach").length,8);
  assert.equal(fx.messages.filter(x=>x.kind==="question").length,16);
  assert.equal(fx.messages.filter(x=>x.kind==="reply").length,16);
  assert.equal(fx.messages.filter(x=>x.kind==="prompt").length,8);
  assert.equal(fx.getExternalCalls(),0,"no external story-writing calls");
  const shared=fx.messages.filter(x=>x.role==="shared").map(x=>x.body).join(" ");
  for(const phrase of ["Own the missed repair and ask what she needed.",
    "Don't apologize; this is Jack's fault."])
   assert.equal(shared.includes(phrase),false,"private text cannot escape into shared story");
  assert.ok((await fx.request("jill")).messages.every(x=>!x.body.includes("Own the missed repair and ask what she needed.")));
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;
  if(oldAI===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldAI;
 }
});

test("transient submission failure does not permanently strand a 4.1 private follow-up",async()=>{
 const fx=makeFixture({failSubmitOnce:true});
 const oldFetch=globalThis.fetch,oldKey=process.env.SUPABASE_SECRET_KEY;
 globalThis.fetch=fx.fakeFetch;process.env.SUPABASE_SECRET_KEY="synthetic-test-key";
 try{
  await fx.request("jack","join",{name:"Coach J"});
  await fx.request("jill","join",{name:"Coach L"});
  await fx.request("jack","advance");
  await fx.request("jack","choice",{optionId:"own",requestKey:randomUUID()});
  const message="Own the delay and listen before defending yourself.";
  async function send(key){
   return api.fetch(new Request(url,{method:"POST",headers:{"origin":"https://anthos.test",
    "content-type":"application/json","x-anthos-v4-invite":fx.tokens.jack},
    body:JSON.stringify({action:"coach",message,requestKey:key})}));
  }
  const first=await send(randomUUID());
  assert.equal(first.status,502,"the simulated failed downstream RPC should surface as an error");
  assert.equal(fx.messages.filter(x=>x.role==="jack"&&x.kind==="question").length,2,
   "follow-up was already saved despite failed submission");
  assert.equal(fx.messages.filter(x=>x.role==="jack"&&x.kind==="coach").length,0);
  const retry=await send(randomUUID());
  assert.equal(retry.status,200,"the same user follow-up should be retryable without getting stuck");
  const state=await retry.json();
  assert.equal(state.submitted,true);
  assert.equal(fx.messages.filter(x=>x.role==="jack"&&x.kind==="coach").length,1);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;
 }
});


test("all five authored episodes complete through the actual JJ4 two-coach HTTP API",async()=>{
 const perEpisode={
  "The Four-Hundred-Dollar Surprise":["Own the forgotten repair and acknowledge the concern.","Acknowledge spending savings and listen to the concern."],
  "Can We Talk Later?":["Own that later wasn't a time and offer a realistic check-in.","Explain the uncertainty and ask when he can genuinely return."],
  "A Fight on Vacation":["Ask what Jill needs before blaming the GPS.","Explain the disappointment without accusing Jack."],
  "One of Us Loves Mountains":["Ask what kind of rest she'd enjoy.","Explain why rest means so much after a busy week."],
  "Changing Seasons of Desire":["Respect her no and ask what closeness feels possible.","Explain your exhaustion and decline unwanted physical contact."]
 };
 const oldFetch=globalThis.fetch,oldKey=process.env.SUPABASE_SECRET_KEY,oldAI=process.env.OPENAI_API_KEY;
 process.env.SUPABASE_SECRET_KEY="synthetic-test-key";
 delete process.env.OPENAI_API_KEY;
 try{
  for(const title of AUTHORED_TITLES){
   const fx=makeFixture({title});
   globalThis.fetch=fx.fakeFetch;
   await fx.request("jack","join",{name:"QA Jack"});
   await fx.request("jill","join",{name:"QA Jill"});
   await fx.request("jack","advance");
   const words=perEpisode[title];
   for(let phase=0;phase<4;phase++){
    assert.equal(fx.room.stage,"awaiting",title+" phase "+phase);
    const jack=await fx.request("jack");
    const jill=await fx.request("jill");
    for(const [i,role] of ["jack","jill"].entries()){
     const status=i?jill:jack;
     const choice=status.coachChoices[(phase+i)%3];
     assert.ok(choice,title+" phase "+phase+" "+role);
     await fx.request(role,"choice",{optionId:choice.id,requestKey:randomUUID()});
    }
    const jackAdvice=words[0],jillAdvice=words[1];
    await fx.request("jack","coach",{message:jackAdvice,requestKey:randomUUID()});
    assert.equal((await fx.request("jill")).messages.some(m=>m.body===jackAdvice),false);
    await fx.request("jill","coach",{message:jillAdvice,requestKey:randomUUID()});
    assert.equal(fx.room.stage,"flow");
    await fx.request("jack","advance");
   }
   await fx.request("jill","advance");
   const summary=await fx.request("jack","closure");
   assert.equal(summary.hasSophia,true,title);
   assert.equal(fx.room.stage,"complete");
   assert.equal(fx.messages.filter(x=>x.kind==="scene").length,6,title);
   assert.equal(fx.messages.filter(x=>x.kind==="coach").length,8,title);
   const shared=fx.messages.filter(x=>x.role==="shared").map(x=>x.body).join("\n");
   for(const advice of words)assert.equal(shared.includes(advice),false,title+" leaked a private coach message");
   assert.equal(fx.getExternalCalls(),0,"all scenes authored without external text generation");
   const sophia=fx.messages.find(x=>x.kind==="sophia").body;
   assert.match(sophia,/not a grade on your marriage/i,title);
  }
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;
  if(oldAI===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldAI;
 }
});
