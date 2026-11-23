import test from "node:test";
import {spawnSync} from "node:child_process";
import assert from "node:assert/strict";
import {LIVE43_DIMENSIONS,LIVE43_HARD_CHECKS,verifyLivePilot43,assertLivePilotKey43} from "../lib/atlas-live-qa-contract.mjs";

function fixture(n=10){
 const couples=Array.from({length:n},(_,i)=>({
  id:"c"+i,completed:true,errors:[],focusCoverage:{complete:true},
  days:Array.from({length:5},(_,d)=>({turns:["jack","jill"].map(role=>({
   role,advice:"Coach "+role+" to observe the microwaved noodles tonight, day "+d,
   reply:"I noticed our broken microwave was inconvenient again, so I asked a practical question about the decision "+i+"-"+d+"-"+role+".",
   replySource:"model-validated",replyModelAttempts:1,
   replyProviderResponseId:"resp_realfixture_"+i+"_"+d+"_"+role,
   replyProviderModel:"gpt-4.1-mini",
   replyValidationIssue:null,replyHumorResponse:"not_applicable",replyHumorEvidence:""
  }))}))
 }));
 const reviews=couples.map(c=>({coupleId:c.id,provenance:"human-reviewed-live-transcript",
  reviewer:"Quality Lab reviewer",reviewedAt:"2026-11-22T18:00:00Z",
  scores:Object.fromEntries(LIVE43_DIMENSIONS.map(d=>[d,8.2])),
  evidence:Object.fromEntries(LIVE43_DIMENSIONS.map(d=>[d,c.days[0].turns[0].reply.slice(0,35)])),
  hardChecks:Object.fromEntries(LIVE43_HARD_CHECKS.map(k=>[k,true])),
  criticalFailure:false
 }));
 return {couples,reviews};
}
test("Real-model ten-couple quality contract accepts complete grounded human review",()=>{
 const r=verifyLivePilot43(fixture());
 assert.equal(r.passed,true,JSON.stringify(r.problems));
 assert.equal(r.metrics.liveValidatedTurns,100);
 assert.equal(r.metrics.humanReviews,10);
});
test("Mock/offline dialogue and absent real-model calls fail, even with perfect reviews",()=>{
 const x=fixture();
 x.couples[0].days[0].turns[0].replySource="offline-template";
 const r=verifyLivePilot43(x);
 assert.equal(r.passed,false);
 assert.ok(r.problems.includes("c0:day-0-jack-not-validated-live-model"));
});
test("Human ratings require ten dimensions, 8 mean, 7 floor, direct transcript citations and zero critical failures",()=>{
 const x=fixture();
 x.reviews[0].scores.humorAndPlayfulness=6.5;
 x.reviews[1].scores.characterAgency=0;
 x.reviews[2].criticalFailure=true;
 x.reviews[3].evidence.storyContinuity="fictional quotation nowhere in the transcript";
 x.reviews[4].scores.dialogueNaturalness=undefined;
 const r=verifyLivePilot43(x);
 assert.equal(r.passed,false);
 assert.ok(r.problems.some(p=>p.includes("dimension-below-7")));
 assert.ok(r.problems.some(p=>p.includes("mean-below-8")));
 assert.ok(r.problems.includes("c2:critical-quality-failure"));
 assert.ok(r.problems.includes("c3:missing-cited-quality-evidence-storyContinuity"));
 assert.ok(r.problems.includes("c4:missing-rubric-dimensions"));
});
test("Ten complete distinct couples and one Jack and Jill turn per day are mandatory",()=>{
 const x=fixture();
 x.couples[0].days[2].turns.pop();
 x.couples[1].completed=false;
 x.couples[2].errors.push("invented repair");
 x.couples[3].focusCoverage.complete=false;
 const r=verifyLivePilot43(x);
 assert.equal(r.passed,false);
 assert.ok(r.problems.includes("c0:day-2-invalid-coaching-pair"));
 assert.ok(r.problems.includes("c1:incomplete-five-day-story"));
 assert.ok(r.problems.includes("c2:canonical-violations"));
 assert.ok(r.problems.includes("c3:missing-focus-opportunities"));
});
test("Missing report is not a green quality test",()=>{
 const r=verifyLivePilot43({});
 assert.equal(r.passed,false);
 assert.ok(r.problems.includes("expected-10-completed-couples"));
});

test("Real ten-couple runner has a mandatory fail-closed key preflight",()=>{
 assert.throws(()=>assertLivePilotKey43(undefined),/ANTHOS LIVE QA BLOCKED/);
 assert.throws(()=>assertLivePilotKey43(" "),/ANTHOS LIVE QA BLOCKED/);
 assert.equal(assertLivePilotKey43("injected-by-protected-qa-environment"),true);
});
test("A missing protected live-model report cannot certify the release",()=>{
 const p=spawnSync(process.execPath,["scripts/verify-atlas-live-pilot.mjs"],{
  cwd:new URL("..",import.meta.url).pathname,
  env:{...process.env,ANTHOS_QA_REPORT_PATH:""},
  encoding:"utf8",timeout:10000
 });
 assert.equal(p.status,1);
 assert.match(p.stderr||"",/no protected live-model ten-couple report/i);
});

test("Quality certification cannot average away safety, duplicate facts or missing evidence",()=>{
 const x=fixture();
 x.reviews[0].hardChecks.consentAndRespect=false;
 x.reviews[1].hardChecks.noDoubleCountedEvidence=undefined;
 x.reviews[2].evidence.dialogueNaturalness="";
 const r=verifyLivePilot43(x);
 assert.equal(r.passed,false);
 assert.ok(r.problems.includes("c0:missing-or-failed-hard-check-consentAndRespect"));
 assert.ok(r.problems.includes("c1:missing-or-failed-hard-check-noDoubleCountedEvidence"));
 assert.ok(r.problems.includes("c2:missing-cited-quality-evidence-dialogueNaturalness"));
});
