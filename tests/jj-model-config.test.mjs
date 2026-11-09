import test from "node:test";
import assert from "node:assert/strict";
import {DEEP_DIVE_DEFAULT_MODEL,DEEP_DIVE_MODEL_ENV,deepDiveModel,deepDiveRequest} from "../api/jj-model-config.mjs";
const schema={type:"object",additionalProperties:false,properties:{characterReply:{type:"string"}},required:["characterReply"]};
const base={instructions:"You are Jill, texting Alissa.",input:{scene:"Windy cabin",role:"jill"},schema,attempt:0};
test("Jack and Jill use GPT-6 Luna independently of the legacy Vercel OPENAI_MODEL",()=>{
 assert.equal(DEEP_DIVE_DEFAULT_MODEL,"gpt-6-luna");
 assert.equal(DEEP_DIVE_MODEL_ENV,"ANTHOS_JJ_MODEL");
 assert.equal(deepDiveModel({OPENAI_MODEL:"gpt-4.1-mini"}),"gpt-6-luna");
 assert.equal(deepDiveModel({OPENAI_MODEL:"gpt-4.1-mini",ANTHOS_JJ_MODEL:"gpt-6-luna"}),"gpt-6-luna");
});
test("private character messages use Luna with medium reasoning for thoughtful fewer-turn responses",()=>{
 const a=deepDiveRequest({...base,name:"jj3_character_reply",env:{OPENAI_MODEL:"gpt-4.1-mini"}});
 assert.equal(a.model,"gpt-6-luna");
 assert.deepEqual(a.reasoning,{effort:"medium"});
 assert.equal(a.store,false);
 assert.equal(a.text.format.type,"json_schema");
 assert.equal(a.text.format.strict,true);
 assert.equal(a.text.format.schema,schema);
 assert.deepEqual(JSON.parse(a.input),base.input);
 assert.equal(a.max_output_tokens,3900);
 const retry=deepDiveRequest({...base,name:"jj3_character_reply",attempt:1,env:{}});
 assert.equal(retry.max_output_tokens,5500);
});
test("shared story outcomes use Luna high reasoning for consistent evolving consequences",()=>{
 for(const name of ["jj_evolution_outcome","jj_evolution_finale","jj3_story_outcome"]){
  const first=deepDiveRequest({...base,name,env:{}});
  const retry=deepDiveRequest({...base,name,attempt:1,env:{}});
  assert.equal(first.model,"gpt-6-luna");
  assert.deepEqual(first.reasoning,{effort:"high"});
  assert.equal(first.max_output_tokens,7500);
  assert.equal(retry.max_output_tokens,10000);
  assert.equal(first.text.format.name,name);
 }
});
test("an explicitly configured different model never receives unsupported Luna-only options",()=>{
 const req=deepDiveRequest({...base,name:"jj3_character_reply",env:{ANTHOS_JJ_MODEL:"gpt-6.1-sol"}});
 assert.equal(req.model,"gpt-6.1-sol");
 assert.equal("reasoning" in req,false);
});
