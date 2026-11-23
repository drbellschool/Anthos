// Anthos 4.1 private two-person SMS pilot.
// Enabled only after an approved carrier use case, signed Telnyx inbound
// webhooks and existing separately verified, voluntary registration SMS consent.
import {createHash,randomBytes,createCipheriv,createDecipheriv,createPublicKey,verify,randomUUID} from "node:crypto";
import {storySupabaseBase,storySupabaseHeaders} from "./jj4-database-config.mjs";
import {status,join,advance,choose,coach,sophia,pause,resume,textCharacter} from "./jj4-core.mjs";
import {isOpen43} from "./jj42-conversations.mjs";
export const PILOT_DAY_MS=10*60*1000;
export const timedSchedule43=(start=Date.now())=>Array.from({length:6},(_,i)=>new Date(start+i*PILOT_DAY_MS).toISOString());

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
  {id:"eq."+roomId,select:"id,stage,expires_at,episode,updated_at",limit:"1"})||[];
 const room=records[0];
 const open43=isOpen43(room)&&room.episode?.authored42?.timedPilot===true&&!room.episode.authored42.fastForward;
 if(open43&&!process.env.OPENAI_API_KEY?.trim())
  throw Object.assign(new Error("Real OpenAI provider unavailable; SMS 4.3 pilot cannot start with a scripted fallback."),{status:503});
 if(!room||["retired","complete"].includes(room.stage)||Date.parse(room.expires_at)<=Date.now()||
    (!open43&&room.episode?.authored41?.version!=="4.1.0")||room.episode?.pilotMode!=="shared")
  throw Object.assign(new Error("Select an active two-person 4.1 or timed 4.3 SMS pilot."),{status:409});
 if(open43&&(room.stage!=="needs_scene"||room.episode.authored42.schedule?.length))
  throw Object.assign(new Error("This timed pilot was already started. Continue it in the browser or create a fresh pilot."),{status:409});
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
 let schedule;
 if(open43){
  schedule=timedSchedule43();
  const episode={...room.episode,authored42:{...room.episode.authored42,schedule}};
  const claimed=await sql("anthos_jj4_rooms",{id:"eq."+roomId,stage:"eq.needs_scene",updated_at:"eq."+room.updated_at},{episode,updated_at:new Date().toISOString()},"PATCH");
  if(!claimed?.length)throw Object.assign(new Error("The pilot room changed. Create a fresh pilot."),{status:409});
 }
 await progressRoom(roomId);
 return {ok:true,registered:true,messagesInitiated:true,timedPilot:open43,daySchedule:schedule,
  sender:process.env.TELNYX_FROM_NUMBER,
  message:"The verified couple's private Deep Dive "+(open43?"4.3 (10 minutes per fictional day)":"4.1")+" texts were submitted to Telnyx. STOP remains available at any time; provider acceptance is not proof of handset delivery."};
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
 const scenes=(st.scenes||[]).filter(x=>x.kind==="scene");
 return scenes.reduce((latest,scene)=>!latest||scene.phase_index>latest.phase_index?scene:latest,null);
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
async function claimSms(row,column,value){
 const claimed=await sql(SESS,{id:"eq."+row.id,[column]:row[column]==null?"is.null":"eq."+row[column],stopped_at:"is.null",superseded_at:"is.null"},{[column]:value,updated_at:new Date().toISOString()},"PATCH");
 if(!claimed?.length)return false;
 row[column]=value;return true;
}
async function sendLongSms(phone,message){
 const words=String(message||"").split(/\s+/);let part="";
 for(const word of words){
  if(part&&part.length+word.length+1>1000){await sendSms(phone,part);part="";}
  part+=(part?" ":"")+word;
 }
 if(part)await sendSms(phone,part);
}
async function deliverOpen43(row,st){
 if(row.stopped_at||row.superseded_at||!row.signup_consent_at)return;
 if(!row.welcome_sent_at&&await claimSms(row,"welcome_sent_at",new Date().toISOString())){
  await sendSms(row.phone_e164,"Anthos 4.3 pilot: "+st.character+" is your private fictional friend. Each day lasts 10 minutes; text "+st.character+" whenever you want. You opted in during registration. Reply STOP to opt out, HELP for help. Message/data rates may apply.");
  const opening=(st.scenes||[]).find(x=>x.kind==="introduction")?.body;
  if(opening)await sendLongSms(row.phone_e164,opening);
 }
 const prompt=latestPrompt(st);
 if(prompt&&!st.finished&&row.last_choice_phase<st.phaseIndex&&await claimSms(row,"last_choice_phase",st.phaseIndex))
  await sendSms(row.phone_e164,st.character+" (PRIVATE): "+prompt);
 if(st.finished&&st.hasSophia&&!row.last_sent_sophia&&await claimSms(row,"last_sent_sophia",true)){
  const end=(st.scenes||[]).find(x=>x.kind==="sophia")?.body||"";
  await sendLongSms(row.phone_e164,end+"\nAnthos 4.3 pilot complete. Reply STOP to opt out.");
 }
}
async function deliverShared(row,st){
 if(st.openConversation)return deliverOpen43(row,st);
 if(row.stopped_at||row.superseded_at||!row.signup_consent_at)return;
 if(!row.welcome_sent_at){
  const now=new Date().toISOString();
  await sql(SESS,{id:"eq."+row.id},{welcome_sent_at:now,updated_at:now},"PATCH");
  await sendSms(row.phone_e164,"Anthos Deep Dive 4.1: Your private Jack/Jill coaching adventure is beginning. You opted in during registration. There are 6 story scenes and 4 private coaching choices. Reply STOP to cancel or HELP for help. Frequency varies; message/data rates may apply.");
  row.welcome_sent_at=now;
 }
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
 if(list.length!==2||list.some(x=>!x.signup_consent_at||x.stopped_at||x.superseded_at))return false;
 const jack=list.find(x=>x.role==="jack"),jill=list.find(x=>x.role==="jill");
 if(!jack||!jill)return false;
 const jt=unprotectSmsToken(jack.encrypted_token),lt=unprotectSmsToken(jill.encrypted_token);
 const initial=await status(jt);
 if(initial.openConversation){
  // One real-time check-in per invocation; reply count never drives time.
  if(initial.canContinue)await advance(jt);
  let current=await status(jt);
  if(current.finished&&!current.hasSophia){await sophia(jt);current=await status(jt);}
  await deliverOpen43(jack,current);
  await deliverOpen43(jill,await status(lt));
  return true;
 }
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
export async function tickPilotSms(roomId){
 needConfig();
 if(!UUID.test(roomId||""))throw Object.assign(new Error("Invalid pilot room."),{status:400});
 const [room]=await sql("anthos_jj4_rooms",{id:"eq."+roomId,select:"id,stage,expires_at,episode",limit:"1"})||[];
 if(!room||!isOpen43(room)||!room.episode.authored42.timedPilot||room.episode.authored42.schedule?.length!==6||room.stage==="retired"||Date.parse(room.expires_at)<=Date.now())
  return {ok:true,active:false,finished:false};
 const rows=await currentSessions(roomId);
 if(rows.length!==2||rows.some(r=>r.stopped_at||r.superseded_at||!r.signup_consent_at))
  return {ok:true,active:false,finished:false};
 if(rows.every(r=>r.last_sent_sophia))return {ok:true,active:false,finished:true};
 await progressRoom(roomId);
 const st=await status(unprotectSmsToken(rows.find(r=>r.role==="jack").encrypted_token));
 return {ok:true,active:!st.finished,finished:st.finished,phaseIndex:st.phaseIndex,nextDayAt:st.nextDayAt,paused:!!st.pausedBy?.length};
}
export async function tickActivePilotSms(){
 if(!pilotSmsReady())return {ok:true,active:0};
 const rows=await sql(SESS,{stopped_at:"is.null",superseded_at:"is.null",last_sent_sophia:"eq.false",select:"room_id",limit:"100"})||[];
 const rooms=[...new Set(rows.map(r=>r.room_id))];let active=0,errors=0;
 for(const id of rooms){try{const result=await tickPilotSms(id);if(result.active)active++;}catch{errors++;}}
 return {ok:errors===0,active,errors};
}
async function findActivePhone(phone){
 const matches=await sql(SESS,{phone_e164:"eq."+phone,stopped_at:"is.null",
  superseded_at:"is.null",order:"created_at.desc",limit:"1",select:"*"})||[];
 return matches[0]||null;
}
// Re-send the *current* scene and this recipient's own coaching context when
// carrier delivery drops the original texts. Does not move the episode forward
// or expose the other person's private coaching.
export async function smsRecoveryMessages(st){
 const scene=lastShared(st);
 const out=[];
 if(st.openConversation){
  const own=(st.messages||[]).filter(x=>["prompt","reply"].includes(x.kind)).at(-1)?.body;
  if(own)out.push((st.character||"Your character")+" (PRIVATE RECAP): "+own);
  if(st.finished){const end=(st.scenes||[]).find(x=>x.kind==="sophia")?.body;
   if(end)out.push(end.slice(0,1000));else out.push("Your adventure is complete.");}
  else out.push("You can text "+st.character+" whenever you want during the pilot. PAUSE or STOP are always available.");
  return out;
 }
 if(scene)out.push("Anthos 4.1 · Scene "+(scene.phase_index+1)+"/6 (recap)\n"+scene.body);
 if(st.finished){
  out.push("This Deep Dive has finished. Your previous scene is above.");
 }else if(st.stage==="awaiting"&&st.needsReply){
  if(st.coachChoices?.length){
   out.push((st.character||"Your character")+" (PRIVATE): "+
    (latestPrompt(st)||"How would you coach this character?")+smsOptions(st));
  }else{
   const reply=latestCharacterReply(st);
   out.push((st.character||"Your character")+" (PRIVATE): "+
    (reply||"Your approach was recorded.")+
    "\nReply with your own coaching advice to continue.");
  }
 }else if(st.stage==="flow"){
  out.push("Your coaching is saved. Waiting for the next shared scene.");
 }else{
  out.push("Your episode is still preparing this scene. Please check again shortly.");
 }
 return out;
}
async function resendCurrentSmsContext(row,st){
 for(const message of await smsRecoveryMessages(st))
  await sendSms(row.phone_e164,message);
}
async function handleReply(row,txt,eventId){
 const token=unprotectSmsToken(row.encrypted_token),st=await status(token);
 if(st.paused){
  if(/^RESUME$/i.test(txt.trim())){await resume(token);await sendSms(row.phone_e164,"Resumed Anthos.");await progressRoom(row.room_id)}
  else await sendSms(row.phone_e164,"Your pilot is paused. Reply RESUME to continue or STOP to opt out.");
  return;
 }
 if(/^PAUSE$/i.test(txt.trim())){
  await pause(token);await sendSms(row.phone_e164,"Your Anthos pilot is paused. Reply RESUME to continue or STOP to opt out.");
  return;
 }
 if(/^(?:RECAP|STORY|CONTEXT)$/i.test(txt.trim())){
  await resendCurrentSmsContext(row,st);
  return;
 }
 if(st.finished){await sendSms(row.phone_e164,"This Deep Dive is complete. Your private pilot link remains available in your original invitation.");return}
 if(st.openConversation){
  const pair=await currentSessions(row.room_id);
  if(pair.length!==2||pair.some(x=>x.stopped_at||x.superseded_at||!x.signup_consent_at))return;
  await progressRoom(row.room_id);
  const current=await status(token);
  if(current.finished){await sendSms(row.phone_e164,"This Deep Dive is complete.");return;}
  if(!current.canText){await sendSms(row.phone_e164,"The story is paused or changing days. Please try again shortly.");return;}
  const requestKey=stableUuid(eventId+"-open43");
  const result=await textCharacter(token,txt,requestKey,{requireLiveProvider:true});
  if(result.safetyNotice){await sendSms(row.phone_e164,result.safetyNotice);return;}
  if(result.paused){await sendSms(row.phone_e164,"Your pilot is paused. Reply RESUME to continue or STOP to opt out.");return;}
  const reaction=(result.messages||[]).find(x=>x.kind==="reply"&&String(x.id).includes(requestKey))?.body||latestCharacterReply(result);
  if(reaction)await sendSms(row.phone_e164,result.character+" (PRIVATE): "+reaction);
  return;
 }
 if(!st.needsReply){await progressRoom(row.room_id);return}
 if(st.coachChoices.length){
  const match=/^\s*([1-3])\s*$/.exec(txt);
  if(!match){
   await resendCurrentSmsContext(row,st);
   return;
  }
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
   await sql("anthos_jj41_sms_suppression",{on_conflict:"phone_e164"},
    {phone_e164:phone,stopped_at:new Date().toISOString()},"POST",
    "resolution=merge-duplicates,return=representation");
   await sql(SESS,{phone_e164:"eq."+phone},
    {stopped_at:new Date().toISOString(),updated_at:new Date().toISOString()},"PATCH");
   await sendSms(phone,"Anthos: You're opted out of Deep Dive texts. To restore texts, update your consent through your Anthos account. No more coaching texts will be sent.");
  }else if(/^HELP$/i.test(message)){
   await sendSms(phone,"Anthos Deep Dive: Help at anthos.love. Reply RECAP to repeat your current scene and private coaching instructions, PAUSE/RESUME to control your experience, or STOP to opt out. Message/data rates may apply.");
  }else if(!row.signup_consent_at||row.stopped_at||row.superseded_at){
   // Never use texting as a back door around verified registration or STOP.
   return {ok:true,blocked:true};
  }else await handleReply(row,message,eventId);
  await sql(EVENTS,{provider_event_id:"eq."+eventId},{processing_state:"complete",updated_at:new Date().toISOString()},"PATCH");
 }catch(e){
  await sql(EVENTS,{provider_event_id:"eq."+eventId},{processing_state:"error",updated_at:new Date().toISOString()},"PATCH").catch(()=>{});
  throw e;
 }
 return {ok:true};
}
