import test from "node:test";
import assert from "node:assert/strict";
import {unsupportedExternalPolicyClaims,checkCoachingTrace,checkSceneLength,asksForHumor} from "../api/jj4-quality-guards.mjs";

test("refuses made-up 30-day retailer refund claim",()=>{
 const scene='Jack reads the fine print: "We have 30 days to return it but the receipt is required." Jill frowns.';
 assert.equal(unsupportedExternalPolicyClaims(scene,["Return policy is unknown."]).length,1);
});
test("does not confuse a question with a confirmed policy",()=>{
 assert.deepEqual(unsupportedExternalPolicyClaims('Jack asks, "Could we return it within 30 days?" Jill shrugs.',[]),[]);
});
test("respects explicitly authored confirmed policy",()=>{
 assert.deepEqual(unsupportedExternalPolicyClaims('The store policy gives us 30 days to return it.',["The store has a 30 days return policy."]),[]);
});
test("blocks unsupported return requirements even without numbers",()=>{
 assert.equal(unsupportedExternalPolicyClaims("Jill says the receipt must accompany any return.",[]).length,1);
});
test("allows decisions and requests that are not external rules",()=>{
 assert.deepEqual(unsupportedExternalPolicyClaims("Jack says, 'Let's leave it sealed for a week and then decide whether to return it.'",[]),[]);
});
test("coached behavior and consequence need exact visible scene anchors",()=>{
 const story="Jack says, 'I will not accuse her without proof.' Jill looks surprised and her anger gives way to a wary question.";
 const trace={jackEvidence:"Jack says, 'I will not accuse her without proof.'",jillEvidence:"",falloutEvidence:"Jill looks surprised and her anger gives way to a wary question."};
 assert.deepEqual(checkCoachingTrace(story,trace,["jack"]),{ok:true});
 assert.equal(checkCoachingTrace(story,{...trace,jackEvidence:"Jack became a better listener."},["jack"]).ok,false);
 assert.equal(checkCoachingTrace(story,{...trace,falloutEvidence:"Everyone is now happier."},["jack"]).ok,false);
});
test("does not require private advice evidence when there is no checkpoint",()=>{
 assert.deepEqual(checkCoachingTrace("A quiet kitchen.",{},[]),{ok:true});
});
test("recognizes explicit humorous cue without inventing advice",()=>{
 assert.equal(asksForHumor("Tell Jill the note belongs in a museum."),true);
 assert.equal(asksForHumor("Ask for a serious discussion."),false);
});
test("scene lengths are objectively counted",()=>{
 assert.equal(checkSceneLength("Jack opened the door.",1,5).words,4);
 assert.equal(checkSceneLength("Jack opened the door.",5,7).ok,false);
});
