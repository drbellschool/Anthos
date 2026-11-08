import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {status,consent,talk,submit,reflect} from "../api/jack-jill-pilot-core.mjs";
const roomId="11111111-1111-4111-8111-111111111111";
const tokenJack="j".repeat(43),tokenJill="l".repeat(43);
const hash=x=>createHash("sha256").update(x).digest("hex");
function harness(){
 const room={id:roomId,title:"Jack & Jill test",status:"active",checkpoint:1,adventure_key:"christmas",model_version:"2.1.0",canon:{scene:"Jack and Jill face two Christmas invitations.",location:"Kitchen",facts:["Two invitations"],tension:"Unspoken expectations",research:"Recognize"},resolving:false,processing_at:null,expires_at:"2099-01-01"};
 const people=[{room_id:roomId,role:"jack",token_hash:hash(tokenJack),consented_at:null,ready_checkpoint:null,display_name:null,draft:null,learning_log:{},submitted_checkpoint:null},{room_id:roomId,role:"jill",token_hash:hash(tokenJill),consented_at:null,ready_checkpoint:null,display_name:null,draft:null,learning_log:{},submitted_checkpoint:null}];
 const entries=[];let aiCalls=0,next=0;
 const oldFetch=globalThis.fetch,oldSecret=process.env.SUPABASE_SERVICE_ROLE_KEY,oldAI=process.env.OPENAI_API_KEY;
 process.env.SUPABASE_SERVICE_ROLE_KEY="test-service-secret";process.env.OPENAI_API_KEY="test-openai-key";
 globalThis.fetch=async(url,opts={})=>{
  const u=new URL(url),method=opts.method||"GET";
  if(u.hostname==="api.openai.com"){
   aiCalls++;const payload=JSON.parse(opts.body);
   const coaching=payload.text?.format?.name==="anthos_jj2_coaching";
   const isReflection=!payload.text?.format;
   const input=JSON.parse(payload.input);
   const message=input.latestMessage||"";
   const character=input.role||"Jack";
   const actionable=/should|tell|ask|invite|apologize|visit|plan|say|choose/i.test(message);
   const value=isReflection?"Your reflection recognizes a concrete step. Consider one small conversation you could initiate this week.":coaching?{
      reply:actionable?"The holiday is getting complicated in round "+aiCalls+". Your idea gives your character something concrete to try. Ready to see what happens?":"That's a good question. What would you actually advise your character to do?",
      ready:false,phase:"discovery",learningEvidence:"Explored assumptions",
      learningMilestones:["Recognize"],decision:actionable?character+" should openly discuss the holiday plans.":"",
      decisionEvidence:actionable?message.slice(0,Math.min(45,message.length)):""
     }:{
       outcome:"Jack and Jill follow their different plans, bringing two enormous and competitive Christmas casseroles into the kitchen. Jack offers an apology, Jill voices her own concerns, and both discover that the holiday schedule has developed a mind of its own. They now need a fresh conversation.",
       scene:"After the commotion, both realize their commitments still overlap. They need to decide what to tell their families as new demands arrive. The kitchen is still full of casseroles and uncomfortable pauses.",
       location:"Kitchen",tension:"Competing family expectations",
       research:"An attempted repair can help reopen a conversation after conflict.",
       facts:["Both mothers arrived","Casseroles remain in the kitchen"]
     };
   return new Response(JSON.stringify({output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(value)}]}]}),{status:200});
  }
  if(u.pathname.endsWith("/rpc/anthos_jj2_commit_story")){
    const b=JSON.parse(opts.body);
    if(room.checkpoint!==b.p_checkpoint||!room.resolving||people.some(p=>p.submitted_checkpoint!==b.p_checkpoint))return new Response("false",{status:200});
    if(entries.some(x=>x.role==="canon"&&x.checkpoint===b.p_checkpoint))return new Response("false",{status:200});
    entries.push({id:++next,room_id:roomId,role:"canon",author:"story",checkpoint:b.p_checkpoint,body:b.p_outcome,created_at:new Date().toISOString()});
    room.canon=b.p_canon;room.checkpoint=Math.min(5,room.checkpoint+1);room.status=b.p_checkpoint>=5?"complete":"active";room.resolving=false;room.processing_at=null;
    return new Response("true",{status:200});
  }
  let rows=u.pathname.endsWith("anthos_jj2_rooms")?[room]:u.pathname.endsWith("anthos_jj2_participants")?people:entries;
  const filters=[...u.searchParams].filter(([k])=>!["select","limit","order"].includes(k));
  const matched=rows.filter(row=>filters.every(([k,v])=>v.startsWith("eq.")?String(row[k])===v.slice(3):v.startsWith("neq.")?String(row[k])!==v.slice(4):true));
  let result;
  if(method==="GET")result=matched.map(x=>({...x}));
  else if(method==="PATCH"){const body=JSON.parse(opts.body);for(const x of matched)Object.assign(x,body);result=matched.map(x=>({...x}));}
  else if(method==="POST"){const b=JSON.parse(opts.body);const inserted=(Array.isArray(b)?b:[b]).map(x=>({id:++next,...x}));rows.push(...inserted);result=inserted;}
  else throw Error("unexpected method");
  const minimal=opts.headers?.Prefer==="return=minimal";
  return new Response(minimal?null:JSON.stringify(result),{status:minimal?204:200});
 };
 return {room,people,entries,get aiCalls(){return aiCalls},restore(){globalThis.fetch=oldFetch;if(oldSecret===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldSecret;if(oldAI===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldAI;}};
}
test("JJ2: private coaching; deterministic readiness; exactly one canonical shared resolution",async()=>{
 const h=harness();
 try{
  assert.equal((await status(tokenJack)).consent,false);
  await consent(tokenJack,"Alex");await consent(tokenJill,"Sam");
  const question=await talk(tokenJack,"Why is everyone upset?");
  assert.equal(question.ready,false,"Question alone does not count as a decision");
  const jack=await talk(tokenJack,"Jack should invite both mothers before consulting Jill.");
  assert.equal(jack.ready,true,"Explicit action enables progression even when AI ready flag is false");
  assert.equal(h.people[0].learning_log.Recognize.status,"explored");
  const jillBefore=await status(tokenJill);
  assert.equal(jillBefore.transcript.length,0,"Other spouse cannot view private messages");
  await submit(tokenJack);
  assert.equal(h.room.checkpoint,1,"One spouse alone cannot advance canon");
  const jill=await talk(tokenJill,"Jill should plan a quiet evening for the two of them.");
  assert.equal(jill.ready,true);
  await submit(tokenJill);
  assert.equal(h.room.checkpoint,2,"Both submitted decisions advance one shared story");
  const a=await status(tokenJack),b=await status(tokenJill);
  assert.equal(a.shared.length,1);
  assert.deepEqual(a.shared,b.shared);
  assert.ok(!b.transcript.some(x=>x.body.includes("invite both mothers")));
  assert.equal(h.aiCalls,4,"Three coaching replies and one story resolution");
  await assert.rejects(submit(tokenJack),/Keep talking with Sophia/);
  assert.equal(h.room.checkpoint,2);
  assert.equal(h.entries.filter(x=>x.role==="canon").length,1);
 }finally{h.restore()}
});

test("JJ2: five coordinated decisions complete one adventure and permit private reflections",async()=>{
 const h=harness();
 try{
   await consent(tokenJack,"Alex");await consent(tokenJill,"Sam");
   for(let i=1;i<=5;i++){
     const jack=await talk(tokenJack,"Jack should apologize for his assumptions and ask Jill what matters to her.");
     const jill=await talk(tokenJill,"Jill should explain her hopes and ask Jack for a collaborative plan.");
     assert.equal(jack.ready,true);
     assert.equal(jill.ready,true);
     await submit(tokenJack);
     await submit(tokenJill);
     assert.equal(h.room.status,i===5?"complete":"active");
     assert.equal(h.entries.filter(x=>x.role==="canon").length,i);
   }
   const done=await reflect(tokenJack,"I want to ask better questions when I am making a plan.");
   assert.equal(done.reflectionComplete,true);
   assert.ok(done.transcript.some(x=>x.body.includes("reflection recognizes a concrete step")));
   const partner=await status(tokenJill);
   assert.equal(partner.reflectionComplete,false);
   assert.ok(!partner.transcript.some(x=>x.body.includes("I want to ask better questions")));
   await reflect(tokenJack,"A second attempt should not add a new reflection.");
   assert.equal(h.entries.filter(x=>x.role==="jack"&&x.checkpoint===6&&x.author==="participant").length,1);
 }finally{h.restore()}
});
