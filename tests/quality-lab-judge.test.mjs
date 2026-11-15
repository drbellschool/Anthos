import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {DIMENSIONS,HARD_GATES} from "../quality-lab/evaluator.mjs";
import {judgeSyntheticRun,validateJudgment} from "../quality-lab/judge.mjs";
const quote="Jack moves the chair by the door.";
const sample=()=>({synthetic:true,id:"synthetic-qa",episodeId:"demo",mode:"shared",
  scenes:Array.from({length:6},(_,phase)=>({phase,body:quote+" Jill asks what it means."})),
  closure:{body:"Sophia admits they still disagree and encourages an honest discussion."},
  coaching:[],transitions:null,gates:{}});
const result=()=>({dimensions:Object.fromEntries(Object.keys(DIMENSIONS).map(k=>[k,{
 score:8,evidence:[quote],explanation:"This is an estimate based on actual story wording.",confidence:"medium"}])),
 gates:Object.fromEntries(HARD_GATES.map(k=>[k,{finding:"pass",evidence:quote,explanation:"No clear violation observed."}])),
 summary:"Provisional synthetic evaluation only."});
test("all quality CLI scripts parse under Node, even before credentials are connected",()=>{
 for(const file of ["judge.mjs","run-live.mjs","report.mjs"]){
  assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",new URL("../quality-lab/"+file,import.meta.url).pathname]));
 }
});
test("independent judge grounds every dimension in actual quotes",()=>{
 assert.equal(validateJudgment(result(),sample()),true);
 const invented=result();invented.dimensions.humor.evidence=["This joke never happened anywhere."];
 assert.throws(()=>validateJudgment(invented,sample()),/Unverifiable humor/);
});
test("judge uses one API call and refuses to certify passed privacy/safety gates",async()=>{
 let calls=0;
 const fetchImpl=async(_url,options)=>{
  calls++;
  const body=JSON.parse(options.body);
  assert.equal(body.store,false);assert.equal(body.max_output_tokens,2400);
  return {ok:true,json:async()=>({output:[{content:[{type:"output_text",text:JSON.stringify(result())}]}],
   usage:{input_tokens:630,output_tokens:180}})};
 };
 const judged=await judgeSyntheticRun(sample(),{fetchImpl,key:"synthetic-test-token",model:"fixture-model"});
 assert.equal(calls,1);
 assert.equal(judged.previewEvaluation.weightedScore,8);
 assert.equal(judged.previewEvaluation.status,"UNVERIFIED");
 assert.equal(judged.judge.inputTokens,630);
 assert.equal(judged.judge.costUsd,null);
 assert.equal(judged.gates.privacy,null);
 assert.equal(judged.gates.safety,null);
});
test("independent judge refuses real participant inputs",async()=>{
 await assert.rejects(()=>judgeSyntheticRun({...sample(),synthetic:false},{key:"fake"}),/Refusing non-synthetic/);
});
test("judge can signal an evidenced hard failure but not a bare unsupported allegation",async()=>{
 const x=result();x.gates.factual={finding:"fail",evidence:quote,explanation:"Conflicts with established fact"};
 const fetchImpl=async()=>({ok:true,json:async()=>({output:[{content:[{type:"output_text",text:JSON.stringify(x)}]}]})});
 const r=await judgeSyntheticRun(sample(),{key:"fake",fetchImpl});
 assert.equal(r.previewEvaluation.status,"HARD_FAIL");
 assert.ok(r.previewEvaluation.failedGates.includes("factual"));
 x.gates.factual.evidence="An entirely invented statement that never appears in the transcript.";
 await assert.rejects(()=>judgeSyntheticRun(sample(),{key:"fake",fetchImpl}),/Ungrounded factual/);
});
