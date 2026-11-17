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


test("live retest: Jack cannot pause at the door after his car already left",()=>{
 const history=[{body:"Jack fastens his watch. He heads out. Jack's car drives away while Jill waits."}];
 const scene='Jack pauses at the door. "Could we agree to speak Sunday?" he asks, then closes the door.';
 const out=committedTimelineViolation(history,scene);
 assert.equal(out.ok,false);
 assert.equal(out.code,"replayed_departure");
});
test("an actual return home permits a separate doorway action",()=>{
 const history=[{body:"Jack's car drives away."},
  {body:"After his work meeting, Jack returns home and unlocks the front door."}];
 assert.deepEqual(committedTimelineViolation(history,"Jack grabs his keys and walks to the door."),{ok:true});
});
test("calling Jill from the car does not replay a doorway departure",()=>{
 const history=[{body:"Jack's car drives away."}];
 assert.deepEqual(committedTimelineViolation(history,'Jack calls Jill from the car. "Can we set a time?"'),{ok:true});
});


test("live generic-ledger regression: car departure cannot become kitchen doorway next scene",()=>{
 const history=[
  {body:"Jack left quickly, his watch buzzing as Jill stared at the calendar."},
  {body:"Jack sat in his car and texted Jill while she remained in the kitchen."},
  {body:"Jack's phone buzzed as his meeting began; Jill replied to his text."}
 ];
 const wrong='Jack paused at the kitchen doorway, watched his phone, and texted Jill: "Can we shift our talk to tonight?"';
 const result=committedTimelineViolation(history,wrong);
 assert.equal(result.ok,false);
 assert.equal(result.code,"replayed_departure");
});
test("after leaving for meeting, in-car texts remain valid",()=>{
 const history=[{body:"Jack left quickly; Jill remained in the kitchen."}];
 const story='Jack sat in his car and texted Jill, asking whether she could talk after his meeting.';
 assert.deepEqual(committedTimelineViolation(history,story),{ok:true});
});


test("full pilot: scheduled 2:15 call cannot replay in Reflection",()=>{
 const history=[
  {body:"At 2:15, Jack's phone buzzed in his cramped office. He dialed Jill, determined to keep his promise amid work pressure."}
 ];
 const bad="Jack called Jill promptly at 2:15, voice brisk: 'I'm here, as promised, but can only spare a few minutes.'";
 const result=committedTimelineViolation(history,bad);
 assert.equal(result.ok,false);
 assert.equal(result.code,"replayed_scheduled_call");
});
test("a proposed 2:15 call is not incorrectly recorded as completed",()=>{
 const history=[{body:"Jack promised Jill he'd call at 2:15, but he hasn't dialed yet."}];
 const now="At 2:15, Jack called Jill from his desk and she answered.";
 assert.deepEqual(committedTimelineViolation(history,now),{ok:true});
});


test("saved six-scene QA: a Sunday call cannot occur before any Sunday transition",()=>{
 const history=[
  {body:"From his car, Jack texted Jill, 'Let's talk Sunday after lunch? Can you hold till then?'"},
  {body:"Jill replied that she would hold until Sunday, but was worried."},
  {body:"Jack set a Sunday alarm to remind him to call Jill."}
 ];
 const unearned='Jack sat in his parked car. He texted, "Starting the call now." Jill answered cautiously.';
 const result=committedTimelineViolation(history,unearned);
 assert.equal(result.ok,false);
 assert.equal(result.code,"unearned_future_call");
});

test("a clearly narrated arrival of the scheduled day permits an earned call",()=>{
 const history=[{body:"Jack and Jill agreed to talk Sunday after lunch."}];
 const result=committedTimelineViolation(history,
  'On Sunday, Jack sat in his car and texted Jill, "Starting the call now." Jill answered and they spoke.');
 assert.deepEqual(result,{ok:true});
});

test("planning or checking an upcoming call is not mistaken for completing it",()=>{
 const history=[{body:"Jack promised Jill they would talk Friday after dinner."}];
 const result=committedTimelineViolation(history,
  'Jack set a Friday reminder and texted Jill that their call was still scheduled.');
 assert.deepEqual(result,{ok:true});
});
