// Production-only clock. Vercel supplies the private CRON_SECRET bearer.
import {timingSafeEqual} from "node:crypto";
import {tickActivePilotSms} from "./jj41-sms-core.mjs";
export default {async fetch(request){
 const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
 if(request.method!=="GET")return response({ok:false},405);
 const secret=process.env.CRON_SECRET;
 const expected=Buffer.from("Bearer "+(secret||"")),actual=Buffer.from(request.headers.get("authorization")||"");
 if(process.env.VERCEL_ENV!=="production"||!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))
  return response({ok:false},401);
 try{return response(await tickActivePilotSms())}
 catch{return response({ok:false,error:"Pilot clock unavailable."},503)}
}};
