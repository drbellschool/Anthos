import test from "node:test";
import assert from "node:assert/strict";
import {STORY_QUALITY_VERSION,assertStoryQualityContract,reviewStoryReply,MICROWAVE_STORY_QUALITY} from "../lib/anthos-story-quality.mjs";
const voices={
 jack:{voice:"dry",coreNeed:"fairness",flaw:"avoidance",relationship:"cares about Jill"},
 jill:{voice:"candid",coreNeed:"reliability",flaw:"impatient",relationship:"cares about Jack"}
};
const WORLD={who:"Jack and Jill",what:"A shared decision",where:"The home",when:"Tuesday",why:"Competing needs"};
function fixture(id,rule){return {version:STORY_QUALITY_VERSION,episodeId:id,world:WORLD,
 characterVoices:voices,objects:[],invariants:[rule]};}
test("Microwave QA rejects subtle premature-purchase joke even when no new action was claimed",()=>{
 const r=reviewStoryReply("Declaring Saturday a microwave holiday might get it fixed before we need a new one.",{
  role:"jack",contract:MICROWAVE_STORY_QUALITY});
 assert.equal(r.ok,false);
 assert.ok(r.critical.includes("canonical-implication:purchase-already-completed"));
});
test("A natural joke grounded in completed purchase survives the same contract",()=>{
 const r=reviewStoryReply("Three Saturdays? My calendar wants a witness. Doesn't undo Jill's $400 purchase, though.",{
  role:"jack",contract:MICROWAVE_STORY_QUALITY});
 assert.equal(r.ok,true);
});
test("Fourth-wall leaks are blocked for both roles in any episode",()=>{
 const c=fixture("camping-trip",{id:"trip-booked",fact:"Tickets booked",forbiddenImplications:["before we book"]});
 assert.ok(reviewStoryReply("The coach says I should apologize.",{role:"jill",contract:c})
  .critical.includes("fourth-wall-role-leak"));
 assert.equal(reviewStoryReply("I'm annoyed, but I can admit I rushed.",{role:"jill",contract:c}).ok,true);
});
test("Future independent vacation and family-event story facts are enforced, not microwave rules",()=>{
 const vacation=fixture("vacation",{id:"train-already-left",fact:"The train left at 8.",
  forbiddenImplications:["the train hasn't left yet"]});
 const birthday=fixture("birthday",{id:"cake-delivered",fact:"The cake was delivered.",
  forbiddenImplications:["before the cake arrives"]});
 assert.ok(reviewStoryReply("The train hasn't left yet, so we're fine.",{role:"jack",contract:vacation})
  .critical.includes("canonical-implication:train-already-left"));
 assert.ok(reviewStoryReply("We can decide before the cake arrives.",{role:"jill",contract:birthday})
  .critical.includes("canonical-implication:cake-delivered"));
 assert.equal(reviewStoryReply("We already bought the replacement microwave.",{role:"jack",contract:vacation}).ok,true);
});
test("Absent, incomplete or duplicate scenario world contracts fail closed",()=>{
 assert.throws(()=>assertStoryQualityContract(),/contract required/);
 assert.throws(()=>assertStoryQualityContract(fixture("missing",{id:"a",fact:"x",forbiddenImplications:[]})
  && {...fixture("missing",{id:"a",fact:"x",forbiddenImplications:[]}),world:{what:"only"}}),/episode who/);
 const x=fixture("ambiguous",{id:"a",fact:"one",forbiddenImplications:["not yet done"]});
 x.invariants.push({...x.invariants[0]});
 assert.throws(()=>assertStoryQualityContract(x),/duplicate canonical invariant/);
});
test("Verbatim repeats are blocked and high-overlap rewording is marked for human review",()=>{
 const prior="I called a shop today but got no price and didn't arrange a repair. I'm worried about our savings and still need to talk to Jill about it.";
 const r=reviewStoryReply(prior,{role:"jack",contract:MICROWAVE_STORY_QUALITY,priorReplies:[prior]});
 assert.ok(r.critical.includes("identical-character-reply"));
 const q=reviewStoryReply(prior+" I feel embarrassed.",{role:"jack",contract:MICROWAVE_STORY_QUALITY,priorReplies:[prior]});
 assert.ok(q.advisory.includes("high-dialogue-overlap-needs-review"));
});
test("Repeated generic closing filler is reviewable without inventing a hard error",()=>{
 const r=reviewStoryReply("It's complicated, but baby steps.",{role:"jill",
  contract:MICROWAVE_STORY_QUALITY,priorReplies:["Well, baby steps."]});
 assert.equal(r.ok,true);assert.ok(r.advisory.includes("recycled-conversational-filler"));
});
