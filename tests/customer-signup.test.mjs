import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createSignupLink,createOpenSignupLink,previewSignup,submitSignup} from "../api/customer-signup.mjs";
import signupApi from "../api/signup.mjs";
const id="85a6498d-a3c0-45fa-98dc-fba73accd9d7";
const prev=process.env.SUPABASE_SECRET_KEY,oldFetch=globalThis.fetch;
test.after(()=>{
 globalThis.fetch=oldFetch;
 if(prev===undefined)delete process.env.SUPABASE_SECRET_KEY;
 else process.env.SUPABASE_SECRET_KEY=prev;
});
function mock(){
 process.env.SUPABASE_SECRET_KEY="sb_secret_test_no_real_data";
 let saved={id,email:"sample@example.test",display_name:"Sample Participant",
  phone_e164:null,record_status:"pending",signup_token_hash:null,signup_token_consumed_at:null,signup_token_expires_at:null};
 const requests=[];
 globalThis.fetch=async(url,init)=>{
   assert.match(String(url),/supabase.co\/rest\/v1\/anthos_customer_directory/);
   assert.equal(init.headers.apikey,"sb_secret_test_no_real_data");
   const u=new URL(url);requests.push({method:init.method,query:u.searchParams,body:init.body?JSON.parse(init.body):null});
   if(init.method==="GET"){
     if(u.searchParams.has("signup_token_hash")&&(saved.signup_token_hash!==u.searchParams.get("signup_token_hash").slice(3)||saved.signup_token_consumed_at))return new Response("[]",{status:200});
     return new Response(JSON.stringify([saved]),{status:200});
   }
   const payload=JSON.parse(init.body);
   if(u.searchParams.has("signup_token_hash") &&
     (saved.signup_token_hash!==u.searchParams.get("signup_token_hash").slice(3)||saved.signup_token_consumed_at))
     return new Response("[]",{status:200});
   saved={...saved,...payload};
   return new Response(JSON.stringify([saved]),{status:200});
 };
 return {get saved(){return saved},requests};
}
const data={birthDate:"1990-04-20",weddingDate:"2010-05-12",
 holidays:["valentines","christmas"],holidaysReviewed:true,phone:"(903) 555-1234",
 confirmPhone:true,smsConsent:true,emailConsent:false,adultAgreement:true,privacyAgreement:true};
test("Secure 72-hour single-use links are generated, hashed at rest and do not send messages",async()=>{
 const m=mock();
 const invite=await createSignupLink({id});
 assert.match(invite.link,/https:\/\/anthos\.love\/signup\/#t=[0-9a-f]{64}$/);
 assert.equal(invite.sent,false);
 const token=invite.link.split("#t=")[1];
 assert.equal(m.saved.signup_token_hash.length,64);
 assert.notEqual(m.saved.signup_token_hash,token);
 assert.equal(m.requests.length,2);
 assert.ok(m.requests.every(q=>q.method==="GET"||q.method==="PATCH"));
 assert.ok(Date.parse(invite.expiresAt)>Date.now());
 const preview=await previewSignup(token);
 assert.equal(preview.email,"sample@example.test");
 assert.equal(preview.phone,"");
 const result=await submitSignup({action:"submit",token,...data});
 assert.equal(result.questionnaireComplete,true);
 assert.equal(result.smsConsent,"recorded_unverified");
 assert.equal(result.emailConsent,"declined");
 assert.equal(m.saved.phone_e164,"+19035551234");
 assert.equal(m.saved.birthday_month_day,"04-20");
 assert.equal(m.saved.wedding_date,"2010-05-12");
 assert.equal(m.saved.sms_disclosure_version,"anthos-sms-2026-11-v1");
 assert.equal(m.saved.signup_token_hash,null);
 await assert.rejects(()=>previewSignup(token),/expired or already been used/);
});
test("No consent is inferred when text and email boxes are unchecked",async()=>{
 const m=mock(),link=await createSignupLink({id}),token=link.link.split("#t=")[1];
 const res=await submitSignup({...data,token,smsConsent:false,emailConsent:false});
 assert.equal(res.smsConsent,"declined");assert.equal(m.saved.sms_consent_at,null);
 assert.equal(m.saved.email_opt_in_at,null);assert.equal(m.saved.phone_e164,"+19035551234");
});
test("Minor, malformed dates, unconfirmed phone and invalid holiday choices are rejected before storage",async()=>{
 const m=mock(),link=await createSignupLink({id}),token=link.link.split("#t=")[1];
 const count=()=>m.requests.filter(x=>x.method==="PATCH"&&x.query.has("signup_token_hash")).length;
 await assert.rejects(()=>submitSignup({...data,token,birthDate:"2015-04-20"}),/adult/);
 await assert.rejects(()=>submitSignup({...data,token,weddingDate:"2020-02-30"}),/valid/);
 await assert.rejects(()=>submitSignup({...data,token,confirmPhone:false}),/Confirm/);
 await assert.rejects(()=>submitSignup({...data,token,holidays:["none","christmas"]}),/holidays/);
 await assert.rejects(()=>submitSignup({...data,token,phone:"not-a-number"}),/phone/);
 assert.equal(count(),0);
});
test("Signup API enforces same-origin and non-GET requests",async()=>{
 const origin="https://anthos.love",url=origin+"/api/signup";
 let r=await signupApi.fetch(new Request(url,{method:"GET"}));assert.equal(r.status,405);
 r=await signupApi.fetch(new Request(url,{method:"POST",headers:{origin:"https://evil.example","Content-Type":"application/json"},
  body:JSON.stringify({action:"preview",token:"1".repeat(64)})}));
 assert.equal(r.status,403);
 r=await signupApi.fetch(new Request(url,{method:"POST",headers:{origin,"Content-Type":"text/plain"},body:"hello"}));
 assert.equal(r.status,400);
});
test("Customer UI offers explicit opt-ins without falsely labeling phone or billing verified",()=>{
 const form=readFileSync(new URL("../signup/index.html",import.meta.url),"utf8");
 const admin=readFileSync(new URL("../admin/index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../admin/customers.js",import.meta.url),"utf8");
 for(const value of ["smsConsent","emailConsent","confirmPhone","adultAgreement","privacyAgreement",
   "birthDate","weddingDate","holidaysReviewed"])assert.match(form,new RegExp(value));
 assert.match(form,/Reply STOP/);assert.match(form,/not verify phone ownership/);
 assert.match(form,/location\.hash/);
 for(const id of ["customerCountQuestionnaire","customerCountSms","customerCountLinked",
   "customerInvitePanel","customerEmailLink","customerTextLink"])assert.ok(admin.includes('id="'+id+'"'));
 assert.ok(!js.includes("innerHTML"));assert.match(js,/recorded_unverified/);
});

test("blank signup invitation creates no person until the recipient submits all data",async()=>{
 process.env.SUPABASE_SECRET_KEY="sb_secret_test_no_real_data";
 let invite=null,customers=[],events=[];
 globalThis.fetch=async(uri,opts)=>{
   const path=new URL(uri).pathname;
   events.push({path,method:opts.method});
   const args=opts.body?JSON.parse(opts.body):null;
   if(path.endsWith("/anthos_signup_invitations")){
     if(opts.method==="POST"){
       assert.equal(args.program,"pilot");invite={...args,id};return new Response(JSON.stringify([invite]),{status:201});
     }
     if(opts.method==="GET"){
       const hash=new URL(uri).searchParams.get("token_hash").slice(3);
       return new Response(JSON.stringify(invite&&invite.token_hash===hash?[{...invite,redeemed_at:null}]:[]),{status:200});
     }
   }
   if(path.endsWith("/rpc/anthos_redeem_new_signup")){
     assert.equal(opts.method,"POST");
     assert.equal(args.p_phone,"+19035551234");
     assert.equal(args.p_display_name,"Sample Participant");
     assert.equal(args.p_email,"sample@example.test");
     assert.equal(args.p_sms_consent,true);
     assert.equal(args.p_disclosure,"anthos-sms-2026-11-v1");
     customers.push({id,...args});invite=null;
     return new Response(JSON.stringify(id),{status:200,headers:{"content-type":"application/json"}});
   }
   if(path.endsWith("/anthos_customer_directory"))
     return new Response("[]",{status:200});
   throw Error("Unexpected database operation: "+path);
 };
 const issued=await createOpenSignupLink();
 assert.match(issued.link,/\/signup\/#t=[a-f0-9]{64}$/);
 assert.equal(issued.sent,false);
 assert.equal(customers.length,0);
 assert.equal(events.length,1);
 const token=issued.link.split("#t=")[1],preview=await previewSignup(token);
 assert.equal(preview.mode,"new");assert.equal(preview.email,"");
 assert.equal(customers.length,0);
 const result=await submitSignup({...data,token,name:"Sample Participant",email:"sample@example.test"});
 assert.equal(result.ok,true);assert.equal(customers.length,1);
 assert.equal(result.smsConsent,"recorded_unverified");
 await assert.rejects(()=>previewSignup(token),/invalid|expired/i);
});
test("unverified phone identity is never marked verified by self-attestation or SMS opt-in",()=>{
 const sql=readFileSync(new URL("../supabase/migrations/20261101163850_verified_phone_identity_unique.sql",import.meta.url),"utf8");
 const intake=readFileSync(new URL("../supabase/migrations/20261101163457_signup_first_invitation_atomic_enrollment.sql",import.meta.url),"utf8");
 assert.match(sql,/where phone_verified_at is not null/i);
 assert.match(sql,/phone_verified_at is null or phone_e164 is not null/i);
 assert.match(intake,/security invoker/i);
 assert.match(intake,/redeemed_at is null and expires_at > v_now/i);
 assert.match(intake,/insert into public\.anthos_customer_directory/i);
 assert.doesNotMatch(intake,/phone_verified_at\s*=/i);
});
