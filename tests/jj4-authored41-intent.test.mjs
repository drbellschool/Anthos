import test from "node:test";
import assert from "node:assert/strict";
import {buildAuthored41,authoredOptions,selectedAuthoredChoice,authoredObjection,
 authoredCommitment,authoredScene,authoredSignals,recordedAuthoredDecision,
 composeAuthored41Closure} from "../api/jj4-authored41.mjs";
import {classifyAuthoredAdviceWithModel} from "../api/jj4-authored41-intent.mjs";

const title="One of Us Loves Mountains";
const ep=buildAuthored41({title,pilotMode:"shared"});
const event=(role,kind,body)=>({role,kind,phase_index:0,body});
test("model classifier emits structured intent only, never the story",async()=>{
 const saved=globalThis.fetch,old=process.env.OPENAI_API_KEY;
 let calls=0;
 globalThis.fetch=async (url,opts)=>{
  calls++;
  assert.equal(url,"https://api.openai.com/v1/responses");
  const data=JSON.parse(opts.body);
  assert.equal(data.store,false);
  assert.equal(data.text.format.type,"json_schema");
  assert.doesNotMatch(data.instructions,/write.*scene/i);
  return new Response(JSON.stringify({output:[{content:[{type:"output_text",
   text:JSON.stringify({kind:"engage",focus:"ask",motive:"empathy",confidence:0.94})}]}]}),
   {status:200,headers:{"content-type":"application/json"}});
 };
 process.env.OPENAI_API_KEY="synthetic-key-for-mock-only";
 try{
  const decision=await classifyAuthoredAdviceWithModel({
   episode:ep,role:"jack",phase:0,selected:{label:"Own the dismissal"},
   text:"Maybe first ask what rest means to her.",
   fallback:{kind:"unclear",focus:null,motive:"none"}
  });
  assert.deepEqual(decision,{kind:"engage",focus:"ask",motive:"empathy"});
  assert.equal(calls,1);
 }finally{
  globalThis.fetch=saved;
  if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;
 }
});

test("model-selected intent survives into the next scene via the existing saved private reply",()=>{
 const jackOption=authoredOptions(ep,"jack",0).find(x=>x.id==="own");
 const jackChoice=selectedAuthoredChoice(ep,"jack",0,[event("jack","question",jackOption.label)]);
 const coach="Apologize about criticizing the reading weekend.";
 const modelDecision={kind:"engage",focus:"ask",motive:"empathy"};
 const reply=authoredCommitment(jackChoice,coach,{episode:ep,role:"jack",phase:0,interpretation:modelDecision});
 const jillOption=authoredOptions(ep,"jill",0).find(x=>x.id==="own");
 const jillChoice=selectedAuthoredChoice(ep,"jill",0,[event("jill","question",jillOption.label)]);
 const jillCoach="Own the way you dismissed the mountain.";
 const jillReply=authoredCommitment(jillChoice,jillCoach,{episode:ep,role:"jill",phase:0});
 const history=[
  event("jack","question",jackOption.label),
  event("jack","reply",authoredObjection(ep,"jack",0,jackOption.id)),
  event("jack","question",coach),
  event("jack","reply",reply),
  event("jack","coach",coach),
  event("jill","question",jillOption.label),
  event("jill","reply",authoredObjection(ep,"jill",0,jillOption.id)),
  event("jill","question",jillCoach),
  event("jill","reply",jillReply),
  event("jill","coach",jillCoach)
 ];
 assert.equal(recordedAuthoredDecision(ep,"jack",0,jackChoice,coach,history).focus,"ask");
 const story=authoredScene(ep,1,history).scene;
 assert.match(story,/Jack asks which part of the lakeside weekend appeals to Jill most/);
 assert.doesNotMatch(story,/Jack admits he belittled/);
 assert.doesNotMatch(story,/Apologize about criticizing the reading weekend/);
 const state=authoredSignals(ep,history);
 assert.equal(state.jack.accountability,4);
 assert.equal(state.jill.accountability,5);
});

test("low-confidence or unavailable model falls back without story-writing",async()=>{
 const oldKey=process.env.OPENAI_API_KEY,oldFetch=globalThis.fetch;
 delete process.env.OPENAI_API_KEY;
 const fallback={kind:"engage",focus:"own",motive:"empathy"};
 try{
  const result=await classifyAuthoredAdviceWithModel({
   episode:ep,role:"jack",phase:0,selected:{label:"Choose"},text:"Apologize.",fallback});
  assert.deepEqual(result,fallback);
  process.env.OPENAI_API_KEY="mock-only";
  globalThis.fetch=async()=>new Response(JSON.stringify({output:[{content:[{
   type:"output_text",text:JSON.stringify({kind:"engage",focus:"ask",motive:"empathy",confidence:0.55})
  }]}]}),{status:200});
  const uncertain=await classifyAuthoredAdviceWithModel({
   episode:ep,role:"jack",phase:0,selected:{label:"Choose"},text:"Maybe.",fallback});
  assert.equal(uncertain.kind,"unclear");
  assert.equal(uncertain.focus,null);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;
 }
});

test("the five episode closures remain evidence-bound when both people resist",()=>{
 for(const t of ["Can We Talk Later?","A Fight on Vacation","One of Us Loves Mountains","Changing Seasons of Desire"]){
  const story=buildAuthored41({title:t,pilotMode:"shared"}),history=[],scenes=[];
  for(let phase=0;phase<6;phase++){
   scenes.push({phase_index:phase,body:authoredScene(story,phase,history).scene});
   if(phase<4)for(const role of ["jack","jill"]){
    const option=authoredOptions(story,role,phase)[0];
    history.push({role,kind:"question",phase_index:phase,body:option.label},
     {role,kind:"coach",phase_index:phase,body:"Don't apologize, it's their fault."});
   }
  }
  const closure=composeAuthored41Closure(story,scenes);
  assert.match(closure,/did not show a mutually accepted plan/i,t);
  assert.doesNotMatch(closure,/both accepted a specific next step/i,t);
 }
});
