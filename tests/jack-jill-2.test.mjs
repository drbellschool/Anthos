import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {status,consent,talk,submit} from "../api/jack-jill-pilot-core.mjs";
const roomId="11111111-1111-4111-8111-111111111111";
const tokenJack="j".repeat(43),tokenJill="l".repeat(43);
const hash=x=>createHash("sha256").update(x).digest("hex");
function harness(){
 const room={id:roomId,title:"Jack & Jill test",status:"active",checkpoint:1,canon:{scene:"Jack and Jill face two Christmas invitations.",location:"Kitchen",facts:["Two invitations"],tension:"Unspoken expectations",research:"Recognize"},resolving:false,processing_at:null,expires_at:"2099-01-01"};
 const people=[{room_id:roomId,role:"jack",token_hash:hash(tokenJack),consented_at:null,ready_checkpoint:null,display_name:null,draft:null,submitted_checkpoint:null},{room_id:roomId,role:"jill",token_hash:hash(tokenJill),consented_at:null,ready_checkpoint:null,display_name:null,draft:null,submitted_checkpoint:null}];
 const entries=[];let aiCalls=0,next=0;
 const oldFetch=globalThis.fetch,oldSecret=process.env.SUPABASE_SERVICE_ROLE_KEY,oldAI=process.env.OPENAI_API_KEY;
 process.env.SUPABASE_SERVICE_ROLE_KEY="test-service-secret";process.env.OPENAI_API_KEY="test-openai-key";
 globalThis.fetch=async(url,opts={})=>{
  const u=new URL(url),method=opts.method||"GET";
  if(u.hostname==="api.openai.com"){
   aiCalls++;const payload=JSON.parse(opts.body);
   const coaching=payload.text?.format?.name==="anthos_jj2_coaching";
   const value=coaching?{reply:"That decision could be amusing. What would Jack or Jill need to consider? Let's see what happens when you're ready.",ready:true,phase:"reattempt",learningEvidence:"Participant considered a decision and relationship consequences."}:
    {outcome:"Jack and Jill follow both plans, unexpectedly bringing two competitive Christmas casseroles to the kitchen. Jack explains his motives, Jill names her concerns, and both find themselves negotiating with two determined mothers while the holiday clock keeps ticking.",scene:"After the commotion, both realize their commitments now overlap. They need to decide how to respond when their families start making new demands. The kitchen is still full of casseroles and uncomfortable pauses.",location:"Kitchen",tension:"Competing family expectations",research:"An attempted repair can help reopen a conversation after conflict.",facts:["Both mothers arrived","Casseroles remain in the kitchen"]};
   return new Response(JSON.stringify({output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(value)}]}]}),{status:200});
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
test("Jack & Jill 2.0: separate private coaching, guided readiness, both required to resolve canon",async()=>{
 const h=harness();
 try{
  assert.equal((await status(tokenJack)).consent,false);
  await consent(tokenJack,"Alex");await consent(tokenJill,"Sam");
  let jack=await talk(tokenJack,"Jack should invite both mothers before consulting Jill.");
  assert.equal(jack.ready,true);
  let jill=await status(tokenJill);
  assert.equal(jill.transcript.length,0,"Jill cannot see Jack's private messages");
  await submit(tokenJack);
  assert.equal(h.room.checkpoint,1,"One spouse alone cannot advance story");
  jill=await talk(tokenJill,"Jill should plan a quiet evening for the two of them.");
  assert.equal(jill.ready,true);
  await submit(tokenJill);
  assert.equal(h.room.checkpoint,2,"Two explicit decisions advance the story");
  const jackAgain=await status(tokenJack),jillAgain=await status(tokenJill);
  assert.equal(jackAgain.shared.length,1);
  assert.deepEqual(jackAgain.shared,jillAgain.shared,"Both see same canonical event");
  assert.equal(jillAgain.transcript.some(m=>m.body.includes("both mothers")),false,"Private directive never appears in partner transcript");
  assert.equal(h.aiCalls,3,"Two coaching replies, one canonical resolution");
  await assert.rejects(submit(tokenJack),/Keep talking with Sophia/);
  assert.equal(h.room.checkpoint,2,"A new checkpoint requires a fresh decision");
 }finally{h.restore()}
});
