import {previewSignup,submitSignup} from "./customer-signup.mjs";
import {phoneVerificationStatus,resendPhoneVerification,verifyPhoneCode} from "./phone-verification.mjs";
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, max-age=0",
 "X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
export default {async fetch(req){
 if(req.method!=="POST")return json({error:"Use the secure signup form."},405);
 if(req.headers.get("origin")!==new URL(req.url).origin)
   return json({error:"Cross-origin requests are blocked."},403);
 if(!(req.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))
   return json({error:"JSON required."},400);
 if(Number(req.headers.get("content-length")||0)>2800)return json({error:"Request too large."},413);
 let data;try{
   const raw=await req.text();if(raw.length>2800)return json({error:"Request too large."},413);
   data=JSON.parse(raw);if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Invalid");
 }catch{return json({error:"Invalid signup request."},400)}
 try{
   if(data.action==="preview")return json(await previewSignup(data.token));
   if(data.action==="submit")return json(await submitSignup(data));
   if(data.action==="verification-status")return json(await phoneVerificationStatus(data.verificationToken));
   if(data.action==="resend-verification")return json(await resendPhoneVerification(data.verificationToken));
   if(data.action==="verify-phone") {
     const result=await verifyPhoneCode(data.verificationToken,data.code);
     return json(result,result.ok?200:422);
   }
   return json({error:"Unknown action."},400);
 }catch(err){
   const status=Number.isInteger(err?.status)?err.status:502;
   return json({error:String(err?.message||"Signup is temporarily unavailable.").slice(0,180)},status);
 }
}};
