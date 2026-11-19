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
