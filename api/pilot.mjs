import {status,consent,send,ask,propose,accept,reopen,nextMoment,comment,resolveChapter} from "./pilot-core.mjs";
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, max-age=0",
 "X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(data,code=200)=>new Response(JSON.stringify(data),{status:code,headers});
export default {
 async fetch(req){
  if(!["GET","POST"].includes(req.method))return json({error:"Method not allowed."},405);
  const token=req.headers.get("x-anthos-pilot-token")||"";
  try{
   if(req.method==="GET")return json(await status(token));
   if(req.headers.get("origin")!==new URL(req.url).origin)return json({error:"Cross-origin requests are not allowed."},403);
   if(!(req.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))
    return json({error:"JSON required."},400);
   if(Number(req.headers.get("content-length")||0)>2300)return json({error:"Request too large."},413);
   const raw=await req.text();if(raw.length>2300)return json({error:"Request too large."},413);
   const body=JSON.parse(raw);if(!body||typeof body!=="object"||Array.isArray(body))
    return json({error:"Invalid request body."},400);
   const actions={
     consent:()=>consent(token),send:()=>send(token,body.message),
     ask:()=>ask(token),next:()=>nextMoment(token),resolve:()=>resolveChapter(token),comment:()=>comment(token,body),propose:()=>propose(token,body.answer),
     accept:()=>accept(token),reopen:()=>reopen(token)
   };
   if(!Object.hasOwn(actions,body.action))return json({error:"Unknown action."},400);
   return json(await actions[body.action]());
  }catch(e){const code=Number.isInteger(e?.status)&&e.status>=400&&e.status<=599?e.status:502;
   return json({error:e instanceof SyntaxError?"Malformed JSON.":String(e?.message||"Pilot request failed.").slice(0,180)},code)}
 }
};
