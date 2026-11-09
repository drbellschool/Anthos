import {status,join,advance,coach,sophia} from "./jj4-core.mjs";
const HEADERS={"Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(value,statusCode=200)=>new Response(JSON.stringify(value),{status:statusCode,headers:HEADERS});
export default {async fetch(request){
 if(!["GET","POST"].includes(request.method))return json({error:"Method not allowed."},405);
 const token=request.headers.get("x-anthos-v4-invite")||"";
 try{
  if(request.method==="GET")return json(await status(token));
  if(request.headers.get("origin")!==new URL(request.url).origin)
   return json({error:"Request origin mismatch."},403);
  if(!(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))
   return json({error:"JSON required."},400);
  const text=await request.text();
  if(text.length>2400)return json({error:"Message too long."},413);
  const body=JSON.parse(text);
  if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"Invalid request."},400);
  switch(body.action){
   case "join":return json(await join(token,body.name));
   case "advance":return json(await advance(token));
   case "coach":return json(await coach(token,body.message,body.requestKey));
   case "closure":return json(await sophia(token));
   default:return json({error:"Unknown pilot action."},400);
  }
 }catch(e){return json({error:String(e?.message||"The private pilot is temporarily unavailable.").slice(0,220)},e?.status||500)}
}};