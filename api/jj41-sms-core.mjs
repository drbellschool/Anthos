// Anthos 4.1 private two-person SMS pilot.
// Enabled only after an approved carrier use case, signed Telnyx inbound
// webhooks and existing separately verified, voluntary registration SMS consent.
import {createHash,randomBytes,createCipheriv,createDecipheriv,createPublicKey,verify,randomUUID} from "node:crypto";
import {storySupabaseBase,storySupabaseHeaders} from "./jj4-database-config.mjs";
import {status,join,advance,choose,coach,sophia,pause,resume} from "./jj4-core.mjs";

const PHONE=/^\+[1-9]\d{7,14}$/;
const SESS="anthos_jj41_sms_participants",EVENTS="anthos_jj41_sms_webhook_events";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash=value=>createHash("sha256").update(value).digest("hex");
const enabled=()=>process.env.TELNYX_PILOT_MESSAGING_ENABLED==="true"&&
 !!process.env.TELNYX_API_KEY&&PHONE.test(process.env.TELNYX_FROM_NUMBER||"")&&
 !!process.env.TELNYX_PUBLIC_KEY&&!!process.env.THREEFOLD_SESSION_SECRET;
export function pilotSmsReady(){return enabled()&&process.env.VERCEL_ENV==="production"}
function needConfig(){
 if(!pilotSmsReady())throw Object.assign(new Error(
  "Two-way SMS is not enabled. Verify the approved carrier campaign, the Telnyx signing public key, and the production SMS pilot flag first."),{status:503});
}
function cryptoKey(){
 const secret=process.env.THREEFOLD_SESSION_SECRET||"";
 if(secret.length<24)throw new Error("SMS token storage requires a strong server session secret.");
 return createHash("sha256").update("Anthos-JJ41-SMS-token-2026:").update(secret).digest();
}
export function protectSmsToken(token){
 if(!/^[A-Za-z0-9_-]{40,100}$/.test(token||""))throw new Error("Invalid pilot invitation.");
 const iv=randomBytes(12);
 const cipher=createCipheriv("aes-256-gcm",cryptoKey(),iv);
 const data=Buffer.concat([cipher.update(token,"utf8"),cipher.final()]);
 return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),data.toString("base64url")].join(".");
}
export function unprotectSmsToken(cipherText){
 const [iv,tag,body]=String(cipherText||"").split(".");
 if(!iv||!tag||!body)throw new Error("Invalid encrypted SMS invitation.");
 const dec=createDecipheriv("aes-256-gcm",cryptoKey(),Buffer.from(iv,"base64url"));
 dec.setAuthTag(Buffer.from(tag,"base64url"));
 return Buffer.concat([dec.update(Buffer.from(body,"base64url")),dec.final()]).toString("utf8");
}
function stableUuid(value){
 const x=hash("anthos-jj41-sms:"+value);
 return x.slice(0,8)+"-"+x.slice(8,12)+"-4"+x.slice(13,16)+"-a"+
  x.slice(17,20)+"-"+x.slice(20,32);
}
async function sql(path,params={},body=null,method="GET",prefer="return=representation"){
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)throw new Error("SMS pilot database not configured.");
 const u=new URL(storySupabaseBase()+path);
 for(const [k,v] of Object.entries(params))u.searchParams.set(k,String(v));
 const opts={method,headers:{...storySupabaseHeaders(key),Prefer:prefer}};
 if(body!==null)opts.body=JSON.stringify(body);
 const resp=await fetch(u,opts);
 if(!resp.ok)throw new Error("SMS storage unavailable (HTTP "+resp.status+").");
 const data=await resp.json().catch(()=>null);
 return data;
}
function parseInvite(url,origin){
 const u=new URL(String(url||""));
 if(u.origin!==origin||!/^\/pilot-v4\/?$/.test(u.pathname)||u.searchParams.size!==1)
  throw new Error("The SMS invitation must be a same-origin Anthos private pilot link.");
 const token=u.searchParams.get("invite");
 if(!/^[A-Za-z0-9_-]{40,100}$/.test(token||""))throw new Error("Invalid role invitation.");
 return token;
}
// Source of truth: the existing account's optional SMS consent + verified mobile.
// A paid subscription by itself is never treated as SMS consent.
async function eligiblePairs(){
 const rows=await sql("anthos_customer_directory",{
  select:"id,display_name,phone_e164,spouse_phone_e164,group_id,program,record_status,phone_verified_at,sms_consent_at,sms_disclosure_version",
  program:"eq.standard",record_status:"neq.archived",limit:"1000"
 })||[];
 const eligible=rows.filter(x=>UUID.test(x.id||"")&&UUID.test(x.group_id||"")&&
  PHONE.test(x.phone_e164||"")&&x.phone_verified_at&&x.sms_consent_at&&
  String(x.sms_disclosure_version||"").startsWith("anthos-sms-2026-"));
 const choices=[];
 for(const husband of eligible){
  const wife=eligible.find(x=>x.id!==husband.id&&x.group_id===husband.group_id&&
   x.phone_e164===husband.spouse_phone_e164&&
   husband.phone_e164===x.spouse_phone_e164);
  if(!wife)continue;
  const cleanName=x=>String(x.display_name||"Registered spouse").slice(0,60).replace(/[<>]/g,"");
  const last4=x=>String(x.phone_e164).slice(-4);
  choices.push({husbandCustomerId:husband.id,
   label:cleanName(husband)+" (••"+last4(husband)+") coaches Jack · "+
    cleanName(wife)+" (••"+last4(wife)+") coaches Jill",
   husband,wife});
 }
 return choices;
}
export async function listEligiblePilotSmsCouples(){
 // Showing verified contacts in an administrator-only dropdown is independent
 // of whether the provider is currently enabled.
 const choices=await eligiblePairs();
 return {ok:true,enabled:pilotSmsReady(),couples:choices.map(x=>({
  husbandCustomerId:x.husbandCustomerId,label:x.label
 }))};
}
export async function registerPilotSms({origin,roomId,husbandCustomerId,invitations}){
 needConfig();
 if(!UUID.test(roomId||"")||!UUID.test(husbandCustomerId||""))
  throw Object.assign(new Error("Select a valid private episode and a verified couple."),{status:400});
 const choice=(await eligiblePairs()).find(x=>x.husbandCustomerId===husbandCustomerId);
 if(!choice)throw Object.assign(new Error(
  "Both spouses must have verified phone numbers and their own existing Anthos SMS consent."),{status:403});
 const records=await sql("anthos_jj4_rooms",
  {id:"eq."+roomId,select:"id,stage,expires_at,episode",limit:"1"})||[];
 const room=records[0];
 if(!room||room.stage==="retired"||Date.parse(room.expires_at)<=Date.now()||
    room.episode?.authored41?.version!=="4.1.0"||room.episode?.pilotMode!=="shared")
  throw Object.assign(new Error("Select an active two-person Deep Dive 4.1 pilot."),{status:409});
 const values=[];
 for(const [role,person] of [["jack",choice.husband],["jill",choice.wife]]){
  const denied=await sql("anthos_jj41_sms_suppression",
   {phone_e164:"eq."+person.phone_e164,select:"phone_e164",limit:"1"})||[];
  if(denied.length)throw Object.assign(new Error(
   "A spouse has previously opted out of SMS. Update their account-level consent before restarting."),{status:409});
  const token=parseInvite(invitations?.[role],origin);
  const found=await sql("anthos_jj4_participants",{
   room_id:"eq."+roomId,role:"eq."+role,
   token_hash:"eq."+hash(token),select:"id",limit:"1"
  });
  if(!found?.length)throw Object.assign(new Error(
   "One private coaching invitation does not belong to this episode."),{status:403});
  values.push({room_id:roomId,role,customer_id:person.id,
   phone_e164:person.phone_e164,encrypted_token:protectSmsToken(token),
   signup_consent_at:person.sms_consent_at,stopped_at:null,superseded_at:null,
   welcome_sent_at:null,last_sent_scene:-1,last_sent_sophia:false,last_choice_phase:-1});
 }
 // One active SMS episode per phone. Older rooms remain archived and can
 // still be viewed with their browser invitation, but no longer send texts.
 for(const person of [choice.husband,choice.wife]){
  await sql(SESS,{phone_e164:"eq."+person.phone_e164,
   room_id:"neq."+roomId,superseded_at:"is.null"},
   {superseded_at:new Date().toISOString(),updated_at:new Date().toISOString()},"PATCH");
 }
 await sql(SESS,{on_conflict:"room_id,role"},values,
  "POST","resolution=merge-duplicates,return=representation");
 // Authentication of both existing phone numbers happened at signup.
 // No new JOIN, consent checkbox, or verification code is required.
 const names=[choice.husband,choice.wife].map(x=>
  String(x.display_name||"Spouse").trim().split(/\s+/)[0].slice(0,32));
 for(let index=0;index<values.length;index++)
  await join(unprotectSmsToken(values[index].encrypted_token),names[index]||"Spouse");
 await progressRoom(roomId);
 return {ok:true,registered:true,messagesInitiated:true,
  sender:process.env.TELNYX_FROM_NUMBER,
  message:"The verified couple's private Deep Dive 4.1 texts were submitted to Telnyx. STOP remains available at any time; provider acceptance is not proof of handset delivery."};
}
async function sendSms(phone,text){
 needConfig();
 if(!PHONE.test(phone))throw new Error("Invalid recipient phone.");
 const response=await fetch("https://api.telnyx.com/v2/messages",{
  method:"POST",headers:{Authorization:"Bearer "+process.env.TELNYX_API_KEY,
   "Content-Type":"application/json",Accept:"application/json"},
  body:JSON.stringify({from:process.env.TELNYX_FROM_NUMBER,to:phone,text:String(text).slice(0,1150)}),
  signal:AbortSignal.timeout(9000)
 });
 if(!response.ok)throw new Error("Telnyx did not accept the SMS (HTTP "+response.status+").");
 return true; // Provider accepted, not necessarily delivered.
}
function signingKey(){
 const key=String(process.env.TELNYX_PUBLIC_KEY||"").trim();
 const raw=/^[0-9a-f]{64}$/i.test(key)?Buffer.from(key,"hex"):Buffer.from(key,"base64");
 if(raw.length!==32)throw new Error("Invalid Telnyx Ed25519 public key.");
 return createPublicKey({key:Buffer.concat([
  Buffer.from("302a300506032b6570032100","hex"),raw
 ]),format:"der",type:"spki"});
}
export function verifyTelnyxWebhook({body,headers,now=Date.now()}){
 const stamp=headers.get("telnyx-timestamp")||"";
 const sig=headers.get("telnyx-signature-ed25519")||"";
 if(!/^[0-9]{10}$/.test(stamp)||!sig) return false;
 if(Math.abs(now-Number(stamp)*1000)>300000)return false;
 try{return verify(null,Buffer.from(stamp+"|"+body,"utf8"),signingKey(),Buffer.from(sig,"base64"))}
 catch{return false}
}
function lastShared(st){
 const all=(st.scenes||[]).filter(x=>x.kind==="scene");
 return all.at(-1)||null;
}
function latestCharacterReply(st){
 return (st.messages||[]).filter(x=>x.kind==="reply"&&x.phase_index===st.phaseIndex).at(-1)?.body||"";
}
function latestPrompt(st){
 return (st.messages||[]).filter(x=>x.kind==="prompt"&&x.phase_index===st.phaseIndex).at(-1)?.body||"";
}
function smsOptions(st){
 const lines=(st.coachChoices||[]).map((x,i)=>(i+1)+". "+x.label);
 return lines.length?"\n"+lines.join("\n")+"\nReply 1, 2, or 3.":"";
}
async function currentSessions(roomId){
 return await sql(SESS,{room_id:"eq."+roomId,select:"*",order:"role.asc"})||[];
}
async function deliverShared(row,st){
 const scene=lastShared(st);
 if(scene&&row.last_sent_scene<scene.phase_index){
  // Claim before sending; delivery is at-most-once per phase for this small pilot.
  await sql(SESS,{id:"eq."+row.id},{last_sent_scene:scene.phase_index,updated_at:new Date().toISOString()},"PATCH");
  await sendSms(row.phone_e164,"Anthos 4.1 · Scene "+(scene.phase_index+1)+"/6\n"+scene.body);
  row.last_sent_scene=scene.phase_index;
 }
 if(st.stage==="awaiting"&&st.needsReply&&st.coachChoices?.length){
  const prompt=latestPrompt(st);
  if(row.last_choice_phase<st.phaseIndex){
   await sql(SESS,{id:"eq."+row.id},{last_choice_phase:st.phaseIndex,updated_at:new Date().toISOString()},"PATCH");
   await sendSms(row.phone_e164,st.character+" (PRIVATE): "+prompt+smsOptions(st));
   row.last_choice_phase=st.phaseIndex;
  }
 }
 if(st.finished&&st.hasSophia&&!row.last_sent_sophia){
  await sql(SESS,{id:"eq."+row.id},{last_sent_sophia:true,updated_at:new Date().toISOString()},"PATCH");
  const end=(st.scenes||[]).find(x=>x.kind==="sophia")?.body||"";
  await sendSms(row.phone_e164,end.slice(0,1000)+"\nAnthos 4.1 pilot complete. Reply STOP to opt out.");
 }
}
async function progressRoom(roomId){
 const list=await currentSessions(roomId);
 if(list.length!==2||list.some(x=>!x.join_consent_at||x.stopped_at))return false;
 const jack=list.find(x=>x.role==="jack"),jill=list.find(x=>x.role==="jill");
 if(!jack||!jill)return false;
 const jt=unprotectSmsToken(jack.encrypted_token),lt=unprotectSmsToken(jill.encrypted_token);
 for(let i=0;i<4;i++){
  const state=await status(jt);
  if(state.canContinue){
   await advance(jt);
   await deliverShared(jack,await status(jt));
   await deliverShared(jill,await status(lt));
   continue;
  }
  if(state.finished&&!state.hasSophia){
   await sophia(jt);
   await deliverShared(jack,await status(jt));
   await deliverShared(jill,await status(lt));
   continue;
  }
  break;
 }
 await deliverShared(jack,await status(jt));
 await deliverShared(jill,await status(lt));
 return true;
}
async function findActivePhone(phone){
 const matches=await sql(SESS,{phone_e164:"eq."+phone,order:"created_at.desc",limit:"1",select:"*"})||[];
 return matches[0]||null;
}
async function handleReply(row,txt,eventId){
 const token=unprotectSmsToken(row.encrypted_token),st=await status(token);
 if(st.paused){
  if(/^RESUME$/i.test(txt.trim())){await resume(token);await sendSms(row.phone_e164,"Resumed Anthos 4.1.");await progressRoom(row.room_id)}
  else await sendSms(row.phone_e164,"Your pilot is paused. Reply RESUME to continue or STOP to opt out.");
  return;
 }
 if(/^PAUSE$/i.test(txt.trim())){
  await pause(token);await sendSms(row.phone_e164,"Your Anthos 4.1 pilot is paused. Reply RESUME to continue or STOP to opt out.");
  return;
 }
 if(st.finished){await sendSms(row.phone_e164,"This Deep Dive is complete. Your private pilot link remains available in your original invitation.");return}
 if(!st.needsReply){await progressRoom(row.room_id);return}
 if(st.coachChoices.length){
  const match=/^\s*([1-3])\s*$/.exec(txt);
  if(!match){await sendSms(row.phone_e164,"Choose how to coach "+st.character+":"+smsOptions(st));return}
  const selected=st.coachChoices[Number(match[1])-1];
  const result=await choose(token,selected.id,stableUuid(eventId+"-choice"));
  await sendSms(row.phone_e164,st.character+" (PRIVATE): "+latestCharacterReply(result)+
   "\nWhat should "+st.character+" do now? Reply with your own coaching advice.");
  return;
 }
 // The person's own SMS is the free-text private coaching follow-up.
 const result=await coach(token,txt,stableUuid(eventId+"-coach"));
 const reaction=latestCharacterReply(result);
 if(reaction)await sendSms(row.phone_e164,st.character+" (PRIVATE): "+reaction);
 if(result.submitted&&!result.canContinue)
  await sendSms(row.phone_e164,"Your coaching is saved privately. Waiting for your spouse's response.");
 await progressRoom(row.room_id);
}
export async function receivePilotSms({event,raw,headers}){
 needConfig();
 if(!verifyTelnyxWebhook({body:raw,headers}))
  throw Object.assign(new Error("Unverified Telnyx webhook."),{status:401});
 if(event?.data?.event_type!=="message.received")return {ok:true,ignored:true};
 const payload=event?.data?.payload||{};
 const phone=payload.from?.phone_number;
 const target=payload.to?.[0]?.phone_number;
 const message=String(payload.text||"").trim();
 const eventId=String(event.data.id||payload.id||"");
 if(!PHONE.test(phone||"")||target!==process.env.TELNYX_FROM_NUMBER||
  !eventId||eventId.length>160||message.length>900)return {ok:true,ignored:true};
 // Do not store private SMS contents in the event log.
 const claimed=await sql(EVENTS,{on_conflict:"provider_event_id"},
  {provider_event_id:eventId,phone_e164:phone,processing_state:"started"},
  "POST","resolution=ignore-duplicates,return=representation");
 if(!claimed?.length)return {ok:true,duplicate:true};
 const row=await findActivePhone(phone);
 try{
  if(!row){ // Unknown senders never gain a pilot or receive private data.
   await sql(EVENTS,{provider_event_id:"eq."+eventId},{processing_state:"complete"},"PATCH");
   return {ok:true,unknown:true};
  }
  if(/^STOP(?:ALL)?$/i.test(message)){
   await sql(SESS,{phone_e164:"eq."+phone},{stopped_at:new Date().toISOString(),join_consent_at:null},"PATCH");
   await sendSms(phone,"Anthos: You are opted out of this SMS pilot. No further coaching texts will be sent. Reply JOIN to start again.");
  }else if(/^HELP$/i.test(message)){
   await sendSms(phone,"Anthos 4.1 pilot support: anthos.love. Reply JOIN to start, PAUSE to pause, or STOP to opt out. Message and data rates may apply.");
  }else if(/^JOIN$/i.test(message)){
   await sql(SESS,{id:"eq."+row.id},{join_consent_at:new Date().toISOString(),stopped_at:null},"PATCH");
   const token=unprotectSmsToken(row.encrypted_token);
   await join(token,row.role==="jack"?"Husband":"Wife");
   await sendSms(phone,"Anthos Deep Dive 4.1: You're opted in to private fictional character coaching. 6 shared scenes and 4 private coaching turns. Frequency varies, msg & data rates may apply. STOP to cancel, HELP for help.");
   const progressed=await progressRoom(row.room_id);
   if(!progressed)await sendSms(phone,"Waiting for your spouse to text JOIN from their registered phone.");
  }else if(!row.join_consent_at||row.stopped_at){
   await sendSms(phone,"To join the private Anthos Deep Dive 4.1 pilot, reply JOIN. Reply STOP to decline.");
  }else await handleReply(row,message,eventId);
  await sql(EVENTS,{provider_event_id:"eq."+eventId},{processing_state:"complete",updated_at:new Date().toISOString()},"PATCH");
 }catch(e){
  await sql(EVENTS,{provider_event_id:"eq."+eventId},{processing_state:"error",updated_at:new Date().toISOString()},"PATCH").catch(()=>{});
  throw e;
 }
 return {ok:true};
}
