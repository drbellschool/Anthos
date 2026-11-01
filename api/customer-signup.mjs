// One-time signup tokens and web consent. Does not send email or SMS.
import {randomBytes,createHash} from "node:crypto";
const BASE="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/anthos_customer_directory";
const FIELDS="id,email,display_name,phone_e164,record_status,signup_token_expires_at,signup_token_consumed_at";
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i,TOKEN=/^[0-9a-f]{64}$/;
const HOLIDAYS=new Set(["valentines","easter","mothers_day","fathers_day","thanksgiving","christmas","new_year","other","none"]);
const fail=(m,c=400)=>{throw Object.assign(new Error(m),{status:c});};
const SHA=s=>createHash("sha256").update(s).digest("hex");
async function db(params,method="GET",body){
 const key=process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!key)fail("Secure customer database is unavailable.",503);
 const url=new URL(BASE);for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
 const headers={apikey:key,"Content-Type":"application/json",Prefer:method==="GET"?"return=representation":"return=representation"};
 if(!key.startsWith("sb_secret_"))headers.Authorization="Bearer "+key;
 let response;try{response=await fetch(url,{method,headers,cache:"no-store",signal:AbortSignal.timeout(9500),
  ...(body===undefined?{}:{body:JSON.stringify(body)})});}catch{fail("Signup service is temporarily unavailable.",502)}
 if(!response.ok)fail("Signup database operation failed.",502);
 const rows=await response.json().catch(()=>[]);
 if(!Array.isArray(rows))fail("Unexpected signup response.",502);
 return rows;
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
 if(typeof raw!=="string"||!/^\\d{4}-\\d{2}-\\d{2}$/.test(raw))fail("Enter a valid "+title+".");
 const d=new Date(raw+"T00:00:00Z");
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==raw||d.getTime()>Date.now())
  fail("Enter a valid "+title+" that is not in the future.");
 return d;
}
function phoneOf(raw){
 if(typeof raw!=="string")fail("Enter your phone number.");
 let number=raw.trim().replace(/[\\s().-]/g,"");
 if(/^\\d{10}$/.test(number))number="+1"+number;
 else if(/^1\\d{10}$/.test(number))number="+"+number;
 if(!/^\\+[1-9]\\d{7,14}$/.test(number))fail("Enter a phone number with country code.");
 return number;
}
export async function createSignupLink({id}={}){
 if(typeof id!=="string"||!UUID.test(id))fail("Select a valid customer.");
 const rows=await db({select:"id,record_status",id:"eq."+id,limit:1});
 if(rows.length!==1||rows[0].record_status==="archived")fail("Active customer not found.",404);
 const token=randomBytes(32).toString("hex"),expiresAt=new Date(Date.now()+72*3600000).toISOString();
 const updated=await db({id:"eq."+id,select:"id"},"PATCH",{
   signup_token_hash:SHA(token),signup_token_expires_at:expiresAt,signup_token_consumed_at:null
 });
 if(updated.length!==1)fail("Unable to create a signup link.",502);
 return {ok:true,link:"https://anthos.love/signup/#t="+token,expiresAt,sent:false,
   message:"Signup link created. Share only with the intended recipient. Nothing has been sent."};
}
export async function previewSignup(token){
 const {row}=await active(token);
 return {ok:true,name:row.display_name,email:row.email,phone:row.phone_e164||"",
    expiresAt:row.signup_token_expires_at};
}
export async function submitSignup(data){
 if(!data||typeof data!=="object"||Array.isArray(data))fail("Invalid signup.");
 const {row,hash}=await active(data.token);
 if(data.adultAgreement!==true||data.privacyAgreement!==true)fail("Age and privacy confirmations are required.");
 const dob=validDate(data.birthDate,"birthday"),wedding=validDate(data.weddingDate,"wedding anniversary");
 const adultCutoff=new Date();adultCutoff.setUTCFullYear(adultCutoff.getUTCFullYear()-18);
 if(dob>adultCutoff)fail("Anthos requires adult participants.");
 if(!Array.isArray(data.holidays)||data.holidays.length>8||
   data.holidays.some(x=>typeof x!=="string"||!HOLIDAYS.has(x))||
   new Set(data.holidays).size!==data.holidays.length||
   (data.holidays.includes("none")&&data.holidays.length>1)||
   data.holidaysReviewed!==true)fail("Please review your meaningful holidays.");
 const phone=phoneOf(data.phone);
 if(data.confirmPhone!==true)fail("Confirm that this is your phone number.");
 const sms=data.smsConsent===true,emails=data.emailConsent===true,now=new Date().toISOString();
 const body={birthday_month_day:data.birthDate.slice(5),wedding_date:data.weddingDate,
  meaningful_holidays:data.holidays,holidays_reviewed_at:now,questionnaire_submitted_at:now,
  phone_e164:phone,phone_owner_attested_at:now,
  sms_consent_at:sms?now:null,sms_disclosure_version:sms?"anthos-sms-2026-11-v1":null,
  email_opt_in_at:emails?now:null,
  signup_token_hash:null,signup_token_expires_at:null,signup_token_consumed_at:now};
 const rows=await db({id:"eq."+row.id,signup_token_hash:"eq."+hash,
   signup_token_consumed_at:"is.null",signup_token_expires_at:"gt."+now,select:"id"},"PATCH",body);
 if(rows.length!==1)fail("This link was already completed. Request another signup link.",409);
 return {ok:true,questionnaireComplete:true,smsConsent:sms?"recorded_unverified":"declined",
   emailConsent:emails?"recorded":"declined",message:"Your answers were saved. Sophia will not text until consent, phone verification, carrier approval and activation are confirmed."};
}
