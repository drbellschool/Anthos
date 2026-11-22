import test from "node:test";
import assert from "node:assert/strict";
import {skillMovement,incidentalIntimacyReview,applyObservationOnce,memoryContext,repeatedAnnouncement,qualityGate}
 from "../api/insight-atlas-model.mjs";

test("Evidence-less or unconfident claims never change scores",()=>{
 const base={oldScore:3.2,sourceRef:"msg:18",subject:"jack",skillId:"i-nontransactional"};
 assert.equal(skillMovement({...base,observedRating:null}).delta,0);
 assert.equal(skillMovement({...base,observedRating:1,confidence:0.4}).recordable,false);
 assert.throws(()=>skillMovement({...base,observedRating:1,sourceRef:""}),/citation/);
});

test("Coach observation and Jack's behavior are separately recorded and bounded",()=>{
 const r=skillMovement({oldScore:3.2,observedRating:1,confidence:1,sourceRef:"msg:18",subject:"husband",skillId:"i-nontransactional"});
 assert.equal(r.newScore,2.85);
 assert.equal(r.delta,-0.35);
 const jack={subject:"jack",skillId:"i-nontransactional",score:3.2,evidenceCount:0};
 const noAction=applyObservationOnce(jack,{sourceRef:"msg:18",rating:null},new Set());
 assert.equal(noAction.state.score,3.2);
 const enacted=applyObservationOnce(jack,{sourceRef:"event:jack-said-quid-pro-quo",rating:1},new Set());
 assert.equal(enacted.state.score,2.85);
 assert.equal(applyObservationOnce(enacted.state,{sourceRef:"event:jack-said-quid-pro-quo",rating:1},new Set(["event:jack-said-quid-pro-quo"])).applied,false);
});

test("Useful advice can move an incidental skill upward",()=>{
 const m=skillMovement({oldScore:2.7,observedRating:5,sourceRef:"coach:friday",subject:"wife",skillId:"i-sexual-respect",confidence:1});
 assert.ok(m.delta>0);assert.ok(m.delta<=0.35);
});

test("Coercive transactional recommendation is classified while negation and pure jokes are not",()=>{
 const bad=incidentalIntimacyReview("Tell Jack she has to earn the microwave and go down on you, haha.");
 assert.equal(bad.interpretation,"joke-with-instruction");
 assert.equal(bad.observations.find(x=>x.skillId==="i-nontransactional").rating,1);
 assert.equal(incidentalIntimacyReview("Don't tell Jill she has to earn the microwave with sex. That would be wrong.").interpretation,"rejects-transaction");
 assert.equal(incidentalIntimacyReview("What a ridiculous joke: buying a microwave is no romance.").observations.length,0);
});

test("Annual incident memory is retrieved as context only; references aren't double scoring",()=>{
 const memories=[{memoryKey:"microwave",summary:"Jack made a poor transactional joke",skillIds:["i-nontransactional"],salience:5,originatingEvidenceId:123}];
 const x=memoryContext(memories,["i-nontransactional"]);assert.equal(x.length,1);assert.equal(x[0].referenceOnly,true);
 assert.equal(memoryContext(memories,["i-nontransactional"],["microwave"]).length,0);
});

test("Repeated Friday repair call presented as news is flagged",()=>{
 assert.ok(repeatedAnnouncement("Jack actually made the repair call. The box is still sealed.",[
  "Jack actually made the repair call. We don't have a price yet."
 ]).length>0);
 assert.equal(repeatedAnnouncement("Jack told me what the repair shop needs from us next.",[
  "Jack actually made the repair call."
 ]).length,0);
});

test("8/10 gate is strict; never a promise of perfect conversation",()=>{
 const dims=["continuity","advancement","coachingImpact","characterAgency","nonrepetition","skills","emotionalRealism","humor","consentSafety","evidenceIntegrity"];
 const all=Object.fromEntries(dims.map(k=>[k,9]));
 assert.equal(qualityGate({scores:all}).pass,true);
 assert.equal(qualityGate({scores:{...all,nonrepetition:6}}).pass,false);
 assert.equal(qualityGate({scores:all,criticalFailures:["fabricated-repair"]}).pass,false);
 assert.equal(qualityGate({scores:all,requiredRefs:["msg-1"],evidenceRefs:[]}).pass,false);
});
