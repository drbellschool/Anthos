// Restricted Anthos 4.3 QA relay. It is INERT in production and by default.
// The existing server-side OpenAI key never leaves the platform. This is not
// part of the customer app and does not touch Anthos/Supabase records.
import {timingSafeEqual} from "node:crypto";
export const config={maxDuration:60};
function authorized(a,b){
 if(typeof a!=="string"||typeof b!=="string"||b.length<32)return false;
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length&&timingSafeEqual(x,y);
}
export function validAnthosVoiceBody(v){
 if(!v||typeof v!=="object"||Array.isArray(v))return false;
 if(v.store!==false||!Number.isInteger(v.max_output_tokens)||
    v.max_output_tokens<100||v.max_output_tokens>500)return false;
 if(typeof v.instructions!=="string"||!v.instructions.includes("ENTIRE next private SMS")||
    v.instructions.length>12000)return false;
 if(!v.text||v.text.format?.name!=="jj43_full_character_text"||
    v.text.format.type!=="json_schema")return false;
 if(typeof v.input!=="string"||v.input.length>13500)return false;
 try{
  const x=JSON.parse(v.input);
  return ["jack","jill"].includes(x.character)&&
   typeof x.coachMessage==="string"&&x.coachMessage.length<=900&&
   x.factsBefore&&x.factsAfter&&
   Object.hasOwn(x,"verifiedEventThisTurn");
 }catch{return false;}
}
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"method"});
 if(process.env.VERCEL_ENV!=="preview"||
    process.env.ANTHOS_QA_BRIDGE_ENABLED!=="1"||
    !process.env.OPENAI_API_KEY)
  return res.status(404).json({error:"disabled"});
 if(!authorized(req.headers["x-anthos-qa-token"],process.env.ANTHOS_QA_BRIDGE_TOKEN))
  return res.status(403).json({error:"authorization"});
 const body=req.body;
 if(!validAnthosVoiceBody(body))return res.status(400).json({error:"qa-contract"});
 const allowed=new Set([process.env.OPENAI_MODEL,process.env.ANTHOS_JJ_MODEL,
   "gpt-4.1-mini"].filter(Boolean));
 if(!allowed.has(body.model))return res.status(400).json({error:"model-restricted"});
 try{
  const response=await fetch("https://api.openai.com/v1/responses",{
   method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY,
    "Content-Type":"application/json"},
   body:JSON.stringify(body),signal:AbortSignal.timeout(23000)
  });
  const payload=await response.json();
  if(!response.ok)return res.status(response.status).json({
   error:"provider",providerStatus:response.status,
   providerCode:payload?.error?.code||null,
   providerType:payload?.error?.type||null
  });
  return res.status(200).json(payload);
 }catch{return res.status(502).json({error:"upstream-unavailable"});}
}
