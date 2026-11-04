import test from "node:test";
import assert from "node:assert/strict";
import {createCustomerRoom,consent,send,status} from "../api/pilot-core.mjs";
const idA="adfd9634-8ae5-4e52-a624-3b8e92309511";
const idB="c86260a1-8ad4-4d05-b805-46afc260e1c2";
const group="67625344-cfa3-41ad-bc55-2b18e885aac5";
const customers=[
 {id:idA,group_id:group,first_name:"Alex",display_name:"Alex Example",phone_e164:"+19035550001",
  spouse_phone_e164:"+19035550002",wedding_date:"2010-05-12",
  meaningful_holidays:["christmas"],questionnaire_submitted_at:"2026-11-01",
  program:"pilot",record_status:"pending",created_at:"2026-11-01"},
 {id:idB,group_id:group,first_name:"Sam",display_name:"Sam Example",phone_e164:"+19035550002",
  spouse_phone_e164:"+19035550001",wedding_date:"2010-05-12",
  meaningful_holidays:["christmas"],questionnaire_submitted_at:"2026-11-01",
  program:"pilot",record_status:"pending",created_at:"2026-11-02"}
];
test("real dynamic room: two individual opt-ins, split views, one continuity-safe next scene",async()=>{
 const oldFetch=globalThis.fetch,oldDB=process.env.SUPABASE_SECRET_KEY,oldAI=process.env.OPENAI_API_KEY;
 process.env.SUPABASE_SECRET_KEY="sb_secret_mock_never_network";
 process.env.OPENAI_API_KEY="test-openai-mocked";
 const tables={anthos_customer_directory:customers,anthos_pilot_rooms:[],
  anthos_pilot_participants:[],anthos_pilot_messages:[],anthos_pilot_comments:[],
  anthos_dynamic_adventures:[]};
 const ai=[];
 const resp=data=>new Response(JSON.stringify(data),{status:200});
 const matches=(row,qs)=>{
  for(const [k,v] of qs){
   if(["select","order","limit"].includes(k))continue;
   if(v==="is.null"){if(row[k]!=null)return false;}
   else if(v.startsWith("eq.")&&String(row[k])!==v.slice(3))return false;
   else if(v.startsWith("in.(")){
    const ids=v.slice(4,-1).split(",");
    if(!ids.includes(row[k]))return false;
   }
  }
  return true;
 };
 globalThis.fetch=async(url,init={})=>{
  if(String(url).includes("api.openai.com")){
   const body=JSON.parse(init.body);ai.push(body);
   const obj={
    consequence:"Jack sets the envelope on the table and listens to Jill. She acknowledges his thoughtful effort, but explains why the quiet morning felt important.",
    nextScene:{
     title:"A new Saturday plan",
     story:"Jack and Jill talk over the tickets at the kitchen table. Neither wants to make the other feel rejected, and the conversation opens a possible new way forward. Jack wonders if they could have pancakes before deciding whether to use the ropes course passes. Jill smiles at his willingness to ask rather than assume.",
     prompt:"How should Jack and Jill decide what Saturday morning becomes?",
     options:["Make pancakes and plan together before they leave.","Try the ropes course but check in beforehand.","Offer the tickets to friends and design a new outing."]
    },location:"Jack and Jill's kitchen",timeIndex:1100,
    transition:"They remain at the kitchen table during Friday evening.",
    newFacts:["Jack has asked Jill before committing to Saturday."],
    unresolved:["What to do with the tickets remains open."],
    checkpoint:"two_perspectives",
    checkpointEvidence:"Both Alex and Sam recognized distinct hopes for adventure and for shared quiet time.",
    researchBeat:{pattern:"turned_toward",actor:"Jack",
      evidence:"Jack asked Jill to explain what her quiet morning meant to her."}
   };
   return resp({output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(obj)}]}]});
  }
  const u=new URL(url),table=u.pathname.split("/").at(-1),method=init.method||"GET",body=init.body?JSON.parse(init.body):null;
  const rows=tables[table];if(!rows)throw Error("Unexpected table "+table);
  if(method==="POST"){
   const row={...body};
   if(table==="anthos_pilot_rooms")Object.assign(row,{
     id:"f7bcaa6b-89ce-4aee-a1c2-abbccddeeff0",status:"active",ai_turns:0,story_beat:1,
     expires_at:new Date(Date.now()+86400000).toISOString(),resolving_chapter:0});
   if(table==="anthos_pilot_participants")Object.assign(row,{consented_at:null,last_sent_at:null,ready_chapter:0});
   if(table==="anthos_pilot_messages")row.id=rows.length+1;
   rows.push(row);return resp([row]);
  }
  let selected=rows.filter(row=>matches(row,u.searchParams));
  if(u.searchParams.get("order")==="id.desc")selected=selected.toReversed();
  if(u.searchParams.has("limit"))selected=selected.slice(0,Number(u.searchParams.get("limit")));
  if(method==="PATCH"){selected.forEach(row=>Object.assign(row,body));return resp(selected);}
  if(method==="DELETE"){for(const row of selected){const k=rows.indexOf(row);if(k>=0)rows.splice(k,1)}return resp(selected);}
  return resp(selected);
 };
 try{
  const created=await createCustomerRoom("https://anthos.love",group,"dynamic");
  assert.equal(created.engine,"dynamic");
  assert.equal(tables.anthos_dynamic_adventures.length,1);
  assert.equal(tables.anthos_pilot_rooms[0].conversation_mode,"dynamic");
  const tokenA=new URL(created.invitations.a).searchParams.get("invite");
  const tokenB=new URL(created.invitations.b).searchParams.get("invite");
  const first=await consent(tokenA,"Alex");
  assert.equal(first.ready,false);
  const second=await consent(tokenB,"Sam");
  assert.equal(second.ready,true);
  assert.equal(second.conversationFeed.filter(m=>m.kind==="choices").length,1);
  await send(tokenA,"I think Jill should be asked first.");
  assert.equal(ai.length,0);
  const last=await send(tokenB,"Jack's plan is thoughtful but he could invite her perspective.");
  assert.equal(ai.length,1);
  assert.equal(ai[0].store,false);
  assert.match(ai[0].input,/Jack's plan is thoughtful/);
  assert.match(ai[0].input,/Jill should be asked first/);
  assert.match(ai[0].input,/Christmas/);
  assert.equal(last.checkpointProgress.completed,1);
  assert.equal(last.conversationMode,"dynamic");
  assert.equal(last.conversationFeed.filter(m=>m.kind==="choices").length,2);
  assert.ok(last.conversationFeed.some(m=>m.kind==="consequence"));
  assert.equal(last.scene.title,"A new Saturday plan");
  assert.equal(tables.anthos_dynamic_adventures[0].state.ledger.setting.timeIndex,1100);
  const other=await status(tokenA);
  assert.equal(other.scene.title,last.scene.title);
  assert.equal(other.checkpointProgress.completed,1);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldDB===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldDB;
  if(oldAI===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldAI;
 }
});
