// Private Anthos home: verified Supabase email sessions and server-authorized customer data.
// Signup records are NEVER linked by unverified email. No service-role key reaches the browser.
const SUPABASE_URL='https://kstluxwgrrgdbjyloscb.supabase.co';
const PUB=process.env.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_RXf72sppgteSeY-RYAU3dA_N4y69gNy';
const SECRET=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const REDIRECT=process.env.ANTHOS_AUTH_REDIRECT_URL||'https://anthos.love/dashboard/';
const ACCESS='__Host-anthos_couple_access',REFRESH='__Host-anthos_couple_refresh';
const EMAIL=/^[^\s@<>]{1,100}@[^\s@<>]{1,150}\.[^\s@<>]{2,30}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
function headers(res){res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Vary','Cookie');}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(v=>v.trim().split(/=(.*)/s).slice(0,2)));}
function sessionCookies(res,data){const opt='Path=/; Secure; HttpOnly; SameSite=Lax';res.setHeader('Set-Cookie',[ACCESS+'='+encodeURIComponent(data.access_token)+'; '+opt+'; Max-Age='+Math.min(3600,Number(data.expires_in)||3600),REFRESH+'='+encodeURIComponent(data.refresh_token)+'; '+opt+'; Max-Age=2592000']);}
function clear(res){res.setHeader('Set-Cookie',[ACCESS+'=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0',REFRESH+'=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0']);}
async function auth(path,opts={}){const r=await fetch(SUPABASE_URL+'/auth/v1/'+path,{...opts,headers:{apikey:PUB,'Content-Type':'application/json',...(opts.headers||{})},cache:'no-store',signal:AbortSignal.timeout(9000)});return {ok:r.ok,status:r.status,data:await r.json().catch(()=>({}))};}
async function userFromCookie(req,res){
 const c=cookies(req),token=c[ACCESS]?decodeURIComponent(c[ACCESS]):'';
 if(token){const x=await auth('user',{headers:{Authorization:'Bearer '+token}});if(x.ok&&UUID.test(x.data.id||''))return x.data;}
 const refresh=c[REFRESH]?decodeURIComponent(c[REFRESH]):'';
 if(refresh){const x=await auth('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:refresh})});if(x.ok&&x.data.access_token&&x.data.refresh_token){sessionCookies(res,x.data);const y=await auth('user',{headers:{Authorization:'Bearer '+x.data.access_token}});if(y.ok&&UUID.test(y.data.id||''))return y.data;}}
 clear(res);return null;
}
async function select(table,columns,filters){
 if(!SECRET)return null;
 const u=new URL(SUPABASE_URL+'/rest/v1/'+table);u.searchParams.set('select',columns);
 Object.entries(filters).forEach(([k,v])=>u.searchParams.set(k,v));
 const h={apikey:SECRET,Accept:'application/json'};
 if(!SECRET.startsWith('sb_secret_'))h.Authorization='Bearer '+SECRET;
 const r=await fetch(u,{headers:h,cache:'no-store',signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error('Private data service unavailable');
 return r.json();
}
function progress(rows){
 const byStory=new Map();
 for(const row of rows||[]){if(typeof row.story_key!=='string')continue;
  const value=Math.max(0,Math.min(8,Number(row.completed)||0)),old=byStory.get(row.story_key);
  if(!old||old.date<(row.updated_at||''))byStory.set(row.story_key,{value,date:row.updated_at||''});
 }
 return Math.min(96,[...byStory.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).reduce((n,x)=>n+x.value,0));
}
async function dataFor(user){
 const year=new Date().getUTCFullYear();
 const profiles=await select('anthos_customer_directory','id,first_name,spouse_first_name,auth_user_id,record_status',{auth_user_id:'eq.'+user.id,record_status:'neq.archived',limit:'1'});
 if(!profiles?.length)return {authenticated:true,linked:false,firstName:null,checkpoints:0,year};
 const rows=await select('deep_dive_progress','story_key,story_version,completed,updated_at',{participant_id:'eq.'+user.id,updated_at:'gte.'+year+'-01-01T00:00:00Z',limit:'100'});
 return {authenticated:true,linked:true,firstName:profiles[0].first_name||null,spouseFirstName:profiles[0].spouse_first_name||null,checkpoints:progress(rows),year,source:'recorded-deep-dive-progress'};
}
export default async function handler(req,res){
 headers(res);
 try{
  if(req.method==='GET'){
   const user=await userFromCookie(req,res);
   if(!user)return res.status(401).json({authenticated:false});
   return res.status(200).json(await dataFor(user));
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const origin=req.headers.origin;
  if(origin&&new URL(origin).host!==req.headers.host)return res.status(403).json({error:'Invalid origin'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(body.action==='login'){
   const email=String(body.email||'').trim().toLowerCase();
   if(!EMAIL.test(email))return res.status(400).json({error:'Enter a valid email address.'});
   const redirect=new URL(REDIRECT);
   if(redirect.protocol!=='https:'||!(['anthos.love','www.anthos.love'].includes(redirect.hostname)||redirect.hostname.endsWith('.vercel.app')))throw Error('Invalid auth redirect');
   const x=await auth('otp?redirect_to='+encodeURIComponent(redirect.toString()),{method:'POST',body:JSON.stringify({email,create_user:true})});
   if(!x.ok)return res.status(429).json({error:'Could not send a sign-in link. Check your email or try again shortly.'});
   return res.status(200).json({ok:true,message:'Check your email for your private sign-in link.'});
  }
  if(body.action==='establish'){
   const access=String(body.access_token||''),refresh=String(body.refresh_token||'');
   if(!access||!refresh||access.length>5000||refresh.length>5000)return res.status(400).json({error:'Invalid sign-in session'});
   const x=await auth('user',{headers:{Authorization:'Bearer '+access}});
   if(!x.ok||!UUID.test(x.data.id||''))return res.status(401).json({error:'Sign-in link expired. Request another.'});
   sessionCookies(res,{access_token:access,refresh_token:refresh,expires_in:Number(body.expires_in)||3600});
   return res.status(200).json({ok:true});
  }
  if(body.action==='logout'){clear(res);return res.status(200).json({ok:true});}
  return res.status(400).json({error:'Unknown action'});
 }catch(error){console.error('couple home:',error?.message||'error');return res.status(503).json({error:'Anthos account service is temporarily unavailable.'});}
}
