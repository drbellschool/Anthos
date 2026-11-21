import {pilotSmsReady,receivePilotSms} from "./jj41-sms-core.mjs";
const HEAD={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",
 "X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const response=(status,data)=>new Response(JSON.stringify(data),{status,headers:HEAD});
export default {async fetch(request){
 if(request.method!=="POST")return response(405,{error:"Method not allowed."});
 if(!pilotSmsReady())return response(503,{error:"Anthos 4.1 inbound SMS is not enabled."});
 const raw=await request.text();
 if(raw.length>32768)return response(413,{error:"Event too large."});
 let event;
 try{event=JSON.parse(raw)}catch{return response(400,{error:"Malformed event."})}
 try{
  const result=await receivePilotSms({event,raw,headers:request.headers});
  return response(200,result);
 }catch(err){
  // Do not return private coaching text or provider secrets in webhook errors.
  return response(err?.status===401?401:503,{error:err?.status===401?"Invalid Telnyx signature.":"SMS event could not be processed."});
 }
}};
