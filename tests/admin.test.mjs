import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import vm from "node:vm";
import {dirname,resolve} from "node:path";
import admin from "../api/admin.mjs";

const URL="https://threefold-preview.vercel.app/api/admin";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const password="A-Very-Long-Private-Demo-Password-For-Testing";
const secret="not-a-production-key-0123456789-testing-only-0123456789";
const previous={};
for(const k of ["THREEFOLD_ADMIN_PASSWORD","THREEFOLD_SESSION_SECRET","OPENAI_API_KEY","TELNYX_API_KEY","TELNYX_FROM_NUMBER","OPENAI_MODEL","THREEFOLD_TEST_SMS_TO","THREEFOLD_TEST_SMS_ENABLED","THREEFOLD_10DLC_APPROVED"]){
 previous[k]=process.env[k];delete process.env[k];
}
const priorFetch=globalThis.fetch;
function resetEnvironment(){
 for(const k of Object.keys(previous))delete process.env[k];
 globalThis.fetch=priorFetch;
}
test.after(()=>{resetEnvironment();for(const [k,v] of Object.entries(previous))if(v!==undefined)process.env[k]=v;});
function req(method="GET",data,opts={}){
  return new Request(URL,{method,
    headers:{...(method==="POST"?{"origin":"https://threefold-preview.vercel.app",
      "Content-Type":"application/json","X-Threefold-Admin":"1"}:{}),
      ...(opts.headers||{})},
    ...(method==="POST"?{body:JSON.stringify(data)}:{})
  });
}
const call=async(request)=>{const res=await admin.fetch(request);return {res,body:await res.json()};};
const withCookie=(action,cookie,other={})=>req("POST",{action,...other},{headers:{cookie}});

test("no configuration fails closed and never exposes provider info",async()=>{
 const {res,body}=await call(req());
 assert.equal(res.status,200);
 assert.equal(body.authenticated,false);
 assert.equal(body.adminConfigured,false);
 assert.equal("services" in body,false);
 const login=await call(req("POST",{action:"login",password}));
 assert.equal(login.res.status,503);
 assert.equal(login.res.headers.get("set-cookie"),null);
});
test("reject requests lacking same-origin and CSRF header",async()=>{
 process.env.THREEFOLD_ADMIN_PASSWORD=password;
 process.env.THREEFOLD_SESSION_SECRET=secret;
 const a=await call(req("POST",{action:"login",password},{headers:{origin:"https://evil.example"}}));
 assert.equal(a.res.status,403);
 const b=await call(req("POST",{action:"login",password},{headers:{"X-Threefold-Admin":"0"}}));
 assert.equal(b.res.status,403);
});
test("reject invalid password, then set HttpOnly strict signed cookie",async()=>{
 const bad=await call(req("POST",{action:"login",password:"wrong password"}));
 assert.equal(bad.res.status,401);
 const good=await call(req("POST",{action:"login",password}));
 assert.equal(good.res.status,200);
 assert.equal(good.body.authenticated,true);
 const c=good.res.headers.get("set-cookie");
 assert.match(c,/HttpOnly/);assert.match(c,/Secure/);assert.match(c,/SameSite=Strict/);
 assert.match(c,/Path=\/api\/admin/);
 globalThis.validCookie=c.split(";")[0];
 const state=await call(req("GET",null,{headers:{cookie:globalThis.validCookie}}));
 assert.equal(state.body.authenticated,true);
 assert.equal(state.body.services.messaging.enabled,false);
 assert.equal(state.body.services.openai.configured,false);
 const tampered=await call(req("GET",null,{headers:{cookie:globalThis.validCookie+"tamper"}}));
 assert.equal(tampered.body.authenticated,false);
});
test("provider checks require valid session",async()=>{
 const noSession=await call(req("POST",{action:"check-openai"}));
 assert.equal(noSession.res.status,401);
 const ai=await call(withCookie("check-openai",globalThis.validCookie));
 assert.equal(ai.body.ok,false);
 assert.match(ai.body.message,/not configured/i);
 const sms=await call(withCookie("check-telnyx",globalThis.validCookie));
 assert.equal(sms.body.ok,false);
 assert.match(sms.body.message,/not configured/i);
});
test("connection tests use server-only credentials and never transmit SMS",async()=>{
 process.env.OPENAI_API_KEY="test-ai-key-fake";
 process.env.TELNYX_API_KEY="test-telnyx-key-fake";
 process.env.TELNYX_FROM_NUMBER="+19036090465";
 let aiCalls=0,telnyxCalls=0,sendAttempts=0;
 globalThis.fetch=async(input,init)=>{
   if(String(input).includes("openai.com")){
     aiCalls++;
     assert.equal(init.method,"POST");
     assert.match(init.headers.Authorization,/test-ai-key-fake/);
     const payload=JSON.parse(init.body);
     assert.equal(payload.store,false);
     assert.ok(payload.max_output_tokens<=180);
     return new Response(JSON.stringify({model:"gpt-4.1-mini",
       output:[{type:"message",content:[{type:"output_text",text:"A small adventure awaits."}]}],
       usage:{input_tokens:15,output_tokens:5}}),{status:200});
   }
   if(String(input).includes("telnyx.com")){
     telnyxCalls++;
     if(init.method!=="GET")sendAttempts++;
     assert.equal(init.method,"GET");
     assert.ok(String(input).includes("/messaging_profiles"));
     return new Response(JSON.stringify({data:[{id:"demo-profile",name:"Pilot"}]}),{status:200});
   }
   throw Error("Unexpected outbound request "+input);
 };
 const ai=await call(withCookie("check-openai",globalThis.validCookie));
 assert.equal(ai.body.ok,true);
 const rehearsal=await call(withCookie("try-openai",globalThis.validCookie,{prompt:"Give two fictional spouses a fun idea."}));
 assert.equal(rehearsal.body.ok,true);
 assert.equal(rehearsal.body.output,"A small adventure awaits.");
 const sms=await call(withCookie("check-telnyx",globalThis.validCookie));
 assert.equal(sms.body.ok,true);
 assert.equal(sms.body.profileCountReturned,1);
 assert.equal(aiCalls,2);assert.equal(telnyxCalls,1);assert.equal(sendAttempts,0);
 assert.equal(JSON.stringify(sms.body).includes("test-telnyx-key-fake"),false);
});

test("test-SMS fails closed before approval, cannot target arbitrary phones or send custom text",async()=>{
  const consent={confirmation:"SEND ONE TEST",ownPhone:true,expressConsent:true,carrierStatusVerified:true};
  process.env.TELNYX_API_KEY="fake-closed-test-key";
  process.env.TELNYX_FROM_NUMBER="+19036090465";
  let networkCalls=0;
  globalThis.fetch=async()=>{networkCalls++;throw Error("Must not send a message");};
  let result=await call(withCookie("send-test-sms",globalThis.validCookie,consent));
  assert.equal(result.body.ok,false);
  assert.equal(networkCalls,0);

  process.env.THREEFOLD_TEST_SMS_TO="+19035551234";
  process.env.THREEFOLD_TEST_SMS_ENABLED="true";
  result=await call(withCookie("send-test-sms",globalThis.validCookie,consent));
  assert.equal(result.body.ok,false,"Missing campaign approval must not send");
  assert.equal(networkCalls,0);

  process.env.THREEFOLD_10DLC_APPROVED="true";
  result=await call(withCookie("send-test-sms",globalThis.validCookie,{...consent,ownPhone:false}));
  assert.equal(result.res.status,400);
  result=await call(withCookie("send-test-sms",globalThis.validCookie,{...consent,expressConsent:false}));
  assert.equal(result.res.status,400);
  result=await call(withCookie("send-test-sms",globalThis.validCookie,{...consent,confirmation:"SEND TWO TESTS"}));
  assert.equal(result.res.status,400);
  assert.equal(networkCalls,0);
});
test("approved explicitly confirmed test only sends fixed copy to the allowlisted number",async()=>{
  let count=0;
  globalThis.fetch=async(url,init)=>{
    count++;
    assert.equal(url,"https://api.telnyx.com/v2/messages");
    assert.equal(init.method,"POST");
    const body=JSON.parse(init.body);
    assert.deepEqual(Object.keys(body).sort(),["from","text","to"]);
    assert.equal(body.from,"+19036090465");
    assert.equal(body.to,"+19035551234");
    assert.match(body.text,/Threefold test: The adventure awaits/);
    assert.match(body.text,/STOP/);
    assert.ok(!body.text.includes("INJECTED"));
    return new Response(JSON.stringify({data:{id:"test-accepted-message-id"}}),{status:202});
  };
  const payload={confirmation:"SEND ONE TEST",ownPhone:true,expressConsent:true,
    carrierStatusVerified:true,recipient:"+19998887777",text:"INJECTED"};
  const result=await call(withCookie("send-test-sms",globalThis.validCookie,payload));
  assert.equal(count,1);
  assert.equal(result.body.ok,true);
  assert.equal(result.body.providerMessageId,"test-accepted-message-id");
  assert.match(result.body.message,/NOT been confirmed/);
  assert.equal(result.body.recipientLast4,"1234");
  assert.equal(JSON.stringify(result.body).includes("fake-closed-test-key"),false);

  const state=await call(req("GET",null,{headers:{cookie:globalThis.validCookie}}));
  assert.equal(state.body.services.testSMS.recipientReady,true);
  assert.equal(state.body.services.testSMS.carrierApproved,true);
  assert.equal(state.body.services.testSMS.enabled,true);
  assert.equal(JSON.stringify(state.body).includes("+19035551234"),false);
});

test("persona rehearsal is auth protected, limited to three scopes, and never scores a couple",async()=>{
 const noSession=await call(req("POST",{action:"rehearse-persona",persona:"sophia",prompt:"A fictional spouse feels unheard."}));
 assert.equal(noSession.res.status,401);
 const invalid=await call(withCookie("rehearse-persona",globalThis.validCookie,{persona:"hidden-mode",prompt:"Invent a new role."}));
 assert.equal(invalid.res.status,400);
 const empty=await call(withCookie("rehearse-persona",globalThis.validCookie,{persona:"sophia",prompt:"x"}));
 assert.equal(empty.res.status,400);
 let count=0;
 const instructions=[];
 globalThis.fetch=async(url,init)=>{
   count++;
   assert.equal(url,"https://api.openai.com/v1/responses");
   const input=JSON.parse(init.body);
   assert.equal(input.store,false);
   assert.equal(input.max_output_tokens,220);
   assert.match(input.instructions,/FICTIONAL rehearsal prompt/);
   instructions.push(input.instructions);
   return new Response(JSON.stringify({
     model:"gpt-4.1-mini",output:[{type:"message",content:[{type:"output_text",text:"Test response only."}]}]
   }),{status:200});
 };
 for(const persona of ["sophia","paraclete","threefold"]){
   const r=await call(withCookie("rehearse-persona",globalThis.validCookie,{
     persona,prompt:"A fictional couple needs a creative, thoughtful conversation."}));
   assert.equal(r.body.ok,true);assert.equal(r.body.persona,persona);
   assert.match(r.body.disclaimer,/No objective scores/);
   assert.equal(r.body.output,"Test response only.");
 }
 assert.equal(count,3);
 assert.match(instructions[0],/Deep Dive/);
 assert.match(instructions[1],/babysitter|childcare/);
 assert.match(instructions[2],/milestone/);
 assert.equal(new Set(instructions).size,3);
});
test("curriculum metadata is eight chapters, fixed mastery six choices and analytics are clearly fictional",()=>{
 const global={};
 vm.runInNewContext(readFileSync(resolve(root,"admin/studio-blueprint.js"),"utf8"),{window:global});
 const blueprint=global.THREEFOLD_STUDIO_BLUEPRINT;
 assert.equal(blueprint.dive.milestones,8);
 assert.equal(blueprint.dive.masteryChapter,7);
 assert.equal(blueprint.dive.chapters.length,8);
 assert.equal(blueprint.dive.chapters[6].type,"mastery");
 assert.equal(blueprint.dive.measurableObjectives.length,4);
 assert.ok(blueprint.dive.guardrails.some(g=>g.includes("Off-topic")));
 assert.ok(blueprint.sampleCohort.every(c=>c.id.startsWith("EX-")));
 const pages=readFileSync(resolve(root,"admin/index.html"),"utf8");
 for(const tab of ["sophia","paraclete","threefold","deepdives","couples"]){
   assert.match(pages,new RegExp('data-studio-page="'+tab+'"'));
   assert.match(pages,new RegExp('data-studio-tab="'+tab+'"'));
 }
 assert.match(pages,/FICTIONAL EXAMPLES/);
 const browser=readFileSync(resolve(root,"admin/studio.js"),"utf8");
 assert.doesNotThrow(()=>new Function(browser));
 assert.match(browser,/scoreMastery/);
 assert.match(browser,/rehearse-persona/);
 assert.doesNotMatch(browser,/TELNYX_API_KEY|OPENAI_API_KEY/);
});
test("admin html is noindex and the script has no inline secrets",()=>{
 const html=readFileSync(resolve(root,"admin/index.html"),"utf8");
 const js=readFileSync(resolve(root,"admin/admin.js"),"utf8");
 const config=JSON.parse(readFileSync(resolve(root,"vercel.json"),"utf8"));
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/type="password"/);
 assert.match(html,/Customer SMS stays disabled/);
 assert.doesNotMatch(html,/\<script(?![^>]*src)/i);
 assert.doesNotMatch(js,/sk-proj-|key_[0-9a-z]{20}/i);
 assert.equal(config.headers.some(x=>x.source==="/admin/(.*)"&&x.headers.some(h=>h.key==="Content-Security-Policy")),true);
});
