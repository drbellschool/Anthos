import {status,join,begin,talk,choose,submit,progress,reflect} from "./jj3-core.mjs";
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers});
export default {async fetch(request){
 if(!["GET","POST"].includes(request.method))return json({error:"Method not allowed."},405);
 const token=request.headers.get("x-anthos-pilot-token")||"";
 try{
  if(request.method==="GET")return json(await status(token));
  if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Invalid request origin."},403);
  if(!(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))return json({error:"JSON required."},400);
  const input=await request.text();if(input.length>2400)return json({error:"Message too long."},413);
  const body=JSON.parse(input);
  if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"Invalid request."},400);
  switch(body.action){
   case "join":return json(await join(token,body.name));
   case "begin":return json(await begin(token));
   case "talk":return json(await talk(token,body.message,body.requestKey));
   case "choose":return json(await choose(token,body.move));
   case "submit":return json(await submit(token));
   case "progress":return json(await progress(token));
   case "reflect":return json(await reflect(token,body.reflection));
   default:return json({error:"Unknown action."},400);
  }
 }catch(e){return json({error:String(e.message||"An unexpected pilot error occurred.").slice(0,240)},e.status||500)}
}};
