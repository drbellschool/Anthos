import test from "node:test";
import assert from "node:assert/strict";
import {unsupportedExternalPolicyClaims,checkCoachingTrace,checkSceneLength,asksForHumor,unearnedMicrowaveActivation,abruptLocationJump,wrongSpeakerForQuotedCoaching} from "../api/jj4-quality-guards.mjs";

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

test("blocks powered microwave before it is connected",()=>{
 assert.equal(unearnedMicrowaveActivation("The new microwave hums on the counter.",[
  {body:"Jill broke the packing tape, slid the microwave out of the box and placed it on the counter."}
 ]),true);
 assert.equal(unearnedMicrowaveActivation("The microwave beeps as Jill turns away.",[]),true);
});
test("accepts earned appliance power or an unpowered discussion",()=>{
 assert.equal(unearnedMicrowaveActivation("The new microwave hums on the counter.",[
  {body:"The electrician installed the microwave, connected it to power and verified the outlet."}
 ]),false);
 assert.equal(unearnedMicrowaveActivation("Jill asks when the new microwave can be installed.",[]),false);
});

test("location continuity flags unexplained porch-to-couch teleport",()=>{
 const before="Jill held her tea while the pair sat on the porch, still unsure how to reconnect.";
 const wrong="Jack sat on their worn couch, running his finger around a cup of tea. Jill looked at him.";
 assert.equal(abruptLocationJump(before,wrong).ok,false);
 assert.match(abruptLocationJump(before,wrong).reason,/porch to couch/);
 const earned="Jack walked in from the porch and sat on their worn couch. Jill followed him.";
 assert.deepEqual(abruptLocationJump(before,earned),{ok:true});
});
test("location guard ignores already established scenes and ungrounded locations",()=>{
 assert.deepEqual(abruptLocationJump("They were on the porch.", "Jack stayed on the porch and looked at Jill."),{ok:true});
 assert.deepEqual(abruptLocationJump("Jack glanced at the box.", "He suggested they go outside."),{ok:true});
});
test("private coach's exact line cannot be spoken by the wrong character",()=>{
 const advice={jill:'Tell Jill to say "Your Saturday note belongs in the museum of broken promises." Do not apologize.'};
 const wrong='Jack stares at the note and says, "Your Saturday note belongs in the museum of broken promises." Jill frowns.';
 assert.equal(wrongSpeakerForQuotedCoaching(wrong,advice).ok,false);
 const good='Jill looks at Jack and quips, "Your Saturday note belongs in the museum of broken promises." Jack winces.';
 assert.deepEqual(wrongSpeakerForQuotedCoaching(good,advice),{ok:true});
});
test("private-coach attribution does not penalize paraphrases or harmless questions",()=>{
 const advice={jill:'Tell her to say "Your Saturday note belongs in the museum of broken promises."'};
 const paraphrase='Jack studies the note. Jill calls it a monument to postponed chores.';
 assert.deepEqual(wrongSpeakerForQuotedCoaching(paraphrase,advice),{ok:true});
});
