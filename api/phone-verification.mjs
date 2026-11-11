// One-time phone checks after the existing couple questionnaire.
// All database and Telnyx operations happen server-side. No pilot messaging here.
import {createHash,createHmac,randomBytes,randomInt} from "node:crypto";
import {registrationSmsConfigured,sendRegistrationCode} from "./registration-sms.mjs";

const BASE="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const SHA=value=>createHash("sha256").update(value).digest("hex");
const error=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
function key(){
 const k=process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
 if(!k)error("Registration database is not configured.",503);
 return k;
}
function digest(token,code){
 // A keyed digest prevents offline brute forcing of the six-digit code from a database snapshot.
 const pepper=process.env.THREEFOLD_SESSION_SECRET?.trim()||key();
 if(pepper.length<32)error("Verification signing key is not configured.",503);
 return createHmac("sha256",pepper).update("anthos-phone-verification-v1:"+token+":"+code).digest("hex");
}
function newCode(){return String(randomInt(0,1000000)).padStart(6,"0")}
async function request(path,method,body){
 const k=key(),headers={apikey:k,"Content-Type":"application/json",Accept:"application/json"};
 if(!k.startsWith("sb_secret_"))headers.Authorization="Bearer "+k;
 let response;
 try{
  response=await fetch(BASE+path,{method,headers,cache:"no-store",signal:AbortSignal.timeout(9500),
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
 }catch{error("Registration database is temporarily unavailable.",502)}
 if(!response.ok)error("Registration verification database request failed.",502);
 return response.json().catch(()=>null);
}
function checkToken(token){if(typeof token!=="string"||!TOKEN.test(token))error("Invalid verification session.",404);return token}
const masked=p=>p?("••• ••• "+p.slice(-4)):"your phone";
export async function beginPhoneVerification(customerId,phone){
 // Called only by the successful, server-side signup completion path.
 const token=randomBytes(32).toString("base64url"),code=newCode();
 await request("rpc/anthos_phone_verification_begin","POST",{
  p_customer_id:customerId,p_phone:phone,p_token_hash:SHA(token),p_code_hash:digest(token,code)});
 let sent=false;
 if(registrationSmsConfigured()){
  try{await sendRegistrationCode({to:phone,code});sent=true;}catch{/* No automatic retries: send outcome may be uncertain. */}
 }
 return {required:true,token,maskedPhone:masked(phone),sent,
  available:registrationSmsConfigured(),expiresInMinutes:10,sessionExpiresInHours:24};
}
export async function resendPhoneVerification(token){
 token=checkToken(token);
 if(!registrationSmsConfigured())error("Registration texting is not enabled yet.",503);
 const code=newCode();
 const result=await request("rpc/anthos_phone_verification_resend","POST",
  {p_token_hash:SHA(token),p_code_hash:digest(token,code)});
 if(!result?.ok)error(result?.error||"Another code cannot be requested right now.",429);
 try{await sendRegistrationCode({to:result.phone,code});}
 catch{error("The SMS provider did not confirm delivery. Check Telnyx activity before retrying.",502)}
 return {ok:true,requested:true,maskedPhone:masked(result.phone),expiresInMinutes:10};
}
export async function verifyPhoneCode(token,code){
 token=checkToken(token);
 if(typeof code!=="string"||!/^\d{6}$/.test(code))error("Enter all six digits.",400);
 const result=await request("rpc/anthos_phone_verification_confirm","POST",
  {p_token_hash:SHA(token),p_code_hash:digest(token,code)});
 if(!result?.verified)return {ok:false,verified:false,error:result?.error||"That code is not valid."};
 // This verifies a phone, not an authenticated login or a live customer account.
 return {ok:true,verified:true,message:"Phone verified. Your profile is saved, but account login is not active yet."};
}
export async function phoneVerificationStatus(token){
 token=checkToken(token);
 const path="anthos_phone_verifications?select=phone_e164,code_expires_at,session_expires_at,last_sent_at,verified_at,send_count&token_hash=eq."+SHA(token)+"&limit=1";
 const rows=await request(path,"GET");
 const row=Array.isArray(rows)?rows[0]:null;
 if(!row||Date.parse(row.session_expires_at)<Date.now())error("This verification session has expired.",410);
 return {ok:true,required:true,verified:!!row.verified_at,maskedPhone:masked(row.phone_e164),
  available:registrationSmsConfigured(),canResend:!row.verified_at&&row.send_count<5&&
    Date.now()-Date.parse(row.last_sent_at)>=60000,
  expiresInMinutes:10};
}
