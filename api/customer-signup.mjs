// One-time signup tokens and web consent. Does not send email or SMS.
import {randomBytes,createHash} from "node:crypto";
const BASE="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const FIELDS="id,email,display_name,phone_e164,record_status,signup_token_expires_at,signup_token_consumed_at";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,TOKEN=/^(?:[a-zA-Z0-9_-]{16}|[0-9a-f]{64})$/;
const HOLIDAYS=new Set(["valentines","easter","mothers_day","fathers_day","thanksgiving","christmas","new_year","other","none"]);
const fail=(m,c=400)=>{throw Object.assign(new Error(m),{status:c});};
const SHA=s=>createHash("sha256").update(s).digest("hex");
async function db(params,method="GET",body,table="anthos_customer_directory"){
 const key=process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!key)fail("Secure customer database is unavailable.",503);
 const url=new URL(BASE+table);for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
 const headers={apikey:key,"Content-Type":"application/json",Prefer:method==="GET"?"return=representation":"return=representation"};
 if(!key.startsWith("sb_secret_"))headers.Authorization="Bearer "+key;
 let response;try{response=await fetch(url,{method,headers,cache:"no-store",signal:AbortSignal.timeout(9500),
  ...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{fail("Signup service is temporarily unavailable.",502)}
 if(!response.ok)fail("Signup database operation failed.",502);
 const rows=await response.json().catch(()=>[]);
 if(!Array.isArray(rows))fail("Unexpected signup response.",502);
 return rows;
}
async function findNewInvite(token){
 const hash=hashToken(token);
 const rows=await db({select:"token_hash,expires_at,redeemed_at,invited_by_customer_id",token_hash:"eq."+hash,limit:1},
   "GET",undefined,"anthos_signup_invitations");
 if(!rows.length)return null;
 if(rows[0].redeemed_at||Date.parse(rows[0].expires_at)<=Date.now())
   fail("This invitation has expired or already been used.",410);
 return {hash,expiresAt:rows[0].expires_at,invitedByCustomerId:rows[0].invited_by_customer_id||null};
}
// Share only marriage-level dates and the recipient's invited details.
// Never put the inviter's DOB, email, private notes, or SMS consent in a preview.
async function partnerReview(invite){
 if(!invite.invitedByCustomerId)return null;
 const records=await db({
   select:"id,first_name,last_name,spouse_first_name,spouse_last_name,spouse_phone_e164,phone_e164,wedding_date,meaningful_holidays,special_dates,record_status",
   id:"eq."+invite.invitedByCustomerId,limit:1
 });
 const person=records[0];
 if(!person||person.record_status==="archived"||!person.phone_e164||
    !person.spouse_phone_e164||!person.spouse_first_name||!person.spouse_last_name)
   fail("This partner invitation needs to be reissued by your spouse.",410);
 return {
   partnerName:person.first_name||"Your spouse",
   firstName:person.spouse_first_name,
   lastName:person.spouse_last_name,
   phone:person.spouse_phone_e164,
   weddingDate:person.wedding_date||"",
   holidays:Array.isArray(person.meaningful_holidays)?person.meaningful_holidays:[],
   specialDates:Array.isArray(person.special_dates)?person.special_dates.slice(0,5):[],
   // Server-only values; intentionally omitted from the public preview response.
   inviterFirstName:person.first_name||"",
   inviterLastName:person.last_name||"",
   inviterPhone:person.phone_e164
 };
}
export async function createOpenSignupLink(){
 const token=randomBytes(12).toString("base64url"),expiresAt=new Date(Date.now()+72*3600000).toISOString();
 const rows=await db({}, "POST",{token_hash:SHA(token),expires_at:expiresAt,program:"pilot"},
   "anthos_signup_invitations");
 if(rows.length!==1)fail("Could not create the signup invitation.",502);
 return {ok:true,link:"https://anthos.love/signup/#t="+token,expiresAt,sent:false,
   message:"Signup invitation ready. No customer record exists until the recipient completes the form. Nothing has been sent."};
}

async function redeemNewSignup(input,hash,fields,isSpouseInvite=false){
 const secret=process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!secret)fail("Signup database is not configured.",503);
 const first=String(input.firstName||"").trim().replace(/\s+/g," ");
 const last=String(input.lastName||"").trim().replace(/\s+/g," ");
 const email=String(input.email||"").trim().toLowerCase();
 if(!first||!last||first.length>60||last.length>60||/[<>\u0000-\u001f]/.test(first+last))
  fail("Enter your first and last name.");
 if(email.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))fail("Enter a valid email.");
 const spouseFirst=String(input.spouseFirstName||"").trim().replace(/\s+/g," ");
 const spouseLast=String(input.spouseLastName||"").trim().replace(/\s+/g," ");
 const spousePhone=String(input.spousePhone||"").trim();
 if(!spouseFirst||!spouseLast||!spousePhone)fail("Your spouse's first name, last name and mobile number are required.");
 if(spouseFirst.length>60||spouseLast.length>60||/[<>\u0000-\u001f]/.test(spouseFirst+spouseLast))
   fail("Enter a valid spouse first and last name.");
 const partner=phoneOf(spousePhone);
 if(partner===fields.phone_e164)fail("You and your spouse need separate mobile numbers.");
 const rawToken=isSpouseInvite?null:randomBytes(12).toString("base64url");
 const url=BASE+"rpc/anthos_redeem_signup_v3";
 const headers={apikey:secret,"Content-Type":"application/json",Accept:"application/json"};
 if(!secret.startsWith("sb_secret_"))headers.Authorization="Bearer "+secret;
 let response;
 try{response=await fetch(url,{method:"POST",headers,cache:"no-store",signal:AbortSignal.timeout(9500),
  body:JSON.stringify({p_token_hash:hash,p_first_name:first,p_last_name:last,p_email:email,
   p_birth_date:fields.birth_date,p_wedding_date:fields.wedding_date,
   p_holidays:fields.meaningful_holidays,p_special_dates:fields.special_dates,
   p_phone:fields.phone_e164,p_spouse_first_name:spouseFirst,p_spouse_last_name:spouseLast,
   p_spouse_phone:partner,p_partner_token_hash:rawToken?SHA(rawToken):null,
   p_sms_consent:input.smsConsent===true,
   p_disclosure:input.smsConsent===true?"anthos-sms-2026-11-v1":null})});}
 catch{fail("Signup service is temporarily unavailable.",502);}
 if(!response.ok){
  let reason={};try{reason=await response.json();}catch{}
  if(reason.code==="23505")fail("This signup conflicts with an existing account. Please contact Anthos.",409);
  if(reason.code==="22023")fail("Check your information or request a fresh invitation.",400);
  fail("Unable to save your signup. Please try again.",502);
 }
 const result=await response.json().catch(()=>null);
 const id=result?.customerId;
 if(typeof id!=="string"||!UUID.test(id))fail("Signup may have saved, but confirmation is unavailable. Contact Anthos.",502);
 return {customerId:id,partnerLink:rawToken?"https://anthos.love/signup/#t="+rawToken:null,
  spouseName:spouseFirst};
}
function hashToken(token){if(typeof token!=="string"||!TOKEN.test(token))fail("Invalid signup link.",404);return SHA(token);}
async function active(token){
 const hash=hashToken(token),rows=await db({select:FIELDS,signup_token_hash:"eq."+hash,
   signup_token_consumed_at:"is.null",record_status:"neq.archived",limit:1});
 const row=rows[0];
 if(!row||!row.signup_token_expires_at||Date.parse(row.signup_token_expires_at)<=Date.now())
  fail("This link has expired or already been used. Ask Anthos for a fresh signup link.",410);
 return {row,hash};
}
function validDate(raw,title){
 if(typeof raw!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(raw))fail("Enter a valid "+title+".");
 const d=new Date(raw+"T00:00:00Z");
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==raw||d.getTime()>Date.now())
  fail("Enter a valid "+title+" that is not in the future.");
 return d;
}
function phoneOf(raw){
 if(typeof raw!=="string")fail("Enter your phone number.");
 let number=raw.trim().replace(/[\s().-]/g,"");
 if(/^\d{10}$/.test(number))number="+1"+number;
 else if(/^1\d{10}$/.test(number))number="+"+number;
 if(!/^\+[1-9]\d{7,14}$/.test(number))fail("Enter a valid 10-digit U.S. mobile phone number (no +1 needed), or a full international number.");
 return number;
}
export async function createSignupLink({id}={}){
 if(typeof id!=="string"||!UUID.test(id))fail("Select a valid customer.");
 const rows=await db({select:"id,record_status",id:"eq."+id,limit:1});
 if(rows.length!==1||rows[0].record_status==="archived")fail("Active customer not found.",404);
 const token=randomBytes(12).toString("base64url"),expiresAt=new Date(Date.now()+72*3600000).toISOString();
 const updated=await db({id:"eq."+id,select:"id"},"PATCH",{
   signup_token_hash:SHA(token),signup_token_expires_at:expiresAt,signup_token_consumed_at:null
 });
 if(updated.length!==1)fail("Unable to create a signup link.",502);
 return {ok:true,link:"https://anthos.love/signup/#t="+token,expiresAt,sent:false,
   message:"Signup link created. Share only with the intended recipient. Nothing has been sent."};
}
export async function previewSignup(token){
 const fresh=await findNewInvite(token);
 if(fresh){
   const couple=await partnerReview(fresh);
   if(couple)return {ok:true,mode:"partner",name:couple.firstName+" "+couple.lastName,
     firstName:couple.firstName,lastName:couple.lastName,phone:couple.phone,
     invitedBy:couple.partnerName,weddingDate:couple.weddingDate,holidays:couple.holidays,
     specialDates:couple.specialDates,expiresAt:fresh.expiresAt};
   return {ok:true,mode:"new",name:"",email:"",phone:"",expiresAt:fresh.expiresAt};
 }
 const {row}=await active(token);
 return {ok:true,mode:"existing",name:row.display_name,email:row.email,phone:row.phone_e164||"",
    expiresAt:row.signup_token_expires_at};
}
export async function submitSignup(data){
 if(!data||typeof data!=="object"||Array.isArray(data))fail("Invalid signup.");
 const fresh=await findNewInvite(data.token);
 const legacy=fresh?null:await active(data.token);
 const row=legacy?.row,hash=legacy?.hash;
 if(data.adultAgreement!==true||data.marriageAgreement!==true||data.privacyAgreement!==true)fail("Confirm adulthood, legal marriage and the privacy terms.");
 const dob=validDate(data.birthDate,"birthday"),wedding=validDate(data.weddingDate,"wedding anniversary");
 const adultCutoff=new Date();adultCutoff.setUTCFullYear(adultCutoff.getUTCFullYear()-18);
 if(dob>adultCutoff)fail("Anthos requires adult participants.");
 if(!Array.isArray(data.holidays)||data.holidays.length>8||
   data.holidays.some(x=>typeof x!=="string"||!HOLIDAYS.has(x))||
   new Set(data.holidays).size!==data.holidays.length||
   (data.holidays.includes("none")&&data.holidays.length>1))fail("Review your celebration preferences.");
 const dates=Array.isArray(data.specialDates)?data.specialDates:[];
 if(dates.length>5)fail("Add up to five personal celebrations.");
 for(const event of dates){
  if(!event||typeof event!=="object"||Array.isArray(event))fail("Invalid special date.");
  const label=String(event.label||"").trim();
  if(!label||label.length>80||/[<>\u0000-\u001f]/.test(label))fail("Describe each special date in 80 characters or fewer.");
  if(typeof event.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(event.date)||
     !Number.isFinite(new Date(event.date+"T00:00:00Z").getTime())||
     new Date(event.date+"T00:00:00Z").toISOString().slice(0,10)!==event.date)
    fail("Enter a real calendar date for each celebration.");
 }
 const phone=phoneOf(data.phone);
 if(data.confirmPhone!==true)fail("Confirm that this is your phone number.");
 const sms=data.smsConsent===true,now=new Date().toISOString();
 const body={birth_date:data.birthDate,birthday_month_day:data.birthDate.slice(5),wedding_date:data.weddingDate,
  meaningful_holidays:data.holidays,holidays_reviewed_at:now,special_dates:dates,questionnaire_submitted_at:now,
  phone_e164:phone,phone_owner_attested_at:now,
  sms_consent_at:sms?now:null,sms_disclosure_version:sms?"anthos-sms-2026-11-v1":null,
  signup_token_hash:null,signup_token_expires_at:null,signup_token_consumed_at:now};
 if(fresh){
   const couple=await partnerReview(fresh);
   // Trust the linked person's own stored identity, never client-supplied fields.
   // This closes a route for redirecting a partner invite to a different household.
   const complete=await redeemNewSignup(couple?{
     ...data,
     spouseFirstName:couple.inviterFirstName,
     spouseLastName:couple.inviterLastName,
     spousePhone:couple.inviterPhone
   }:data,fresh.hash,body,!!couple);
   return {ok:true,questionnaireComplete:true,partnerInviteLink:complete.partnerLink,spouseFirstName:complete.spouseName,
     smsConsent:sms?"recorded_unverified":"declined",
     message:"Your completed signup is saved. Sophia will not text until phone verification, carrier approval and activation are confirmed."};
 }
 // Legacy re-invitations also need spouse details, even though they do not create a new couple.
 const spouseFirst=String(data.spouseFirstName||"").trim();
 const spouseLast=String(data.spouseLastName||"").trim();
 const spouseNumber=phoneOf(String(data.spousePhone||""));
 if(!spouseFirst||!spouseLast||spouseFirst.length>60||spouseLast.length>60||
    /[<>\u0000-\u001f]/.test(spouseFirst+spouseLast)||spouseNumber===phone)
   fail("Enter your spouse's first name, last name and separate mobile number.");
 body.spouse_first_name=spouseFirst;
 body.spouse_last_name=spouseLast;
 body.spouse_phone_e164=spouseNumber;
 const rows=await db({id:"eq."+row.id,signup_token_hash:"eq."+hash,
   signup_token_consumed_at:"is.null",signup_token_expires_at:"gt."+now,select:"id"},"PATCH",body);
 if(rows.length!==1)fail("This link was already completed. Request another signup link.",409);
 return {ok:true,questionnaireComplete:true,smsConsent:sms?"recorded_unverified":"declined",
   message:"Your answers were saved. Sophia will not text until consent, phone verification, carrier approval and activation are confirmed."};
}
