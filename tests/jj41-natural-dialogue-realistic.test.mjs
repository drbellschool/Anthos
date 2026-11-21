import test from "node:test";
import assert from "node:assert/strict";
import {
 buildAuthored41,authoredOptions,selectedAuthoredChoice,authoredCommitment,
 authoredObjection,authoredScene,composeAuthored41Closure,
 interpretAuthoredFollowup,recordedAuthoredDecision
} from "../api/jj4-authored41.mjs";

const episode=()=>buildAuthored41({title:"The Four-Hundred-Dollar Surprise",pilotMode:"shared"});
test("short affirmation bypasses the model and retains selected approach",async()=>{
 const {classifyAuthoredAdviceWithModel}=await import("../api/jj4-authored41-intent.mjs");
 const old=process.env.OPENAI_API_KEY,oldFetch=globalThis.fetch;
 process.env.OPENAI_API_KEY="fake-model-test-key";
 globalThis.fetch=async()=>{throw new Error("A confirmation must not call the model")};
 try{
  const choice=authoredOptions(episode(),"jack",2).find(x=>x.id==="explain");
  const result=await classifyAuthoredAdviceWithModel({
   episode:episode(),role:"jack",phase:2,selected:choice,text:"Yep tell her.",
   fallback:{kind:"unclear",focus:null,motive:"none"}
  });
  assert.deepEqual(result,{kind:"engage",focus:null,motive:"none"});
 }finally{
  globalThis.fetch=oldFetch;
  if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;
 }
});
const coachScript=[
 {jack:["explain","Tell her plainly you are angry about using savings, while owning the delayed repair."],
  jill:["explain","Tell Jack you needed a working appliance and were tired of waiting."]},
 {jack:["own","Fix the microwave or install the new one."],
  jill:["ask","Ask Jack what kept him from fixing it the last three Saturdays."]},
 {jack:["explain","Yep tell her."],
  jill:["own","Acknowledge buying it without talking, but don't pretend the delay was fine."]},
 {jack:["own","Offer to check the real options tomorrow. Don't promise a refund."],
  jill:["ask","Ask how you two can make a fair decision about the microwave tomorrow."]}
];
function play(){
 const ep=episode(),history=[],scenes=[],dialogue=[];
 for(let phase=0;phase<6;phase++){
  const rendered=authoredScene(ep,phase,history);
  scenes.push(rendered.scene);
  if(phase>=4)continue;
  for(const role of ["jack","jill"]){
   const [id,advice]=coachScript[phase][role];
   const option=authoredOptions(ep,role,phase).find(o=>o.id===id);
   assert.ok(option);
   const question={role,phase_index:phase,kind:"question",body:option.label};
   const choice=selectedAuthoredChoice(ep,role,phase,[...history,question]);
   const objection=authoredObjection(ep,role,phase,id);
   const reply=authoredCommitment(choice,advice,{role,phase,episode:ep});
   history.push(question,{role,phase_index:phase,kind:"reply",body:objection},
    {role,phase_index:phase,kind:"question",body:advice},
    {role,phase_index:phase,kind:"reply",body:reply},
    {role,phase_index:phase,kind:"coach",body:advice});
   dialogue.push({phase:phase+1,role,objection,advice,reply});
  }
 }
 return {ep,scenes,history,dialogue,
  closure:composeAuthored41Closure(ep,scenes.map((body,phase_index)=>({body,phase_index})))};
}
test("short confirmations do not invent a new direction or apology",()=>{
 const a=interpretAuthoredFollowup("Yep tell her.");
 assert.equal(a.kind,"engage");
 assert.equal(a.focus,null);
 const p=play(),last=p.dialogue.find(x=>x.phase===3&&x.role==="jack");
 assert.doesNotMatch(last.reply,/You're changing|different direction|heard matters/);
 assert.match(last.reply,/savings matter|financial|stand my ground/i);
 const selected=authoredOptions(p.ep,"jack",2).find(x=>x.id==="explain");
 assert.equal(recordedAuthoredDecision(p.ep,"jack",2,selected,last.advice,p.history).focus,"explain");
});
test("coach's actual appliance request produces a practical commitment and scene consequence",()=>{
 const p=play(),turn=p.dialogue.find(x=>x.phase===2&&x.role==="jack");
 assert.match(turn.reply,/check whether the old one can be repaired/);
 assert.match(p.scenes[2],/I'll check whether the old microwave can be repaired/);
 assert.match(p.scenes[2],/conversation before another \$400/);
 assert.doesNotMatch(p.scenes[2],/old microwave was repaired|new microwave installed/);
});
test("two strong independent character voices hold the disagreement across all six scenes",()=>{
 const p=play();
 assert.equal(p.scenes.length,6);
 assert.equal(p.dialogue.length,8);
 for(const [i,scene] of p.scenes.entries()){
  const n=scene.trim().split(/\s+/).length;
  assert.ok(n>=35&&n<=110,"Scene "+(i+1)+" words="+n);
 }
 assert.match(p.scenes[0],/Four hundred dollars\?/);
 assert.match(p.scenes[0],/You said you'd fix it/);
 assert.match(p.scenes[1],/smiling tomato magnet/);
 assert.match(p.scenes[2],/saucepan/);
 assert.doesNotMatch(p.scenes.join(" " ),/refund (?:was|is) guaranteed|new microwave installed|old microwave repaired/i);
 assert.doesNotMatch(p.scenes.join(" "),/Tell her plainly you are angry|Fix the microwave or install the new one|Yep tell her/i);
 assert.match(p.closure,/SOPHIA/i);
});
export {play};
