// Private, read-only operational metrics. Never expose billing credentials or raw customer data.
const REST="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const nonNegative=n=>{const v=Number(n);return Number.isFinite(v)&&v>=0?v:null;};
async function fetchJson(url,token,headers={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 try{
  const response=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json",...headers},cache:"no-store",signal:controller.signal});
  if(!response.ok)return {ok:false,status:response.status};
  const body=await response.json().catch(()=>null);
  if(!body)return {ok:false,status:502};
  return {ok:true,body};
 }catch{return {ok:false,status:502};}
 finally{clearTimeout(timer)}
}
function period(){
 const now=new Date();
 const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
 return {startSeconds:Math.floor(start.getTime()/1000),endSeconds:Math.floor(Date.now()/1000),
   period:start.toISOString().slice(0,7)};
}
async function couples(){
 const k=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
 if(!k)return {available:false,reason:"Database key missing"};
 const h={apikey:k};
 if(!k.startsWith("sb_secret_"))h.Authorization="Bearer "+k;
 const u=new URL(REST+"anthos_customer_directory");
 u.searchParams.set("select","id,group_id,program,record_status,questionnaire_submitted_at,phone_verified_at");
 u.searchParams.set("record_status","neq.archived");
 u.searchParams.set("group_id","not.is.null");
 u.searchParams.set("limit","1000");
 // Service secret keys authenticate through apikey; legacy keys also use Authorization.
 const result=await fetchJson(u.toString(),k,h);
 if(!result.ok||!Array.isArray(result.body))return {available:false,reason:"Directory unavailable"};
 if(result.body.length===1000)return {available:false,reason:"Count exceeds safe report limit"};
 const groups=new Map();
 for(const row of result.body){
  if(!row.group_id)continue;
  const list=groups.get(row.group_id)||[];list.push(row);groups.set(row.group_id,list);
 }
 let registered=0,verified=0,pilot=0;
 for(const rows of groups.values()){
  if(rows.length!==2||!rows.every(r=>r.questionnaire_submitted_at))continue;
  if(rows.every(r=>r.program==="standard"))registered++;
  else if(rows.every(r=>r.program==="pilot"))pilot++;
  if(rows.every(r=>r.program==="standard"&&r.phone_verified_at))verified++;
 }
 return {available:true,registered,verified,pilot,scope:"Two completed standard profiles in one household; pilot couples excluded"};
}
async function telnyx(){
 const k=(process.env.TELNYX_API_KEY||"").trim();
 if(!k)return {available:false,reason:"Telnyx key missing"};
 const balance=await fetchJson("https://api.telnyx.com/v2/balance",k);
 const result={available:balance.ok,period:period().period,balance:null,availableCredit:null,currency:"USD",
   monthlyCost:null,messages:null,usageStatus:"unavailable"};
 if(balance.ok&&balance.body?.data){
  const d=balance.body.data;
  result.balance=nonNegative(d.balance);
  result.availableCredit=nonNegative(d.available_credit);
  result.currency=typeof d.currency==="string"?d.currency:"USD";
 }else result.reason=balance.status===403?"Account balance permission denied":"Balance not available";
 // Reporting API is separate from the account balance API and may require more permissions.
 const url="https://api.telnyx.com/v2/usage_reports?product=messaging&dimensions=direction&metrics=cost,parts,count&date_range=this_month";
 const usage=await fetchJson(url,k);
 if(usage.ok){
  const raw=usage.body?.data;
  const rows=Array.isArray(raw)?raw:(Array.isArray(raw?.data)?raw.data:null);
  if(rows){
   let cost=0,parts=0,hasCost=false,hasParts=false;
   for(const row of rows){
    const metrics=row.metrics||row;
    const amount=nonNegative(metrics.cost?.value??metrics.cost??metrics.total_cost);
    const qty=nonNegative(metrics.parts??metrics.count??metrics.message_parts);
    if(amount!==null){cost+=amount;hasCost=true;}
    if(qty!==null){parts+=qty;hasParts=true;}
   }
   if(hasCost)result.monthlyCost=cost;
   if(hasParts)result.messages=parts;
   result.usageStatus=hasCost||hasParts?"reported":"unsupported";
  }
 }else result.usageStatus=usage.status===403?"permission_denied":"unavailable";
 return result;
}
async function openai(){
 const k=(process.env.OPENAI_ADMIN_KEY||"").trim(),p=period();
 if(!k)return {available:false,period:p.period,reason:"Add an OpenAI organization admin key to enable billing reports",monthlyCost:null,inputTokens:null,outputTokens:null,requests:null};
 const query="start_time="+p.startSeconds+"&end_time="+p.endSeconds+"&limit=31";
 const [costs,usage]=await Promise.all([
  fetchJson("https://api.openai.com/v1/organization/costs?"+query,k),
  fetchJson("https://api.openai.com/v1/organization/usage/completions?"+query,k)
 ]);
 const result={available:costs.ok||usage.ok,period:p.period,monthlyCost:null,inputTokens:null,
  outputTokens:null,requests:null,scope:"Organization-wide; may include projects outside Anthos"};
 if(costs.ok&&Array.isArray(costs.body?.data)){
  let sum=0,valid=false;
  for(const bucket of costs.body.data)for(const row of bucket.results||[]){
   const amount=Number(row.amount?.value);
   if(Number.isFinite(amount)){sum+=amount;valid=true;}
  }
  if(valid)result.monthlyCost=sum;
 }
 if(usage.ok&&Array.isArray(usage.body?.data)){
  let input=0,output=0,requests=0;
  for(const bucket of usage.body.data)for(const row of bucket.results||[]){
   input+=Number(row.input_tokens)||0;output+=Number(row.output_tokens)||0;
   requests+=Number(row.num_model_requests)||0;
  }
  result.inputTokens=input;result.outputTokens=output;result.requests=requests;
 }
 if(!result.available)result.reason=costs.status===403||usage.status===403?
  "Admin key lacks organization billing permission":"OpenAI usage API unavailable";
 return result;
}
export async function getAdminHomeMetrics(){
 const results=await Promise.allSettled([couples(),telnyx(),openai()]);
 const fallback={available:false,reason:"Temporarily unavailable"};
 return {ok:true,checkedAt:new Date().toISOString(),
  couples:results[0].status==="fulfilled"?results[0].value:fallback,
  telnyx:results[1].status==="fulfilled"?results[1].value:fallback,
  openai:results[2].status==="fulfilled"?results[2].value:fallback};
}
