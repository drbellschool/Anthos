import test from "node:test";
import assert from "node:assert/strict";
import {recoverCoachingEvidence,checkCoachingTrace,groundCoachingEvidence} from "../api/jj4-quality-guards.mjs";
import {readFileSync} from "node:fs";
const directed={
 opening:"Jill stands beside the box.",
 jackBeat:"Jack wrote a repair estimate reminder on his phone. He said he would phone the shop tomorrow.",
 jillBeat:"Jill refused to promise she would return the microwave before they knew the alternatives.",
 fallout:"Jill frowned at the reminder because three missed Saturdays had already hurt her trust.",
};
const story=Object.values(directed).join(" ");
test("paraphrased model trace recovered only from observable on-stage directed beats",()=>{
 const raw={jackEvidence:"He considered checking something",jillEvidence:"",falloutEvidence:"Their bond was stronger"};
 const trace=recoverCoachingEvidence(story,directed,raw,["jack"]);
 assert.match(trace.jackEvidence,/Jack wrote a repair estimate reminder/);
 assert.match(trace.falloutEvidence,/Jill frowned at the reminder/);
 assert.equal(checkCoachingTrace(story,trace,["jack"]).ok,true);
 assert.ok(story.includes(trace.jackEvidence));
 assert.ok(story.includes(trace.falloutEvidence));
});
test("uncoached other role is not attributed the coach's private behavior",()=>{
 const trace=recoverCoachingEvidence(story,directed,{jackEvidence:"",jillEvidence:"",falloutEvidence:""},["jill"]);
 assert.match(trace.jillEvidence,/Jill refused/);
 assert.equal(trace.jackEvidence,"");
 assert.equal(checkCoachingTrace(story,trace,["jill"]).ok,true);
});
test("generic emotion or fictional metadata alone cannot produce evidence",()=>{
 const beats={jackBeat:"Jack feels the weight of everyone's expectations.",jillBeat:"Jill understands him better.",fallout:"Their relationship grows despite the difficult moment."};
 const txt=Object.values(beats).join(" ");
 const trace=recoverCoachingEvidence(txt,beats,{},["jack"]);
 assert.equal(trace.jackEvidence,"");
 assert.equal(trace.falloutEvidence,"");
 assert.equal(checkCoachingTrace(txt,trace,["jack"]).ok,false);
});
test("never invent a grounded quote that was cut from the final scene",()=>{
 const edited="Jill shook her head. Jack nodded slowly.";
 const trace=recoverCoachingEvidence(edited,directed,{},["jack"]);
 assert.equal(trace.jackEvidence,"");
 assert.equal(trace.falloutEvidence,"");
});
test("core calls evidence recovery before rejecting scene",()=>{
 const code=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
 assert.match(code,/recoverCoachingEvidence\(story,result,modelTrace,Object\.keys\(influence\.advice\)\)/);
});

test("an opposing character reaction is valid fallout evidence",()=>{
 const beats={
  opening:"Jill stands beside the microwave.",
  jackBeat:"Jack wrote a phone reminder to call the repair shop.",
  jillBeat:"Jill frowned when Jack said he would call tomorrow.",
  fallout:"The tension remains unresolved."
 };
 const story=Object.values(beats).join(" ");
 const trace=recoverCoachingEvidence(story,beats,{},["jack"]);
 assert.match(trace.jackEvidence,/Jack wrote a phone reminder/);
 assert.match(trace.falloutEvidence,/Jill frowned/);
 assert.equal(checkCoachingTrace(story,trace,["jack"]).ok,true);
});
test("abstract emotions do not become invented fallout",()=>{
 const beats={
  opening:"Jack waits.",
  jackBeat:"Jack wrote a phone reminder to call the repair shop.",
  jillBeat:"Jill understands the importance of communication.",
  fallout:"Their relationship develops renewed mutual understanding."
 };
 const story=Object.values(beats).join(" ");
 const trace=recoverCoachingEvidence(story,beats,{},["jack"]);
 assert.equal(trace.falloutEvidence,"");
 assert.equal(checkCoachingTrace(story,trace,["jack"]).ok,false);
});

test("role-labeled Jill beat grounds a third-person visible refusal",()=>{
 const beats={
  opening:"Jack gestures toward the counter.",
  jackBeat:"Jack asks what Jill intends to do about the purchase.",
  jillBeat:"She refuses to seal away the receipt without checking their options.",
  fallout:"Jack turns away and closes the cabinet with a frustrated sigh."
 };
 const story=Object.values(beats).join(" ");
 const trace=recoverCoachingEvidence(story,beats,{},["jill"]);
 assert.match(trace.jillEvidence,/She refuses/);
 assert.equal(checkCoachingTrace(story,trace,["jill"],beats).ok,true);
 assert.equal(checkCoachingTrace(story,trace,["jill"]).ok,false);
});
test("role beat cannot misattribute named opposite character",()=>{
 const beats={
  opening:"Jack and Jill both wait.",
  jackBeat:"Jack asks what Jill intends to do.",
  jillBeat:"Jack refuses to return the microwave, despite Jill's concern.",
  fallout:"Jill asks him not to decide for her."
 };
 const story=Object.values(beats).join(" ");
 const trace=recoverCoachingEvidence(story,beats,{},["jill"]);
 assert.equal(checkCoachingTrace(story,trace,["jill"],beats).ok,false);
});

test("Jill speaking her own line is enough grounded coaching evidence even without model metadata",()=>{
 const beats={
 opening:"Jack looks at the sealed box.",
 jackBeat:"Jack asks Jill to reconsider spending the savings.",
 jillBeat:"Jill replies, \"I will not return the new microwave until we know the alternatives.\"",
 fallout:"Jack pulls the chair away from the counter in frustration."
 };
 const story=Object.values(beats).join(" ");
 const trace=recoverCoachingEvidence(story,beats,{},["jill"]);
 assert.match(trace.jillEvidence,/Jill replies/);
 assert.equal(checkCoachingTrace(story,trace,["jill"],beats).ok,true);
});
