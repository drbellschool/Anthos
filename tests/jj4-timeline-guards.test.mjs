import test from "node:test";
import assert from "node:assert/strict";
import {committedTimelineViolation} from "../api/jj4-timeline-guards.mjs";

test("Batch 1: replaying Jack fastening his watch for the same meeting is rejected",()=>{
 const history=[{body:"Jack tightened his watch strap as Jill stopped him. Jack's brisk exit left her in the kitchen."}];
 const scene="Jack tightened his watch and said, 'We'll talk later,' then hurried to the door.";
 const out=committedTimelineViolation(history,scene);
 assert.equal(out.ok,false);
 assert.equal(out.code,"replayed_completed_action");
});
test("checking a watch after fastening it is not another fastening",()=>{
 const history=[{body:"Jack tightened his watch strap and said 'later'."}];
 const out=committedTimelineViolation(history,"Jack checked his watch again, worrying he was late.");
 assert.deepEqual(out,{ok:true});
});
test("Batch 1: scene cannot move from kitchen to porch twice without returning inside",()=>{
 const history=[{body:"Jack brings two mugs to the porch. Jill accepts a mug, settling in. They sip quietly."}];
 const bad="They move slowly from kitchen to porch, mugs in hand. Jack looks relieved.";
 const result=committedTimelineViolation(history,bad);
 assert.equal(result.ok,false);
 assert.equal(result.code,"location_replay");
});
test("return to kitchen in a subsequent scene permits fresh porch trip",()=>{
 const history=[{body:"Jack walks to the porch. Jill follows and they sit."},
   {body:"Jack returns to the kitchen and Jill follows."}];
 const next="Jack walks to the porch carrying two mugs as Jill follows.";
 assert.deepEqual(committedTimelineViolation(history,next),{ok:true});
});
test("Batch 1: invented joint agreement is rejected when the only acceptance is a question",()=>{
 const previous=[{body:"Jill asked Jack to return to the conversation."}];
 const scene='Jack asked, "Would 8:30 tonight work?" Jill replied, "Can we agree that you will text me earlier?" They agreed on the 8:30 call.';
 const out=committedTimelineViolation(previous,scene);
 assert.equal(out.ok,false);
 assert.equal(out.code,"unearned_agreement");
});
test("an actual spoken acceptance makes joint agreement possible",()=>{
 const history=[{body:"Jack asks about planning tomorrow."}];
 const scene='Jack offered 8:30 tonight. Jill said, "Yes, 8:30 works for me." They agreed to talk tonight.';
 assert.deepEqual(committedTimelineViolation(history,scene),{ok:true});
});
test("a factual callback is not a replay",()=>{
 const history=[{body:"Jack removed the old note from the dead microwave."}];
 const scene='Jack glanced at the note on the counter. Jill broke the seal on the new box. He looked worried.';
 assert.deepEqual(committedTimelineViolation(history,scene),{ok:true});
});
