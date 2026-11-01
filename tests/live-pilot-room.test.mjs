import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createRoom,consent,send,ask,nextMoment,propose,accept,status,configured} from "../api/pilot-core.mjs";
import endpoint from "../api/pilot.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const sql=read("../supabase/migrations/20261031210000_anthos_live_pair_deep_dive_pilot.sql");
test("pilot screens are real API-backed, not local mocked Sophia responses",()=>{
 const page=read("../pilot/index.html"),client=read("../pilot/app.js"),core=read("../api/pilot-core.mjs");
 assert.match(page,/both spouses must agree/i);
 assert.match(client,/fetch\("\/api\/pilot"/);
 assert.match(core,/https:\/\/api\.openai\.com\/v1\/responses/);
 assert.match(core,/store:false/);
 assert.doesNotMatch(client,/OPENAI_API_KEY|SUPABASE_SECRET_KEY|localStorage/);
 assert.match(client,/sessionStorage\.setItem/);
});
test("private pilot SQL is RLS-locked without anonymous client access",()=>{
 for(const t of ["anthos_pilot_rooms","anthos_pilot_participants","anthos_pilot_messages"]){
  assert.match(sql,new RegExp("alter table public\\."+t+" enable row level security"));
 }
 assert.match(sql,/revoke all on public\.anthos_pilot_rooms/);
 assert.match(sql,/from public, anon, authenticated/);
 assert.match(sql,/to service_role/);
 assert.match(sql,/token_hash text not null unique/);
 assert.match(sql,/on delete cascade/);
});
test("two different signed links: mutual consent, actual OpenAI call, joint agreement",async()=>{
 const formerFetch=globalThis.fetch,oldDb=process.env.SUPABASE_SECRET_KEY,oldAI=process.env.OPENAI_API_KEY;
 process.env.SUPABASE_SECRET_KEY="sb_secret_TEST";process.env.OPENAI_API_KEY="test-openai";
 const rooms=[],people=[],messages=[];let aiRequests=0;
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}});
 globalThis.fetch=async (url,init={})=>{
  if(String(url).includes("api.openai.com")){
   aiRequests++;
   const body=JSON.parse(init.body);
   assert.equal(body.store,false);assert.ok(body.input.includes("Spouse A:"));assert.ok(body.input.includes("Spouse B:"));
   return reply({output:[{type:"message",content:[{type:"output_text",text:"You both care about the surprise. What would make it feel mutual?"}]}]});
  }
  const u=new URL(url),table=u.pathname.split("/").at(-1),method=init.method||"GET";
  const body=init.body?JSON.parse(init.body):null;
  const all=table==="anthos_pilot_rooms"?rooms:table==="anthos_pilot_participants"?people:messages;
  const matches=row=>{
   for(const [key,value] of u.searchParams){
    if(["select","order","limit"].includes(key))continue;
    if(value==="is.null"){if(row[key]!=null)return false;}
    else if(value.startsWith("eq.")){if(String(row[key])!==value.slice(3))return false;}
   }
   return true;
  };
  if(method==="POST"){
   const row={...body};
   if(table==="anthos_pilot_rooms"){row.id="f7bcaa6b-89ce-4aee-a1c2-abbccddeeff0";row.status="active";row.expires_at=new Date(Date.now()+86400000).toISOString();row.ai_turns=0;row.story_beat=1}
   if(table==="anthos_pilot_participants"){row.consented_at=null;row.last_sent_at=null}
   if(table==="anthos_pilot_messages")row.id=messages.length+1;
   all.push(row);return reply([row]);
  }
  let found=all.filter(matches);
  if(u.searchParams.has("order")&&u.searchParams.get("order")==="id.desc")found=found.toReversed();
  if(u.searchParams.has("limit"))found=found.slice(0,Number(u.searchParams.get("limit")));
  if(method==="PATCH"){found.forEach(x=>Object.assign(x,body));return reply(found)}
  if(method==="DELETE"){for(const x of found){const index=all.indexOf(x);if(index>=0)all.splice(index,1)}return reply(found)}
  return reply(found);
 };
 try{
  assert.equal(configured(),true);
  const created=await createRoom("https://anthos.love");
  const a=new URL(created.invitations.a).searchParams.get("invite");
  const b=new URL(created.invitations.b).searchParams.get("invite");
  assert.notEqual(a,b);
  assert.equal(people.length,2);
  assert.equal(people[0].token_hash,createHash("sha256").update(a).digest("hex"));
  assert.notEqual(people[0].token_hash,a);
  assert.equal((await status(a)).ready,false);
  await consent(a);
  await assert.rejects(send(a,"Hello"),/Both spouses/);
  await consent(b);
  assert.equal((await status(a)).ready,true);
  await send(a,"I think Jack meant well.");
  await send(b,"He should have asked Jill first.");
  const after=await ask(a);
  assert.equal(aiRequests,1);
  assert.equal(after.messages.at(-1).author,"sophia");
  assert.equal(after.aiRepliesLeft,11);
  assert.equal(after.storyBeat,1);
  assert.match(after.scene.story,/outdoor Saturday/);
  const secondMoment=await nextMoment(b);
  assert.equal(secondMoment.storyBeat,2);
  assert.match(secondMoment.scene.story,/tickets/);
  assert.equal((await status(a)).storyBeat,2,"Both spouses must see the same new moment.");
  const thirdMoment=await nextMoment(a);
  assert.equal(thirdMoment.storyBeat,3);
  assert.match(thirdMoment.scene.story,/I cleared my whole Saturday/);
  await assert.rejects(nextMoment(b),/final moment/);
  await propose(a,"Ask first, then surprise each other together.");
  await assert.rejects(accept(a),/other spouse/);
  assert.equal((await accept(b)).roomStatus,"completed");
  await assert.rejects(send(a,"still going"),/closed/);
 }finally{
  globalThis.fetch=formerFetch;
  if(oldDb===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldDb;
  if(oldAI===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldAI;
 }
});
test("endpoint rejects cross-origin posts before doing any pilot action",async()=>{
 const req=new Request("https://anthos.love/api/pilot",{method:"POST",
   headers:{"origin":"https://attacker.example","content-type":"application/json","x-anthos-pilot-token":"x".repeat(43)},
   body:JSON.stringify({action:"consent"})});
 const r=await endpoint.fetch(req);assert.equal(r.status,403);
});
