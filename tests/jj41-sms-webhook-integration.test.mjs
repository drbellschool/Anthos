import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign,randomUUID} from "node:crypto";
import {buildAuthored41} from "../api/jj4-authored41.mjs";
import {registerPilotSms,receivePilotSms,tickPilotSms,drainSmsRetries43,PILOT_DAY_MS} from "../api/jj41-sms-core.mjs";
import {buildConversation43} from "../api/jj42-conversations.mjs";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {episode as closeEpisode} from "./fixtures/jj43-what-makes-us-feel-close.mjs";
import {scenarioGraph as closeGraph} from "./fixtures/jj43-what-makes-us-feel-close-graph.mjs";

const sha=s=>createHash("sha256").update(s).digest("hex");
function fixture(open43=false,alternate=false){
 const roomId=randomUUID(),phoneJack="+12125550111",phoneJill="+12125550112",
  tokenJack="J".repeat(43),tokenJill="L".repeat(43),sender="+19036090465";
 const room={id:roomId,title:"One of Us Loves Mountains",
  scenario_id:randomUUID(),episode:buildAuthored41({title:"One of Us Loves Mountains",pilotMode:"shared",
   sophiaIntro:"Anthos introduces the private coaches to fictional Jack and Jill. Each has independent feelings, and no one can demand their partner's agreement."}),
  phase_index:0,stage:"needs_scene",expires_at:"2099-01-01T00:00:00.000Z",
  created_at:"2026-11-20T00:00:00.000Z",updated_at:"2026-11-20T00:00:00.000Z",processing_token:null,simulation_state:null};
 if(open43){
  room.title=alternate?closeEpisode.title:"The Four-Hundred-Dollar Surprise";
  room.scenario_id=alternate?closeEpisode.id:room.scenario_id;
  room.episode=alternate?
   buildConversation43({...closeEpisode,pilotMode:"shared"},{
    timedPilot:true,openConversation:true,scenarioGraph:closeGraph}):
   buildConversation43({...structuredClone(savedMicrowaveStudio),title:room.title,pilotMode:"shared"},{
    timedPilot:true,openConversation:true});
 }
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
  anthos_customer_directory:customers,anthos_atlas_episodes:[],
   anthos_jj41_sms_suppression:[],
  anthos_jj4_messages:[],anthos_jj41_sms_participants:[],anthos_jj41_sms_webhook_events:[]};
 const outbox=[],keypair=generateKeyPairSync("ed25519");let counter=0,failNextDecision=false;
 const failOneDecision=()=>{failNextDecision=true};
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
   else if(value==="not.is.null")out=out.filter(x=>x[key]!==null&&x[key]!==undefined);
   else if(value.startsWith("neq."))out=out.filter(x=>String(x[key])!==value.slice(4));
   else if(value.startsWith("lte."))out=out.filter(x=>x[key]!=null&&Date.parse(x[key])<=Date.parse(value.slice(4)));
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
  if(u.hostname==="api.openai.com"){
   assert.equal(u.pathname,"/v1/responses");
   if(body?.text?.format?.name==="jj43_recipient_review"){
    const context=JSON.parse(body.input),candidate=context.candidate;
    return respond({id:"resp_recipient_mock_"+randomUUID().replace(/-/g,""),
     output:[{content:[{type:"output_text",text:JSON.stringify({recipient:"friend",evidence:candidate.slice(0,32)})}]}]});
   }
   if(body?.text?.format?.name==="jj43_scenario_action"){
    if(failNextDecision){failNextDecision=false;return respond({error:"Synthetic transient outage"},503);}
    const context=JSON.parse(body.input),text=context.coach.toLowerCase();
    const selected=context.options.find(x=>
      (text.includes("asking her directly")&&x.cues.some(c=>c.includes("actually enjoy")))||
      (text.includes("acknowledge his effort")&&x.cues.some(c=>c.includes("acknowledge his effort")))||
      (text.includes("offer a porch hour first")&&x.cues.some(c=>c.includes("offer a porch hour first")))||
      (text.includes("say what sounds good")&&x.cues.some(c=>c.includes("say what sounds good")))||
      (text.includes("agree to the porch conversation")&&x.cues.some(c=>c.includes("agree to the porch conversation")))||
      (text.includes("make a specific invitation")&&x.cues.some(c=>c.includes("make a specific invitation")))||
      (text.includes("actually enjoy")&&x.cues.some(c=>c.includes("actually enjoy"))));
    const a=selected?.id||"reflect";
    return respond({id:"resp_decision_mock_"+randomUUID().replace(/-/g,""),
     output:[{content:[{type:"output_text",text:JSON.stringify({
      recommended:a,action:a,stance:selected?"follow":"decline",
      reason:selected?"I want to try understanding their perspective.":"I'm not ready to make a new decision about that."
     })}]}]});
   }
   if(body?.text?.format?.name!=="jj43_full_character_text")
    return respond({error:"Test classifier unavailable"},503);
   const context=JSON.parse(body.input),coach=String(context.coachMessage||"");
   const isOther=String(context.establishedEpisodeWorld?.what||"").includes("porch");
   const graphRule=isOther&&context.verifiedEventThisTurn?closeGraph.rules.find(x=>x.event===context.verifiedEventThisTurn):null;
   const msg=graphRule?graphRule.reply:isOther?(context.character==="jack"?
    "I put thought into the dinner idea, but Jill wants time on the porch. It's hard not to take that personally. I need to understand her version of closeness before booking anything.":
    "Jack planned a lot, but I would feel close sitting on the porch together. Nothing about dinner is settled, and I want him to understand the quiet hour is important to me."):
    context.character==="jack"?
    "I've missed three repair Saturdays, and I know the broken microwave is still a problem. We also need to talk seriously about our savings, but I'm tired of making promises without following through.":
    "The replacement is already bought, and the savings question still matters. I don't want to pretend a sealed box solves everything. I still need to hear what Jack thinks before making another choice.";
   return respond({id:"resp_sms_mock_"+randomUUID().replace(/-/g,""),
    model:"gpt-4.1-mini",output:[{content:[{type:"output_text",
     text:JSON.stringify({message:msg,coachReference:coach.slice(0,30),
      replyReference:msg.slice(0,32),humorResponse:"not_applicable",humorEvidence:""})}]}]},200);
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
   if(open43&&room.phase_index<5){
    if(body.p_jack)add(lists.anthos_jj4_messages,{room_id:roomId,role:"jack",kind:"prompt",body:body.p_jack,phase_index:room.phase_index});
    if(body.p_jill)add(lists.anthos_jj4_messages,{room_id:roomId,role:"jill",kind:"prompt",body:body.p_jill,phase_index:room.phase_index});
    room.stage="flow";
   }else if(room.phase_index<4){
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
  tokenJack,tokenJill,lists,outbox,sender,failOneDecision,husbandCustomerId:customers[0].id};
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
  // Carrier may deliver an option list without the original scene.
  // A non-choice message and RECAP must restore scene + Jill's private
  // question without moving the room forward or exposing Jack's messages.
  const beforeRecovery=fx.outbox.length;
  const phaseBeforeRecovery=fx.lists.anthos_jj4_rooms[0].phase_index;
  await fx.inbound(fx.phoneJill,"Hello?");
  const recovered=fx.outbox.slice(beforeRecovery);
  assert.equal(recovered.length,2);
  assert.ok(recovered.every(x=>x.to===fx.phoneJill));
  assert.match(recovered[0].text,/Scene 1\/6 \(recap\)/);
  assert.match(recovered[1].text,/Jill \(PRIVATE\):/);
  assert.doesNotMatch(recovered[1].text,/Jack \(PRIVATE\):/);
  assert.equal(fx.lists.anthos_jj4_rooms[0].phase_index,phaseBeforeRecovery);
  await fx.inbound(fx.phoneJill,"RECAP");
  assert.match(fx.outbox.at(-2).text,/Scene 1\/6 \(recap\)/);
  assert.match(fx.outbox.at(-1).text,/Reply 1, 2, or 3/);
  const key=randomUUID();
  await fx.inbound(fx.phoneJack,"1",key);
  const afterChoose=fx.outbox.length;
  await fx.inbound(fx.phoneJack,"1",key);
  assert.equal(fx.outbox.length,afterChoose,"duplicate Telnyx delivery must not re-send coaching");
  await fx.inbound(fx.phoneJill,"2");
  const messagesBeforeSelectedRecap=fx.lists.anthos_jj4_messages.length;
  await fx.inbound(fx.phoneJill,"RECAP");
  assert.match(fx.outbox.at(-2).text,/Scene 1\/6 \(recap\)/);
  assert.match(fx.outbox.at(-1).text,/What should|Reply with your own coaching advice/i);
  assert.doesNotMatch(fx.outbox.at(-1).text,/Reply 1, 2, or 3/);
  assert.equal(fx.lists.anthos_jj4_messages.length,messagesBeforeSelectedRecap);
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

test("4.3 signed SMS pilot has ten-minute day gates, unsolicited replies, private routing and Saturday closure",async()=>{
 const fx=fixture(true),fetchBefore=globalThis.fetch,realNow=Date.now;
 const started=realNow();let clock=started;
 Date.now=()=>clock;
 fx.configure();globalThis.fetch=fx.mockFetch;
 try{
  await assert.rejects(registerPilotSms({
   origin:"https://anthos.love",roomId:fx.roomId,
   husbandCustomerId:fx.husbandCustomerId,invitations:{}
  }),/Real OpenAI provider unavailable/);
  process.env.OPENAI_API_KEY="synthetic-openai-test-only";
  const result=await registerPilotSms({origin:"https://anthos.love",roomId:fx.roomId,
   husbandCustomerId:fx.husbandCustomerId,invitations:{
    jack:"https://anthos.love/pilot-v4/?invite="+fx.tokenJack,
    jill:"https://anthos.love/pilot-v4/?invite="+fx.tokenJill}});
  assert.equal(result.timedPilot,true);
  assert.deepEqual(result.daySchedule.map(x=>Date.parse(x)-started),[0,1,2,3,4,5].map(n=>n*PILOT_DAY_MS));
  const room=fx.lists.anthos_jj4_rooms[0];
  assert.equal(room.phase_index,0);
  assert.equal(room.stage,"flow");
  // 4.3 dynamically selects one character check-in for the opening;
  // both private SMS composers are available immediately, without a
  // forced Jill-first schedule copied from the 4.1 system.
  assert.ok(fx.outbox.some(x=>x.to===fx.phoneJack&&x.text.startsWith("Jack (PRIVATE):")));
  assert.ok(!fx.outbox.some(x=>x.to===fx.phoneJill&&x.text.startsWith("Jill (PRIVATE):")));
  const key=randomUUID();
  await fx.inbound(fx.phoneJack,"Our wives were talking. Just fix the microwave.",key);
  assert.ok(fx.outbox.some(x=>x.to===fx.phoneJack&&x.text.startsWith("Jack (PRIVATE):")));
  const count=fx.outbox.length;
  await fx.inbound(fx.phoneJack,"Our wives were talking. Just fix the microwave.",key);
  assert.equal(fx.outbox.length,count);
  await fx.inbound(fx.phoneJill,"Wait. Don't buy it yet.");
  assert.equal(room.phase_index,0);
  assert.ok(!fx.outbox.some(x=>x.to===fx.phoneJill&&x.text.includes("Our wives were talking")));
  clock=started+PILOT_DAY_MS-1;
  await tickPilotSms(fx.roomId);
  assert.equal(room.phase_index,0);
  clock=started+PILOT_DAY_MS;
  await tickPilotSms(fx.roomId);
  const firstAdvance=room.phase_index;
  assert.ok(firstAdvance<=1);
  // The clock alone cannot finish the other four days.
  clock=started+10*PILOT_DAY_MS;
  await tickPilotSms(fx.roomId);
  assert.equal(room.phase_index,firstAdvance);
  assert.notEqual(room.stage,"complete");
  assert.equal(fx.lists.anthos_jj4_messages.filter(x=>x.kind==="sophia").length,0);
  const eventCount=room.episode.authored43.turns.length;
  assert.ok(eventCount>=2,"SMS pilot needs real-model receipts for review.");
  assert.ok(room.episode.authored43.turns.every(t=>t.replySource==="model-validated"));
  await fx.inbound(fx.phoneJack,"QA LIST");
  assert.ok(fx.outbox.at(-1).text.includes("10. Memory and scores"));
  await fx.inbound(fx.phoneJack,"QA 4 8 Natural but too cautious");
  assert.equal(room.episode.authored43.smsHumanReviews.jack.characterVoice.score,8);
  assert.equal(room.episode.authored43.smsHumanReviews.jack.characterVoice.certification,"participant-feedback-only");
  assert.equal(room.episode.authored43.turns.length,eventCount);
  await fx.inbound(fx.phoneJack,"QA STATUS");
  assert.ok(fx.outbox.at(-1).text.includes("1/10 categories rated"));
  assert.equal(room.episode.authored43.smsHumanReviews.jill,undefined);
 }finally{globalThis.fetch=fetchBefore;Date.now=realNow;fx.restore();}
});

test("Second saved 4.3 episode registers verified phones and captures SMS human QA",async()=>{
 const fx=fixture(true,true),priorFetch=globalThis.fetch;
 fx.configure();process.env.OPENAI_API_KEY="synthetic-openai-test-only";
 globalThis.fetch=fx.mockFetch;
 try{
  const result=await registerPilotSms({origin:"https://anthos.love",roomId:fx.roomId,
   husbandCustomerId:fx.husbandCustomerId,invitations:{
    jack:"https://anthos.love/pilot-v4/?invite="+fx.tokenJack,
    jill:"https://anthos.love/pilot-v4/?invite="+fx.tokenJill}});
  assert.equal(result.timedPilot,true);
  const room=fx.lists.anthos_jj4_rooms[0];
  assert.equal(room.episode.authored43.scenarioGraph.episodeId,closeEpisode.id);
  assert.ok(fx.outbox.some(x=>x.to===fx.phoneJack&&x.text.includes("porch")));
  assert.ok(!fx.outbox.some(x=>/microwave|repair shop|\$400/i.test(x.text)));
  const prior=fx.outbox.length;
  const key=randomUUID();
  const advice="I'd try just sitting down and asking her directly instead of theorizing false realities.";
  fx.failOneDecision();
  await assert.rejects(fx.inbound(fx.phoneJack,advice,key),/decision unavailable/);
  assert.equal(fx.lists.anthos_jj41_sms_webhook_events.find(x=>x.provider_event_id===key).processing_state,"error");
  assert.equal(room.episode.authored43.turns.length,0);
  await fx.inbound(fx.phoneJack,advice,key);
  assert.equal(room.episode.authored43.turns[0].stateAfter.jackAsked,true);
  assert.equal(fx.lists.anthos_jj41_sms_webhook_events.find(x=>x.provider_event_id===key).processing_state,"complete");
  const delivered=fx.outbox.length;
  await fx.inbound(fx.phoneJack,advice,key);
  assert.equal(fx.outbox.length,delivered);
  const sent=fx.outbox.slice(prior).filter(x=>x.to===fx.phoneJack);
  assert.ok(sent.some(x=>x.text.startsWith("Jack (PRIVATE):")),JSON.stringify(sent));
  assert.ok(sent.some(x=>x.text.includes("porch")));
  assert.equal(room.episode.authored43.turns.length,1);
  assert.equal(room.episode.authored43.turns[0].replySource,"model-validated");
  assert.match(room.episode.authored43.turns[0].replyProviderResponseId,/^resp_/);
  await fx.inbound(fx.phoneJack,"QA 4 8 Engaging and responsive");
  assert.equal(room.episode.authored43.smsHumanReviews.jack.characterVoice.score,8);
  assert.equal(room.episode.authored43.smsHumanReviews.jill,undefined);
 }finally{globalThis.fetch=priorFetch;fx.restore()}
});

test("Second graph: five earned days, two free-text lanes, state changes, and real handler Sophia closure (mock providers)",async()=>{
 const fx=fixture(true,true),beforeFetch=globalThis.fetch,realNow=Date.now,started=Date.now();
 let clock=started;Date.now=()=>clock;fx.configure();process.env.OPENAI_API_KEY="synthetic-openai-test-only";
 globalThis.fetch=fx.mockFetch;
 try{
  await registerPilotSms({origin:"https://anthos.love",roomId:fx.roomId,husbandCustomerId:fx.husbandCustomerId,invitations:{
   jack:"https://anthos.love/pilot-v4/?invite="+fx.tokenJack,
   jill:"https://anthos.love/pilot-v4/?invite="+fx.tokenJill}});
  const room=fx.lists.anthos_jj4_rooms[0];
  assert.ok(fx.outbox.some(x=>x.to===fx.phoneJack&&x.text.startsWith("Jack (PRIVATE):")));
  assert.ok(fx.outbox.some(x=>x.to===fx.phoneJill&&x.text.startsWith("Jill (PRIVATE):")));
  clock=started+PILOT_DAY_MS*5;
  await tickPilotSms(fx.roomId);
  assert.equal(room.phase_index,0,"silence must not skip days");
  const steps=[
   [fx.phoneJack,"I'd try just sitting down and asking her directly instead of theorizing false realities."],
   [fx.phoneJill,"Acknowledge his effort, but explain what you want."],
   [fx.phoneJack,"Offer a porch hour first and leave dinner optional."],
   [fx.phoneJill,"Say what sounds good without agreeing to the whole day."],
   [fx.phoneJack,"Agree to the porch conversation before revisiting the dinner idea."]
  ];
  for(let day=0;day<5;day++){
   await fx.inbound(steps[day][0],steps[day][1]);
   assert.ok(room.episode.authored43.turns.at(-1).event,"a real authored action must be selected");
   clock+=PILOT_DAY_MS;
   await tickPilotSms(fx.roomId);
   assert.equal(room.phase_index,day+1);
  }
  assert.equal(room.stage,"complete");
  assert.equal(room.episode.authored43.turns.length,5);
  assert.equal(room.episode.authored43.turns.at(-1).stateAfter.fridgePlan,"porch-first");
  const closings=fx.lists.anthos_jj4_messages.filter(x=>x.kind==="sophia");
  assert.equal(closings.length,1);
  assert.match(closings[0].body,/What Makes Us Feel Close/);
  assert.ok(!/microwave|\$400/i.test(closings[0].body));
  assert.ok(fx.lists.anthos_jj41_sms_participants.every(x=>x.last_sent_sophia));
 }finally{globalThis.fetch=beforeFetch;Date.now=realNow;fx.restore()}
});

test("4.3 durable encrypted inbox recovers without a second carrier webhook and never repeats a committed action",async()=>{
 const fx=fixture(true,true),before=globalThis.fetch,realNow=Date.now,started=Date.now();
 let clock=started;Date.now=()=>clock;fx.configure();process.env.OPENAI_API_KEY="synthetic-openai-test-only";globalThis.fetch=fx.mockFetch;
 try{
  await registerPilotSms({origin:"https://anthos.love",roomId:fx.roomId,husbandCustomerId:fx.husbandCustomerId,invitations:{
   jack:"https://anthos.love/pilot-v4/?invite="+fx.tokenJack,jill:"https://anthos.love/pilot-v4/?invite="+fx.tokenJill}});
  const room=fx.lists.anthos_jj4_rooms[0],key=randomUUID(),advice="I'd try asking her directly about what closeness means.";
  fx.failOneDecision();
  await assert.rejects(fx.inbound(fx.phoneJack,advice,key),/decision unavailable/);
  const event=fx.lists.anthos_jj41_sms_webhook_events.find(x=>x.provider_event_id===key);
  assert.equal(event.processing_state,"error");
  assert.ok(event.encrypted_payload&&!event.encrypted_payload.includes(advice));
  clock+=16000;
  assert.equal((await drainSmsRetries43()).processed,1);
  assert.equal(event.processing_state,"complete");
  assert.equal(event.encrypted_payload,null);
  assert.ok(event.provider_message_id);
  assert.equal(event.delivery_state,"accepted");
  assert.equal(room.episode.authored43.turns.length,1);
  assert.equal(room.episode.authored43.turns[0].stateAfter.jackAsked,true);
  const count=fx.outbox.length;
  await drainSmsRetries43();await fx.inbound(fx.phoneJack,advice,key);
  assert.equal(fx.outbox.length,count);assert.equal(room.episode.authored43.turns.length,1);
 }finally{globalThis.fetch=before;Date.now=realNow;fx.restore()}
});
