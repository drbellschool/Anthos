import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createCustomerRoom,sharedProfileFor} from "../api/pilot-core.mjs";
const a="adfd9634-8ae5-4e52-a624-3b8e92309511";
const b="c86260a1-8ad4-4d05-b805-46afc260e1c2";
const group="67625344-cfa3-41ad-bc55-2b18e885aac5";
const people=[
 {id:a,group_id:group,first_name:"Alex",display_name:"Alex Example",
  phone_e164:"+19035550001",spouse_phone_e164:"+19035550002",
  wedding_date:"2010-05-12",meaningful_holidays:["valentines","christmas"],
  questionnaire_submitted_at:"2026-11-01T00:00:00Z",program:"pilot",record_status:"pending",
  birth_date:"1983-04-12",email:"private1@example.test",postal_code:"75501",created_at:"2026-11-01T00:00:00Z"},
 {id:b,group_id:group,first_name:"Sam",display_name:"Sam Example",
  phone_e164:"+19035550002",spouse_phone_e164:"+19035550001",
  wedding_date:"2010-05-12",meaningful_holidays:["christmas","easter"],
  questionnaire_submitted_at:"2026-11-01T00:00:00Z",program:"pilot",record_status:"pending",
  birth_date:"1987-03-02",email:"private2@example.test",postal_code:"75501",created_at:"2026-11-01T00:01:00Z"}
];
const previous={db:process.env.SUPABASE_SECRET_KEY,ai:process.env.OPENAI_API_KEY};
const original=globalThis.fetch;
test.after(()=>{
 globalThis.fetch=original;
 if(previous.db===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=previous.db;
 if(previous.ai===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous.ai;
});
const response=x=>new Response(JSON.stringify(x),{status:200,headers:{"content-type":"application/json"}});
function dbFixture(members=people){
 process.env.SUPABASE_SECRET_KEY="sb_secret_test_customer_profiles_only";
 process.env.OPENAI_API_KEY="test-no-network";
 const calls=[],parts=[],rooms=[];
 globalThis.fetch=async(url,init={})=>{
  const u=new URL(url),path=u.pathname,body=init.body?JSON.parse(init.body):null;
  calls.push({path,body,query:u.searchParams});
  if(path.endsWith("/anthos_customer_directory")){
   // The only allowed profile query is private, server-side; strict select list excludes secrets.
   const columns=u.searchParams.get("select")||"";
   assert.doesNotMatch(columns,/birth_date|email|postal_code|sms_consent|special_dates|solo/i);
   if(u.searchParams.has("group_id"))return response(members);
   if(u.searchParams.has("id"))return response(members);
   throw Error("Unexpected customer query");
  }
  if(path.endsWith("/anthos_pilot_rooms")&&init.method==="POST"){
   const room={...body,id:"f7bcaa6b-89ce-4aee-a1c2-abbccddeeff0",
     expires_at:new Date(Date.now()+86400000).toISOString(),status:"active",ai_turns:0,story_beat:1};
   rooms.push(room);return response([room]);
  }
  if(path.endsWith("/anthos_pilot_participants")&&init.method==="POST"){
   parts.push(body);return response([body]);
  }
  if(path.endsWith("/anthos_pilot_rooms")&&init.method==="DELETE")return response([]);
  throw Error("Unexpected request "+path);
 };
 return {calls,parts,rooms};
}
test("admin-selected unique member IDs bind only a legitimate two-spouse pilot",async()=>{
 const f=dbFixture();
 const result=await createCustomerRoom("https://anthos.love",group);
 assert.equal(result.ok,true);
 assert.equal(result.customerLinked,true);
 assert.equal(result.phoneVerifiedByThisAction,false);
 assert.deepEqual(result.participants,{a:"Alex",b:"Sam"});
 assert.equal(f.parts.length,2);
 assert.deepEqual(f.parts.map(x=>x.customer_id),[a,b]);
 assert.ok(f.parts.every(x=>x.consented_at===undefined));
 assert.notEqual(result.invitations.a,result.invitations.b);
 assert.ok(result.invitations.a.startsWith("https://anthos.love/pilot/?invite="));
 assert.ok(f.calls.every(x=>!x.path.includes("/openai/")));
});
test("a profile cannot be linked when group is incomplete, mismatched or not pilot",async()=>{
 for(const scenario of [[people[0]],[people[0],{...people[1],spouse_phone_e164:"+19039999999"}],
  [people[0],{...people[1],program:"standard"}]]){
  const f=dbFixture(scenario);
  await assert.rejects(()=>createCustomerRoom("https://anthos.love",group));
  assert.equal(f.rooms.length,0);
  assert.equal(f.parts.length,0);
 }
 await assert.rejects(()=>createCustomerRoom("https://anthos.love","not-a-uuid"),/registered couple/);
});
test("Sophia receives only mutually confirmed age-free marriage context",async()=>{
 dbFixture();
 const shared=await sharedProfileFor([a,b]);
 assert.deepEqual(shared.mutuallySelectedCelebrations,["Christmas"]);
 assert.ok(Number.isInteger(shared.yearsMarried));
 assert.ok(shared.yearsMarried>=0);
 const serialized=JSON.stringify(shared);
 for(const secret of ["1983-04-12","1987-03-02","private1@example.test",
  "+19035550001","75501","valentines","easter"]){
  assert.equal(serialized.includes(secret),false,secret+" should be excluded");
 }
 assert.equal(await sharedProfileFor([a,a]),null);
 const altered=[people[0],{...people[1],group_id:"c9708d93-91b2-459e-bf35-5e4a6a5d7554"}];
 dbFixture(altered);
 assert.equal(await sharedProfileFor([a,b]),null);
});
test("real pilot AI and story prompts use only profile linked to authenticated invite tokens",()=>{
 const core=readFileSync(new URL("../api/pilot-core.mjs",import.meta.url),"utf8");
 const admin=readFileSync(new URL("../api/admin.mjs",import.meta.url),"utf8");
 const html=readFileSync(new URL("../admin/index.html",import.meta.url),"utf8");
 assert.match(core,/customer_id:linkedCustomers\[role\]\.id/);
 assert.match(core,/consented_at,display_name,ready_chapter,customer_id/);
 assert.match(core,/const facts=await sharedProfileFor\(names.customerIds\)/);
 assert.match(core,/const matchedProfile=await sharedProfileFor\(named.customerIds\)/);
 assert.match(core,/Only use SHARED conversation/);
 assert.match(core,/store:false/);
 assert.match(admin,/action==="pilot-create-couple"/);
 assert.match(html,/id="customerStartTeamPilot"/);
 assert.match(html,/id="customerPilotLinkA"/);
 assert.match(html,/id="customerPilotLinkB"/);
});
