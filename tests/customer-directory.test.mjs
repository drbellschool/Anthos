import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {listCustomers,addCustomers,editCustomer} from "../api/customer-directory.mjs";
import admin from "../api/admin.mjs";
const previous={};for(const k of ["SUPABASE_SECRET_KEY","SUPABASE_SERVICE_ROLE_KEY","THREEFOLD_ADMIN_PASSWORD","THREEFOLD_SESSION_SECRET"])previous[k]=process.env[k];
const originalFetch=globalThis.fetch;
test.after(()=>{
  globalThis.fetch=originalFetch;
  for(const [k,value] of Object.entries(previous)){if(value===undefined)delete process.env[k];else process.env[k]=value;}
});
const email="pilot@example.test";
function fakeRow(item={}){
 return {id:"85a6498d-a3c0-45fa-98dc-fba73accd9d7",email,
  display_name:"Test Pilot",program:"pilot",staff_nomination:"none",record_status:"pending",
  group_id:null,auth_user_id:null,created_at:"2026-11-01T00:00:00Z",
  updated_at:"2026-11-01T00:00:00Z",...item};
}
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers}});
function setup(){
 process.env.SUPABASE_SECRET_KEY="sb_secret_customer_test_only";
 globalThis.fetch=async()=>{throw Error("Unexpected network call");};
}
test("directory fails closed when server database credentials are absent",async()=>{
 delete process.env.SUPABASE_SECRET_KEY;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
 await assert.rejects(()=>listCustomers(),/not configured/);
});
test("contacts are truly loaded server side and only permitted fields are returned",async()=>{
 setup();const urls=[];
 globalThis.fetch=async(url,opts)=>{
   urls.push({url:String(url),opts});
   assert.match(String(url),/kstluxwgrrgdbjyloscb.supabase.co\/rest\/v1/);
   assert.equal(opts.headers.apikey,"sb_secret_customer_test_only");
   if(opts.method==="HEAD")return new Response(null,{status:200,headers:{"content-range":"0-0/1"}});
   return json([fakeRow()],200,{"content-range":"0-0/1"});
 };
 const data=await listCustomers({page:0,program:"pilot",search:"pilot"});
 assert.equal(data.ok,true);assert.equal(data.total,1);assert.equal(data.customers[0].name,"Test Pilot");
 assert.equal(data.customers[0].registered,false);assert.equal(data.counts.standard,1);
 assert.equal(data.subscriptionConnected,false);assert.equal(data.emailInvitationConnected,false);
 assert.equal(JSON.stringify(data).includes("sb_secret_customer_test_only"),false);
 assert.equal(urls.filter(x=>x.opts.method==="HEAD").length,4);
 assert.ok(urls.some(x=>x.url.includes("program=eq.pilot")));
});
test("adding two people creates one pending group and does not send invitations",async()=>{
 setup();let called=0,body;
 globalThis.fetch=async(url,opts)=>{
   called++;assert.equal(opts.method,"POST");body=JSON.parse(opts.body);
   assert.equal(body.length,2);assert.equal(body[0].group_id,body[1].group_id);
   assert.equal(body[0].staff_nomination,"none");assert.equal(body[1].staff_nomination,"none");
   assert.equal(body[0].record_status,"pending");
   return json(body.map((x,i)=>fakeRow({...x,id:i?"4a2ef523-f46a-4bde-a843-a594ed7ec01b":fakeRow().id})),201);
 };
 const r=await addCustomers({name:" First Pilot ",email:"PILOT@example.test",program:"pilot",
   partnerName:"Other Pilot",partnerEmail:"other@example.test"});
 assert.equal(r.ok,true);assert.equal(r.invitationSent,false);
 assert.equal(body[0].email,email);assert.equal(called,1);
});
test("invalid, duplicate-partner or privilege-granting payloads fail before network",async()=>{
 setup();let calls=0;globalThis.fetch=async()=>{calls++;throw Error("network must not run");};
 await assert.rejects(()=>addCustomers({name:"A",email,program:"subscriber"}),/Pilot or Standard/);
 await assert.rejects(()=>addCustomers({name:"A",email,program:"pilot",staffNomination:"admin"}),/Unsupported staff/);
 await assert.rejects(()=>addCustomers({name:"A",email,program:"pilot",staffNomination:"admin_pending"}),/Standard/);
 await assert.rejects(()=>addCustomers({name:"A",email,program:"pilot",partnerName:"B",partnerEmail:email}),/different/);
 await assert.rejects(()=>editCustomer({id:fakeRow().id,admin:true}),/Nothing to change/);
 await assert.rejects(()=>editCustomer({id:fakeRow().id,status:"active"}),/Unsupported/);
 await assert.rejects(()=>listCustomers({search:"*"}),/unsupported/);
 assert.equal(calls,0);
});
test("editing only permits non-authorizing directory fields",async()=>{
 setup();let payload;
 globalThis.fetch=async(url,opts)=>{assert.equal(opts.method,"PATCH");payload=JSON.parse(opts.body);
   return json([fakeRow({...payload,program:"standard"})]);};
 const r=await editCustomer({id:fakeRow().id,name:"Test Pilot",program:"standard",
   staffNomination:"admin_pending",auth_user_id:"forbidden",paid:true});
 assert.deepEqual(Object.keys(payload).sort(),["display_name","program","staff_nomination"]);
 assert.equal(r.customer.staffNomination,"admin_pending");
 assert.equal(r.customer.program,"standard");
 assert.match(r.message,/does not change billing/);
});
test("admin API rejects customer listing and mutation without authenticated admin cookie",async()=>{
 setup();const origin="https://anthos.love",url=origin+"/api/admin";
 let count=0;globalThis.fetch=async()=>{count++;throw Error("no DB access without session");};
 process.env.THREEFOLD_ADMIN_PASSWORD="very-long-test-password";
 process.env.THREEFOLD_SESSION_SECRET="an-unpredictable-test-signing-secret-0123456789";
 const get=await admin.fetch(new Request(url+"?view=customers"));
 assert.equal(get.status,401);
 const post=await admin.fetch(new Request(url,{method:"POST",headers:{origin,"Content-Type":"application/json",
   "X-Threefold-Admin":"1"},body:JSON.stringify({action:"customer-add",name:"A",email,program:"pilot"})}));
 assert.equal(post.status,401);
 assert.equal(count,0);
});
test("customer page only uses text nodes and shows accurate access labels",()=>{
 const html=readFileSync(new URL("../admin/index.html",import.meta.url),"utf8");
 const client=readFileSync(new URL("../admin/customers.js",import.meta.url),"utf8");
 const sql=readFileSync(new URL("../supabase/migrations/20261101160000_customer_directory_admin_only.sql",import.meta.url),"utf8");
 for(const id of ["customerOpenAdd","customerAddForm","customerRows","customerEditForm",
   "customerFilterProgram","customerFilterStatus"])assert.ok(html.includes('id="'+id+'"'));
 assert.match(client,/\.textContent=/);assert.doesNotMatch(client,/\.innerHTML\s*=/);
 assert.match(html,/Standard \(not paid\)/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.anthos_customer_directory from anon,authenticated/);
 assert.match(sql,/staff_nomination in \('none','admin_pending'\)/);
 assert.doesNotMatch(sql,/grant .* to authenticated/i);
});
