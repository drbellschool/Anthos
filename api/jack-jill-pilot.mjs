import {status,consent,talk,submit,reflect,begin} from "./jack-jill-pilot-core.mjs";
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(x,c=200)=>new Response(JSON.stringify(x),{status:c,headers});
export default {async fetch(req){
 if(!["GET","POST"].includes(req.method))return json({error:"Method not allowed."},405);
 const token=req.headers.get("x-anthos-pilot-token")||"";
 try{
  if(req.method==="GET")return json(await status(token));
  if(req.headers.get("origin")!==new URL(req.url).origin)return json({error:"Cross-origin request blocked."},403);
  if(!(req.headers.get("content-type")||"").startsWith("application/json"))return json({error:"JSON required."},400);
  const raw=await req.text();if(raw.length>2400)return json({error:"Request too large."},413);
  const body=JSON.parse(raw);
  if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"Invalid body."},400);
  if(body.action==="consent")return json(await consent(token,body.name));
  if(body.action==="talk")return json(await talk(token,body.message));
  if(body.action==="begin")return json(await begin(token));
  if(body.action==="submit")return json(await submit(token));
  if(body.action==="reflect")return json(await reflect(token,body.reflection));
  return json({error:"Unknown action."},400);
 }catch(e){return json({error:String(e.message||"Pilot error").slice(0,220)},e.status||500)}
}};
