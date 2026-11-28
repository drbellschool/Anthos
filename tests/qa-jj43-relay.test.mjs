import test from "node:test";
import assert from "node:assert/strict";
import {validAnthosVoiceBody,default as relayHandler} from "../api/qa-jj43-relay.mjs";
const valid={
 model:"gpt-4.1-mini",store:false,max_output_tokens:440,
 instructions:"Write the ENTIRE next private SMS and only enact the verified world event.",
 input:JSON.stringify({character:"jack",coachMessage:"Make a harmless joke about microwaves.",
  factsBefore:{box:"sealed"},factsAfter:{box:"sealed"},verifiedEventThisTurn:null}),
 text:{format:{type:"json_schema",name:"jj43_full_character_text"}}
};
function fakeRes(){
 const res={statusCode:200,headers:{},body:null};
 res.status=n=>(res.statusCode=n,res);
 res.json=v=>(res.body=v,res);
 res.setHeader=(k,v)=>(res.headers[k]=v,res);
 return res;
}
test("QA relay validates the narrow 4.3 whole-message shape",()=>{
 assert.equal(validAnthosVoiceBody(valid),true);
 assert.equal(validAnthosVoiceBody({...valid,store:true}),false);
 assert.equal(validAnthosVoiceBody({...valid,max_output_tokens:9000}),false);
 assert.equal(validAnthosVoiceBody({...valid,text:{format:{name:"other_model"}}}),false);
 assert.equal(validAnthosVoiceBody({...valid,input:JSON.stringify({character:"jack"})}),false);
});
test("QA relay cannot be called outside explicit preview-only QA mode",async()=>{
 const saved={VERCEL_ENV:process.env.VERCEL_ENV,
  ANTHOS_QA_BRIDGE_ENABLED:process.env.ANTHOS_QA_BRIDGE_ENABLED,
  OPENAI_API_KEY:process.env.OPENAI_API_KEY};
 try{
  delete process.env.ANTHOS_QA_BRIDGE_ENABLED;
  delete process.env.OPENAI_API_KEY;
  process.env.VERCEL_ENV="production";
  const res=fakeRes();
  await relayHandler({method:"POST",body:valid,headers:{}},res);
  assert.equal(res.statusCode,404);
  assert.equal(res.body.error,"disabled");
 }finally{
  for(const [key,value] of Object.entries(saved)){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 }
});
test("QA relay never allows unauthenticated calls",async()=>{
 const saved={VERCEL_ENV:process.env.VERCEL_ENV,
  ANTHOS_QA_BRIDGE_ENABLED:process.env.ANTHOS_QA_BRIDGE_ENABLED,
  OPENAI_API_KEY:process.env.OPENAI_API_KEY,
  ANTHOS_QA_BRIDGE_TOKEN:process.env.ANTHOS_QA_BRIDGE_TOKEN};
 try{
  Object.assign(process.env,{VERCEL_ENV:"preview",ANTHOS_QA_BRIDGE_ENABLED:"1",
   OPENAI_API_KEY:"redacted-fixture-not-a-key",ANTHOS_QA_BRIDGE_TOKEN:"x".repeat(32)});
  const res=fakeRes();
  await relayHandler({method:"POST",body:valid,headers:{}},res);
  assert.equal(res.statusCode,403);
 }finally{
  for(const [key,value] of Object.entries(saved)){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 }
});
