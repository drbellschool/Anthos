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
 // The experimental 4.1 preview is never allowed to silently use the paying
 // customers' database, even when Vercel branch-scoped variables are missing.
 if(env.VERCEL_GIT_COMMIT_REF==="deep-dive/4.1-authored-coaching"&&
    env.VERCEL_ENV==="preview"&&(!String(env.SUPABASE_URL||"").trim()||origin===PRODUCTION_URL||
    env.ANTHOS_QA_STRICT_ISOLATION!=="1"))
  throw new Error("Deep Dive 4.1 preview requires Quality Lab URL and strict isolation.");
 if(env.ANTHOS_QA_STRICT_ISOLATION==="1"){
  if(env.VERCEL_ENV==="production")
   throw new Error("QA isolation cannot be enabled on a production deployment.");
  if(!String(env.SUPABASE_URL||"").trim()||origin===PRODUCTION_URL)
   throw new Error("Quality Lab requires an isolated, nonproduction SUPABASE_URL.");
 }
 return origin+"/rest/v1/";
}
export {PRODUCTION_URL};

/** Legacy JWT keys use Authorization; modern opaque Supabase keys must use apikey only. */
export function storySupabaseHeaders(key){
 const token=String(key||"").trim();
 if(!token)throw new Error("Supabase secret key is required.");
 const headers={apikey:token,"Content-Type":"application/json",Prefer:"return=representation"};
 if(!token.startsWith("sb_secret_")&&!token.startsWith("sb_publishable_"))
  headers.Authorization="Bearer "+token;
 return headers;
}
