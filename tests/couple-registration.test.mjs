import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {groupIdsFor,summarizeCouples} from "../api/couple-registration.mjs";
import {listCustomers,listCoupleRegistrations} from "../api/customer-directory.mjs";
const alice="11111111-1111-4111-8111-111111111111",
 bob="22222222-2222-4222-8222-222222222222",
 group="33333333-3333-4333-8333-333333333333";
const row=(id,name,number,spouseNumber)=>({
 id,display_name:name,group_id:group,phone_e164:number,
 spouse_phone_e164:spouseNumber,questionnaire_submitted_at:"2026-11-01T15:00:00Z",
 record_status:"pending",phone_verified_at:null,auth_user_id:null,wedding_date:"2010-05-12",
 email:"private@example.test",program:"pilot",staff_nomination:"none",created_at:"2026-11-01T15:00:00Z"
});
const p1=row(alice,"Partner One","+19035551234","+19035556789"),
      p2=row(bob,"Partner Two","+19035556789","+19035551234");
test("two independently submitted spouses in one group are registered, not authenticated",()=>{
 const result=summarizeCouples([p1,p2],[p1,p2]);
 assert.equal(result.registeredCouplesShown,1);
 for(const id of [alice,bob]){
   const status=result.byId.get(id);
   assert.equal(status.state,"both_joined_pending_verification");
   assert.equal(status.completed,2);
   assert.equal(status.phoneVerificationComplete,false);
   assert.equal(status.bothAccountsActive,false);
 }
});
test("status remains truthful when spouse is filtered off the current directory page",()=>{
 const result=summarizeCouples([p1],[p1,p2]);
 assert.equal(result.byId.get(alice).partnerName,"Partner Two");
 assert.equal(result.byId.get(alice).state,"both_joined_pending_verification");
 assert.equal(result.registeredCouplesShown,1);
});
test("do not confirm a couple when partner missing, numbers disagree, or group has three people",()=>{
 assert.equal(summarizeCouples([p1],[p1]).byId.get(alice).state,"awaiting_spouse");
 assert.equal(summarizeCouples([p1,p2],[p1,{...p2,spouse_phone_e164:"+19039990000"}]).byId.get(alice).state,"needs_review");
 const p3=row("44444444-4444-4444-8444-444444444444","Third Person","+19035550000","+19035551234");
 assert.equal(summarizeCouples([p1,p2],[p1,p2,p3]).byId.get(alice).state,"needs_review");
});
test("independent phone verification and account activation do not grant mutual access",()=>{
 const verified=[{...p1,phone_verified_at:"2026-11-01",auth_user_id:alice},
  {...p2,phone_verified_at:"2026-11-01",auth_user_id:bob}];
 const s=summarizeCouples(verified,verified).byId.get(alice);
 assert.equal(s.state,"both_joined_pending_verification");
 assert.equal(s.phoneVerificationComplete,true);
 assert.equal(s.bothAccountsActive,true);
});
test("listCustomers retrieves group partners from server, not just visible filtered rows",async()=>{
 const old=globalThis.fetch,prior=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_SECRET_KEY="sb_secret_fake_testing_only";
 globalThis.fetch=async(url,init)=>{
  const u=new URL(url);
  if(init.method==="HEAD")return new Response(null,{status:200,headers:{"content-range":"0-0/2"}});
  if(u.searchParams.get("group_id")?.startsWith("in."))return new Response(JSON.stringify([p1,p2]),{status:200});
  return new Response(JSON.stringify([p1]),{status:200,headers:{"content-range":"0-0/1"}});
 };
 try{
  const result=await listCustomers({search:"Partner One"});
  assert.equal(result.customers.length,1);
  assert.equal(result.customers[0].couple.state,"both_joined_pending_verification");
  assert.equal(result.customers[0].couple.partnerName,"Partner Two");
  assert.equal(result.customers[0].registered,false);
  assert.equal(result.counts.registeredCouplesShown,1);
 }finally{
  globalThis.fetch=old;
  if(prior===undefined)delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY=prior;
 }
});
test("real couple dashboard shows one registration and no fabricated program completion",async()=>{
 const old=globalThis.fetch,prior=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_SECRET_KEY="sb_secret_fake_testing_only";
 globalThis.fetch=async(url,init)=>new Response(JSON.stringify([p1,p2]),{status:200,headers:{"content-range":"0-1/2"}});
 try{
  const data=await listCoupleRegistrations();
  assert.equal(data.counts.registered,1);
  assert.equal(data.counts.completedForms,2);
  assert.equal(data.couples[0].people.length,2);
  assert.equal(data.couples[0].accessGranted,false);
  assert.equal(data.couples[0].marriedYears!==null,true);
  assert.equal(data.truncated,false);
  const html=readFileSync(new URL("../admin/index.html",import.meta.url),"utf8");
  const client=readFileSync(new URL("../admin/couples.js",import.meta.url),"utf8");
  assert.match(html,/id="liveCoupleRows"/);
  assert.doesNotMatch(html,/Waiting for SQL/);
  assert.doesNotMatch(html,/Illustrative sample cohort/);
  assert.match(client,/view=couples/);
  assert.doesNotMatch(client,/innerHTML/);
 }finally{
  globalThis.fetch=old;
  if(prior===undefined)delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY=prior;
 }
});
