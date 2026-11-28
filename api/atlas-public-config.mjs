import {storySupabaseBase} from "./jj4-database-config.mjs";
const HEADERS={"Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex"};
export default {async fetch(request){
 if(request.method!=="GET")return new Response(JSON.stringify({error:"Method not allowed"}),
 {status:405,headers:HEADERS});
 const pub=(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||"").trim();
 // Only publish intended public credentials; never expose secret/service keys.
 if(!pub||!(pub.startsWith("sb_publishable_")||pub.split(".").length===3))
  return new Response(JSON.stringify({available:false}),{status:200,headers:HEADERS});
 const origin=new URL(storySupabaseBase()).origin;
 return new Response(JSON.stringify({available:true,authOrigin:origin,publishableKey:pub}),
 {status:200,headers:HEADERS});
}};
