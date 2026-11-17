import test from "node:test";
import assert from "node:assert/strict";
import {draftSophiaClosure} from "../api/jj4-closure.mjs";
const scenes=[
 {phase_index:4,body:"Jack texted Jill to say he was stuck at his meeting and proposed 8:30 instead."},
 {phase_index:5,body:"Jill read the text and accepted 8:30, but said their deeper conversation was still unresolved."}
];
const episode={title:"Can We Talk Later?",primarySkill:"g-repair",
 learningObjective:"Follow through after a bounded pause."};
const makeResponse=x=>({
 ok:true,async json(){return {output:[{content:[{type:"output_text",text:JSON.stringify(x)}]}]};}
});
test("Sophia repairs a rejected ending once using exact final-scene evidence",async()=>{
 const prior=globalThis.fetch,priorKey=process.env.OPENAI_API_KEY;
 let count=0,secondRequest;
 process.env.OPENAI_API_KEY="test-secret-not-a-real-key";
 globalThis.fetch=async (_url,options)=>{
  count++;
  const request=JSON.parse(options.body);
  if(count===1)return makeResponse({
   evidence:"They both agreed the issue was completely solved.",
   observation:"They agreed to solve their problem and never disagreed again.",
   practice:"Agree to be more affectionate tomorrow."
  });
  secondRequest=request;
  return makeResponse({
   evidence:"Jill read the text and accepted 8:30",
   observation:"Jill accepted a specific time but their underlying conversation remains unresolved. Jack's follow-through is still ahead.",
   practice:"Choose a time to return to a difficult conversation and make it an option both can accept."
  });
 };
 try{
  const result=await draftSophiaClosure(episode,scenes);
  assert.equal(count,2);
  assert.match(result,/Jill accepted a specific time/);
  assert.doesNotMatch(result,/never disagreed|completely solved/);
  assert.match(secondRequest.instructions,/EVIDENCE REPAIR/);
  assert.match(secondRequest.input,/priorRejectedDraft/);
 }finally{globalThis.fetch=prior;if(priorKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=priorKey;}
});
test("Sophia still falls back to visible facts if both repairs cannot be grounded",async()=>{
 const prior=globalThis.fetch,priorKey=process.env.OPENAI_API_KEY;let count=0;
 process.env.OPENAI_API_KEY="test-secret-not-a-real-key";
 globalThis.fetch=async()=>{count++;return makeResponse({
  evidence:"An agreement not in the story",
  observation:"They decided everything was fixed.",
  practice:"Try to be perfect."
 })};
 try{
  const result=await draftSophiaClosure(episode,scenes);
  assert.equal(count,2);
  assert.match(result,/Jack texted Jill|Jill read the text/);
  assert.doesNotMatch(result,/everything was fixed/);
 }finally{globalThis.fetch=prior;if(priorKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=priorKey;}
});
