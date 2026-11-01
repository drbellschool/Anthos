// Anthos CRM v1. Real, private Supabase contacts; NOT customer authentication or billing.
// Called only from authenticated /api/admin after same-origin CSRF verification.
import {groupIdsFor,summarizeCouples} from "./couple-registration.mjs";
const BASE="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const key=()=>process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||"";
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const columns="id,email,display_name,program,staff_nomination,record_status,group_id,auth_user_id,created_at,updated_at,birthday_month_day,wedding_date,holidays_reviewed_at,questionnaire_submitted_at,phone_e164,phone_owner_attested_at,phone_verified_at,sms_consent_at,email_opt_in_at,spouse_first_name,spouse_phone_e164,special_dates,postal_code";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function nameOf(value){
 if(typeof value!=="string")fail("Enter the customer's name.");
 const name=value.trim().replace(/\s+/g," ");
 if(!name||name.length>80||/[<>\u0000-\u001f]/.test(name))fail("Use a name between 1 and 80 characters.");
 return name;
}
function programOf(x){
 if(!["pilot","standard"].includes(x))fail("Select Pilot or Standard.");
 return x;
}
function statusOf(x){
 if(!["pending","paused","archived"].includes(x))fail("Unsupported customer status.");
 return x;
}
function nominationOf(x){
 if(!["none","admin_pending"].includes(x))fail("Unsupported staff nomination.");
 return x;
}
async function query(table,params={},method="GET",body){
 const secret=key();
 if(!secret)fail("Supabase customer directory is not configured.",503);
 const url=new URL(BASE+table);
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
 const headers={apikey:secret,"Content-Type":"application/json","Accept":"application/json","Prefer":method==="GET"||method==="HEAD"?"count=exact":"return=representation"};
 if(!secret.startsWith("sb_secret_"))headers.Authorization="Bearer "+secret;
 let response;
 try{response=await fetch(url,{method,headers,cache:"no-store",signal:AbortSignal.timeout(9500),
   ...(body===undefined?{}:{body:JSON.stringify(body)})});}
 catch{fail("The private customer database could not be reached.",502);}
 if(!response.ok){
   if(response.status===409||response.status===400&&method==="POST")fail("That email may already be registered. Check the existing customer list.",409);
   fail("Customer database request failed.",502);
 }
 return {rows:method==="HEAD"?[]:await response.json().catch(()=>[]),range:response.headers.get("content-range")||""};
}
function countOf(range){
 const suffix=range.split("/")[1];
 return suffix&&/^\d+$/.test(suffix)?Number(suffix):null;
}
const clean=row=>({
 id:row.id,email:row.email,name:row.display_name,program:row.program,
 staffNomination:row.staff_nomination,status:row.record_status,
 groupId:row.group_id||null,registered:!!row.auth_user_id,
 createdAt:row.created_at,updatedAt:row.updated_at,
 questionnaire:{birthday:!!row.birthday_month_day,wedding:!!row.wedding_date,
   holidays:!!row.holidays_reviewed_at,completed:!!row.questionnaire_submitted_at},
 smsConsent:row.sms_consent_at?"recorded_unverified":"not_recorded",
 phone:row.phone_e164||null,phoneVerified:!!row.phone_verified_at,
 emailConsent:row.email_opt_in_at?"recorded":"not_recorded",emailVerified:false,
 postalCode:row.postal_code||null,
 spousePending:!!row.spouse_phone_e164,spouseFirstName:row.spouse_first_name||null,
 customCelebrationCount:Array.isArray(row.special_dates)?row.special_dates.length:0,
 billingStatus:"not_connected",billingHistory:[],
 flowerStatus:"not_launched",photoBuckets:"not_launched"
});
export async function listCustomers(opts={}){
 const page=Math.max(0,Math.min(10000,Number(opts.page)||0));
 const program=["pilot","standard"].includes(opts.program)?opts.program:null;
 const state=["pending","paused","archived"].includes(opts.status)?opts.status:null;
 const search=String(opts.search||"").trim().slice(0,70);
 if(search&&!/^[\p{L}\p{N} .@'_+-]+$/u.test(search))fail("Search contains unsupported characters.");
 const params={select:columns,order:"created_at.desc",limit:40,offset:page*40};
 if(program)params.program="eq."+program;
 if(state)params.record_status="eq."+state;
 if(search)params.or="(email.ilike.*"+search+"*,display_name.ilike.*"+search+"*)";
 const [result,...counts]=await Promise.all([
   query("anthos_customer_directory",params),
   query("anthos_customer_directory",{select:"id",record_status:"neq.archived"}, "HEAD"),
   query("anthos_customer_directory",{select:"id",program:"eq.pilot",record_status:"neq.archived"},"HEAD"),
   query("anthos_customer_directory",{select:"id",program:"eq.standard",record_status:"neq.archived"},"HEAD"),
   query("anthos_customer_directory",{select:"id",staff_nomination:"eq.admin_pending",record_status:"neq.archived"},"HEAD"),
   query("anthos_customer_directory",{select:"id",questionnaire_submitted_at:"not.is.null",record_status:"neq.archived"},"HEAD"),
   query("anthos_customer_directory",{select:"id",sms_consent_at:"not.is.null",record_status:"neq.archived"},"HEAD"),
   query("anthos_customer_directory",{select:"id",auth_user_id:"not.is.null",record_status:"neq.archived"},"HEAD")
 ]);
 const ids=groupIdsFor(result.rows);
 const groupRows=ids.length?(await query("anthos_customer_directory",{
   select:"id,display_name,group_id,phone_e164,spouse_phone_e164,questionnaire_submitted_at,record_status,phone_verified_at,auth_user_id",
   group_id:"in.("+ids.join(",")+")",limit:200
 })).rows:[];
 const coupleInfo=summarizeCouples(result.rows,groupRows);
 return {ok:true,customers:result.rows.map(r=>({...clean(r),couple:coupleInfo.byId.get(r.id)||{state:"not_started",partnerName:null}})),page,pageSize:40,
   total:countOf(result.range),counts:{all:countOf(counts[0].range),pilot:countOf(counts[1].range),
     standard:countOf(counts[2].range),adminPending:countOf(counts[3].range),
   questionnaire:countOf(counts[4].range),smsOptIns:countOf(counts[5].range),
   accountsLinked:countOf(counts[6].range),registeredCouplesShown:coupleInfo.registeredCouplesShown},
   subscriptionConnected:false,emailInvitationConnected:false,
   explanation:"Standard is a program designation, not proof of payment. Admin candidates have no staff permissions. No email invitations are sent."};
}
export async function editCustomer(input){
 if(!input||!UUID.test(String(input.id||"")))fail("Select an existing customer.");
 const body={};
 if(Object.hasOwn(input,"name"))body.display_name=nameOf(input.name);
 if(Object.hasOwn(input,"program"))body.program=programOf(input.program);
 if(Object.hasOwn(input,"staffNomination"))body.staff_nomination=nominationOf(input.staffNomination);
 if(Object.hasOwn(input,"status"))body.record_status=statusOf(input.status);
 if(Object.hasOwn(input,"postalCode")){
   const postal=String(input.postalCode||"").trim();
   if(postal&&!/^[0-9]{5}(?:-[0-9]{4})?$/.test(postal))fail("Enter a five-digit U.S. ZIP code or ZIP+4.");
   body.postal_code=postal||null;
 }
 if(!Object.keys(body).length)fail("Nothing to change.");
 if(body.staff_nomination==="admin_pending"&&body.program==="pilot")fail("Admin candidates must be Standard.");
 const response=await query("anthos_customer_directory",{id:"eq."+input.id,select:columns},"PATCH",body);
 if(response.rows.length!==1)fail("Customer not found. Refresh the directory.",404);
 return {ok:true,customer:clean(response.rows[0]),message:"Customer record updated. This does not change billing, authentication, SMS or live pilot-room permissions."};
}


// Bounded, server-side couple pagination; only authenticated /api/admin can invoke.
export async function listCoupleRegistrations(opts={}){
 const search=String(opts.search||"").trim().slice(0,80);
 if(search&&!/^[\\p{L}\\p{N} .@'_+()-]+$/u.test(search))fail("Search contains unsupported characters.");
 const page=Number(opts.page??0);
 if(!Number.isSafeInteger(page)||page<0||page>40000)fail("Invalid couple page.");
 const secret=key();
 if(!secret)fail("Private customer database not configured.",503);
 const url=BASE+"rpc/anthos_admin_couple_page";
 const headers={apikey:secret,"Content-Type":"application/json","Accept":"application/json"};
 if(!secret.startsWith("sb_secret_"))headers.Authorization="Bearer "+secret;
 let response;
 try{response=await fetch(url,{method:"POST",headers,cache:"no-store",
   signal:AbortSignal.timeout(9500),
   body:JSON.stringify({p_search:search,p_limit:25,p_offset:page*25})});}
 catch{fail("Couple report is temporarily unavailable.",502);}
 if(!response.ok)fail("Could not retrieve the couple report.",502);
 const result=await response.json().catch(()=>null);
 if(!result||!Array.isArray(result.couples)||!Number.isFinite(result.total))fail("Unexpected couple report response.",502);
 return {ok:true,page,pageSize:25,total:result.total,couples:result.couples,
   counts:{registered:result.registered,pending:result.pending,needingReview:result.needsReview},
   explanation:"Couple registration is not phone verification or mutual account authorization. ZIP is self-reported."};
}
