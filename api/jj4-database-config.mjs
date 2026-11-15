// Server-only Supabase endpoint selection for Anthos story APIs.
// QA runs must never silently fall back to production when isolated mode is enabled.
const PRODUCTION_URL="https://kstluxwgrrgdbjyloscb.supabase.co";
function configuredUrl(env={}){
 const value=String(env.SUPABASE_URL||"").trim();
 if(!value)return PRODUCTION_URL;
 let parsed;
 try{parsed=new URL(value)}catch{throw new Error("Invalid SUPABASE_URL configuration.");}
 if(parsed.protocol!=="https:"||!/^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname)||
    parsed.username||parsed.password||parsed.port||parsed.pathname!=="/"||
    parsed.search||parsed.hash||parsed.origin!==value.replace(/\/$/,""))
  throw new Error("SUPABASE_URL must be a bare HTTPS Supabase project origin.");
 return parsed.origin;
}
export function storySupabaseBase(env=process.env){
 const origin=configuredUrl(env);
 if(env.ANTHOS_QA_STRICT_ISOLATION==="1"){
  if(env.VERCEL_ENV==="production")
   throw new Error("QA isolation cannot be enabled on a production deployment.");
  if(!String(env.SUPABASE_URL||"").trim()||origin===PRODUCTION_URL)
   throw new Error("Quality Lab requires an isolated, nonproduction SUPABASE_URL.");
 }
 return origin+"/rest/v1/";
}
export {PRODUCTION_URL};
