import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign,randomUUID} from "node:crypto";
import {buildAuthored41} from "../api/jj4-authored41.mjs";
import {registerPilotSms,receivePilotSms} from "../api/jj41-sms-core.mjs";

const sha=s=>createHash("sha256").update(s).digest("hex");
function fixture(){
 const roomId=randomUUID(),phoneJack="+12125550111",phoneJill="+12125550112",
  tokenJack="J".repeat(43),tokenJill="L".repeat(43),sender="+19036090465";
 const room={id:roomId,title:"One of Us Loves Mountains",
  scenario_id:randomUUID(),episode:buildAuthored41({title:"One of Us Loves Mountains",pilotMode:"shared",
   sophiaIntro:"Anthos introduces the private coaches to fictional Jack and Jill. Each has independent feelings, and no one can demand their partner's agreement."}),
  phase_index:0,stage:"needs_scene",expires_at:"2099-01-01T00:00:00.000Z",
  created_at:"2026-11-20T00:00:00.000Z",processing_token:null,simulation_state:null};
 const people=[
  {id:randomUUID(),room_id:roomId,role:"jack",token_hash:sha(tokenJack),first_name:null,joined_at:null,paused_at:null,submitted_phase:-1},
  {id:randomUUID(),room_id:roomId,role:"jill",token_hash:sha(tokenJill),first_name:null,joined_at:null,paused_at:null,submitted_phase:-1}
 ];
 const groupId=randomUUID(),now="2026-11-20T00:00:00.000Z";
 const customers=[
  {id:randomUUID(),display_name:"Test Husband",phone_e164:phoneJack,
   spouse_phone_e164:phoneJill,group_id:groupId,program:"standard",record_status:"pending",
   phone_verified_at:now,sms_consent_at:now,sms_disclosure_version:"anthos-sms-2026-11-v1"},
  {id:randomUUID(),display_name:"Test Wife",phone_e164:phoneJill,
   spouse_phone_e164:phoneJack,group_id:groupId,program:"standard",record_status:"pending",
   phone_verified_at:now,sms_consent_at:now,sms_disclosure_version:"anthos-sms-2026-11-v1"}
 ];
 const lists={anthos_jj4_rooms:[room],anthos_jj4_participants:people,
  anthos_customer_directory:customers,anthos_jj41_sms_suppression:[],
  anthos_jj4_messages:[],anthos_jj41_sms_participants:[],anthos_jj41_sms_webhook_events:[]};
 const outbox=[],keypair=generateKeyPairSync("ed25519");let counter=0;
 const previous={};
 const names=["TELNYX_API_KEY","TELNYX_FROM_NUMBER","TELNYX_PUBLIC_KEY",
  "TELNYX_PILOT_MESSAGING_ENABLED","THREEFOLD_10DLC_APPROVED",
  "THREEFOLD_SESSION_SECRET","VERCEL_ENV","SUPABASE_SECRET_KEY","OPENAI_API_KEY"];
 function configure(){
  for(const name of names)previous[name]=process.env[name];
  process.env.TELNYX_API_KEY="synthetic-test-key";
  process.env.TELNYX_FROM_NUMBER=sender;
  process.env.TELNYX_PUBLIC_KEY=keypair.publicKey.export({type:"spki",format:"der"}).subarray(-32).toString("base64");
  process.env.TELNYX_PILOT_MESSAGING_ENABLED="true";
  process.env.THREEFOLD_10DLC_APPROVED="true";
  process.env.THREEFOLD_SESSION_SECRET="synthetic-session-secret-only-do-not-reuse-in-production";
  process.env.VERCEL_ENV="production";
  process.env.SUPABASE_SECRET_KEY="synthetic-db-secret";
  delete process.env.OPENAI_API_KEY;
 }
 function restore(){for(const name of names){
  if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];
 }}
 const add=(row,body)=>{const entity={...body};
  if(!entity.id)entity.id=++counter;
  if(!entity.created_at)entity.created_at=new Date().toISOString();
  row.push(entity);return entity;
 };
 function filter(rows,u){
  let out=rows.slice();
  for(const [key,value] of u.searchParams){
   if(["select","order","limit","on_conflict"].includes(key))continue;
   if(value.startsWith("eq."))out=out.filter(x=>String(x[key])===value.slice(3));
   else if(value==="is.null")out=out.filter(x=>x[key]===null||x[key]===undefined);
  }
  const order=u.searchParams.get("order");
  if(order){const [col,dir]=order.split(".");out.sort((a,b)=>String(a[col]).localeCompare(String(b[col]))*(dir==="desc"?-1:1))}
  const limit=Number(u.searchParams.get("limit")||0);if(limit)out=out.slice(0,limit);
  const select=u.searchParams.get("select");
  if(select&&select!=="*"){const fields=select.split(",");
   out=out.map(x=>Object.fromEntries(fields.map(k=>[k,x[k]])));}
  return out;
 }
 const respond=(body,status=200)=>new Response(JSON.stringify(body),
  {status,headers:{"Content-Type":"application/json"}});
 async function mockFetch(input,opts={}){
  const u=new URL(String(input)),body=opts.body?JSON.parse(opts.body):null,
   method=opts.method||"GET";
  if(u.hostname==="api.telnyx.com"){
   assert.equal(u.pathname,"/v2/messages");
   outbox.push(body);
   return respond({data:{id:randomUUID()}},202);
  }
  assert.equal(u.hostname,"kstluxwgrrgdbjyloscb.supabase.co");
  const name=u.pathname.split("/rest/v1/")[1];
  if(Object.hasOwn(lists,name)){
   const arr=lists[name];
   if(method==="GET")return respond(filter(arr,u));
   if(method==="PATCH"){const hit=filter(arr,u);for(const hitItem of hit){
    const target=arr.find(x=>(hitItem.id!==undefined&&x.id===hitItem.id)||
     (hitItem.provider_event_id!==undefined&&x.provider_event_id===hitItem.provider_event_id));
    assert.ok(target,"Mock PATCH must target an exact record");
    Object.assign(target,body);
   }return respond(hit)}
   if(method==="POST"){
    const values=Array.isArray(body)?body:[body],inserted=[];
    for(const value of values){
     if(name==="anthos_jj41_sms_webhook_events"&&arr.some(x=>x.provider_event_id===value.provider_event_id))continue;
     const existing=name==="anthos_jj41_sms_participants"?
      arr.find(x=>x.room_id===value.room_id&&x.role===value.role):null;
     if(existing){Object.assign(existing,value);inserted.push(existing)}
     else inserted.push(add(arr,value));
    }
    return respond(inserted,201);
   }
  }
  if(name==="rpc/anthos_jj4_claim_scene"){
   if(!["needs_scene","flow"].includes(room.stage))return respond(-1);
   if(room.stage==="flow")room.phase_index++;
   room.stage="generating";room.processing_token=body.p_claim;return respond(room.phase_index);
  }
  if(name==="rpc/anthos_jj4_commit_scene"){
   assert.equal(room.stage,"generating");
   assert.equal(body.p_phase,room.phase_index);
   add(lists.anthos_jj4_messages,{room_id:roomId,role:"shared",kind:"scene",
    body:body.p_story,phase_index:room.phase_index});
   if(room.phase_index<4){
    add(lists.anthos_jj4_messages,{room_id:roomId,role:"jack",kind:"prompt",
     body:body.p_jack,phase_index:room.phase_index});
    add(lists.anthos_jj4_messages,{room_id:roomId,role:"jill",kind:"prompt",
     body:body.p_jill,phase_index:room.phase_index});
    room.stage="awaiting";
   }else room.stage=room.phase_index===5?"complete":"flow";
   room.processing_token=null;return respond(true);
  }
  if(name==="rpc/anthos_jj4_store_private_question"){
   const person=people.find(x=>x.id===body.p_participant);
   assert.ok(person);
   if(lists.anthos_jj4_messages.some(x=>x.request_key===body.p_key))return respond("duplicate");
   add(lists.anthos_jj4_messages,{room_id:roomId,role:person.role,phase_index:room.phase_index,
    kind:"question",body:body.p_question,request_key:body.p_key});
   add(lists.anthos_jj4_messages,{room_id:roomId,role:person.role,phase_index:room.phase_index,
    kind:"reply",body:body.p_reply});
   return respond("saved");
  }
  if(name==="rpc/anthos_jj4_submit_coaching"){
   const person=people.find(x=>x.id===body.p_participant);
   if(person.submitted_phase===room.phase_index)return respond(false);
   add(lists.anthos_jj4_messages,{room_id:roomId,role:person.role,phase_index:room.phase_index,
    kind:"coach",body:body.p_message,request_key:body.p_key});
   person.submitted_phase=room.phase_index;
   if(people.every(x=>x.submitted_phase===room.phase_index))room.stage="flow";
   return respond(true);
  }
  if(name==="rpc/anthos_jj4_claim_closure"){
   if(room.stage!=="complete")return respond(false);
   room.processing_token=body.p_claim;return respond(true);
  }
  if(name==="rpc/anthos_jj4_commit_closure"){
   add(lists.anthos_jj4_messages,{room_id:roomId,role:"shared",kind:"sophia",
    phase_index:room.phase_index,body:body.p_message});
   room.processing_token=null;return respond(true);
  }
  throw new Error("Unexpected fake request "+name+" "+method);
 }
 async function inbound(phone,text,id=randomUUID()){
  const event={data:{id,event_type:"message.received",payload:{
   from:{phone_number:phone},to:[{phone_number:sender}],text}}};
  const raw=JSON.stringify(event),stamp=String(Math.floor(Date.now()/1000));
  const signature=sign(null,Buffer.from(stamp+"|"+raw),keypair.privateKey).toString("base64");
  return await receivePilotSms({event,raw,headers:new Headers({
   "telnyx-timestamp":stamp,"telnyx-signature-ed25519":signature})});
 }
 return {configure,restore,mockFetch,inbound,roomId,phoneJack,phoneJill,
  tokenJack,tokenJill,lists,outbox,sender,husbandCustomerId:customers[0].id};
}
test("verified signup consent starts independent private SMS coaches automatically, including reply/dedupe/STOP",async()=>{
 const fx=fixture(),fetchBefore=globalThis.fetch;
 fx.configure();globalThis.fetch=fx.mockFetch;
 try{
  const result=await registerPilotSms({origin:"https://anthos.love",roomId:fx.roomId,
   husbandCustomerId:fx.husbandCustomerId,
   invitations:{jack:"https://anthos.love/pilot-v4/?invite="+fx.tokenJack,
    jill:"https://anthos.love/pilot-v4/?invite="+fx.tokenJill}});
  assert.equal(result.registered,true);
  assert.equal(result.messagesInitiated,true);
  assert.equal(fx.lists.anthos_jj4_participants.every(x=>!!x.joined_at),true);
  assert.equal(fx.outbox.some(m=>m.to===fx.phoneJack&&m.text.includes("opted in during registration")),true);
  assert.equal(fx.outbox.some(m=>m.to===fx.phoneJill&&m.text.includes("opted in during registration")),true);
  assert.equal(fx.lists.anthos_jj4_messages.filter(x=>x.kind==="scene").length,1);
  assert.equal(fx.outbox.some(m=>m.to===fx.phoneJack&&m.text.includes("Scene 1/6")),true);
  assert.equal(fx.outbox.some(m=>m.to===fx.phoneJill&&m.text.includes("Scene 1/6")),true);
  const privateJack=fx.outbox.filter(m=>m.to===fx.phoneJack&&m.text.includes("PRIVATE")).at(-1).text;
  const privateJill=fx.outbox.filter(m=>m.to===fx.phoneJill&&m.text.includes("PRIVATE")).at(-1).text;
  assert.match(privateJack,/Jack/);
  assert.match(privateJill,/Jill/);
  assert.notEqual(privateJack,privateJill);
  const key=randomUUID();
  await fx.inbound(fx.phoneJack,"1",key);
  const afterChoose=fx.outbox.length;
  await fx.inbound(fx.phoneJack,"1",key);
  assert.equal(fx.outbox.length,afterChoose,"duplicate Telnyx delivery must not re-send coaching");
  await fx.inbound(fx.phoneJill,"2");
  await fx.inbound(fx.phoneJack,"Ask her what kind of rest helps her recharge.");
  assert.equal(fx.outbox.some(x=>x.to===fx.phoneJill&&x.text.includes("Ask her what kind of rest helps her recharge.")),false,
   "Jack's raw private text must never be sent to Jill");
  await fx.inbound(fx.phoneJill,"Explain that a quiet weekend would help you recover.");
  assert.equal(fx.lists.anthos_jj4_messages.filter(x=>x.kind==="scene").length,2);
  assert.equal(fx.outbox.some(m=>m.to===fx.phoneJack&&m.text.includes("Scene 2/6")),true);
  assert.equal(fx.outbox.some(m=>m.to===fx.phoneJill&&m.text.includes("Scene 2/6")),true);
  const stoppedBefore=fx.outbox.length;
  await fx.inbound(fx.phoneJill,"STOP");
  assert.equal(fx.outbox.length,stoppedBefore+1,"a one-time opt-out confirmation is permitted");
  assert.ok(fx.lists.anthos_jj41_sms_participants.find(x=>x.role==="jill").stopped_at);
  await fx.inbound(fx.phoneJack,"1");
  assert.equal(fx.outbox.filter(m=>m.to===fx.phoneJill&&m.text.includes("Scene 3/6")).length,0);
 }finally{globalThis.fetch=fetchBefore;fx.restore()}
});
