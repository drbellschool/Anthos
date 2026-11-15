import test from "node:test";
import assert from "node:assert/strict";
import {evaluateRun,summarize,DIMENSIONS,HARD_GATES} from "../quality-lab/evaluator.mjs";
import {PROFILES,syntheticCoaching,planMatrix} from "../quality-lab/synthetic.mjs";
const evidence="Jack places a different object on the kitchen table, changing the discussion.";
function fixture(){
 const scenes=Array.from({length:6},(_,phase)=>({
  phase,body:`Jack places object ${phase} on the kitchen table, changing the discussion. Jill reacts with concern rather than a rehearsed smile. They disagree about their options, and a new practical obstacle emerges. Both describe what they want without claiming the other has changed position. The conflict remains a real choice. Jack explains his intention in direct words and Jill asks what will actually happen next. Their small decision affects how they approach the next stage of the problem, without a surprise agreement or invented facts.`
 }));
 let before={lastPhase:-1,objects:[],characters:{jack:{position:"undecided"},jill:{position:"favor"}}};
 const transitions=scenes.map((s,i)=>{
  const next={...before,lastPhase:i},out={phase:i,beforeState:before,afterState:next,eventEvidence:`Jack places object ${i} on the kitchen table`};
  before=next;return out;
 });
 const judgments=Object.fromEntries(Object.keys(DIMENSIONS).map(k=>[k,{score:8.5,evidence:["Specific displayed event and interaction support this dimension."]}]));
 return {id:"synthetic-unit",episodeId:"synthetic",petal:"money-stewardship",mode:"shared",profile:"helpful",
  seed:42,engineCommit:"abc123",model:"fixture-only",episodeVersion:1,scenes,transitions,
  coaching:[{role:"jack",afterPhase:0,disposition:"partly_accept",evidence:"Jack places object 1 on the kitchen table"}],
  closure:{body:"Sophia observes an unresolved practical choice, without inventing a resolution."},
  gates:Object.fromEntries(HARD_GATES.map(k=>[k,true])),judgments,humorBeats:0,costUsd:0.04,latencyMs:5000};
}
test("weights sum to one and the six quality dimensions are distinct",()=>{
 assert.equal(Object.values(DIMENSIONS).reduce((s,x)=>s+x.weight,0),1);
 assert.equal(Object.keys(DIMENSIONS).length,6);
});
test("complete evidence-backed rehearsal is accepted with weighted score",()=>{
 const r=evaluateRun(fixture());
 assert.equal(r.status,"ACCEPTED");assert.equal(r.weightedScore,8.5);
 assert.equal(r.wordCounts.length,6);
});
test("a factual failure defeats even a 10/10 judge score",()=>{
 const run=fixture();run.gates.factual=false;
 Object.values(run.judgments).forEach(x=>x.score=10);
 const r=evaluateRun(run);
 assert.equal(r.weightedScore,10);assert.equal(r.status,"HARD_FAIL");
 assert.deepEqual(r.failedGates,["factual"]);
});
test("unknown privacy or safety gate never passes",()=>{
 const run=fixture();delete run.gates.privacy;
 const r=evaluateRun(run);
 assert.equal(r.status,"UNVERIFIED");assert.ok(r.unknownGates.includes("privacy"));
});
test("missing judge evidence is not counted as a pass",()=>{
 const run=fixture();run.judgments.humor.evidence=[];
 const r=evaluateRun(run);assert.equal(r.weightedScore,null);assert.equal(r.status,"UNVERIFIED");
});
test("lost coaching has a literal subsequent-scene evidence gate",()=>{
 const run=fixture();run.coaching[0].evidence="An action never shown in the generated scene.";
 const r=evaluateRun(run);assert.equal(r.status,"HARD_FAIL");assert.ok(r.failedGates.includes("coaching"));
});
test("contradictory committed state fails regardless of literary quality",()=>{
 const run=fixture();run.transitions[3].beforeState={lastPhase:99};
 const r=evaluateRun(run);assert.equal(r.status,"HARD_FAIL");assert.ok(r.structuralFailures.some(x=>x.includes("continuity")));
});
test("no scored runs produce no invented statistics or zero-dollar cost claims",()=>{
 const stats=summarize([evaluateRun({...fixture(),judgments:{}})]);
 assert.equal(stats.meanScore,null);assert.equal(stats.medianScore,null);assert.equal(stats.scored,0);
});
test("synthetic coaching is deterministic, role-specific and covers requested styles",()=>{
 for(const p of PROFILES){
  assert.equal(syntheticCoaching({seed:17,profile:p,role:"jack",phase:2}),
   syntheticCoaching({seed:17,profile:p,role:"jack",phase:2}));
 }
 assert.ok(PROFILES.includes("humorous")&&PROFILES.includes("adversarial"));
 assert.ok(PROFILES.includes("emotionally_difficult")&&PROFILES.includes("stubborn"));
});
test("editorially incomplete episodes remain unready, never scored as engine failures",()=>{
 const m=planMatrix([{id:"e1",petal:"money-stewardship",mode:"shared",editorialReady:false}]);
 assert.equal(m[0].status,"EDITORIALLY_UNREADY");
});
