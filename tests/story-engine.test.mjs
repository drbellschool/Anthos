import test from "node:test";
import assert from "node:assert/strict";
import {transition,STORY_VERSION,CHAPTER_COUNT,MASTERY_CHAPTER} from "../core/story-engine.mjs";

const step=(state,type,options={})=>transition(state,{type,...options});
test("story is versioned and must complete authored milestones in order",()=>{
  let s=transition(null,{type:"START"}).state;
  assert.equal(s.chapter,1);assert.equal(s.completed,0);assert.equal(s.version,STORY_VERSION);
  assert.equal(CHAPTER_COUNT,8);assert.equal(MASTERY_CHAPTER,7);
  for(let chapter=1;chapter<=8;chapter++){
    const before=step(s,"COMPLETE_MILESTONE");
    if([2,4,7].includes(chapter)){
      assert.equal(before.status,"NEEDS_CHOICE");
      assert.equal(before.state.completed,s.completed);
      s=step(s,"CHOICE",{option:0}).state;
    }
    const res=step(s,"COMPLETE_MILESTONE");
    assert.equal(res.state.completed,chapter);
    assert.equal(res.status,chapter===8?"STORY_COMPLETE":"CHAPTER_COMPLETE");
    s=res.state;
  }
  assert.equal(s.closed,true);assert.equal(s.completed,8);
  assert.equal(s.mastery,"DEMONSTRATED");
  assert.equal(step(s,"COMPLETE_MILESTONE").status,"COMPLETE");
});
test("off-topic diversion does not advance or discard chapter state",()=>{
  let s=transition(null,{type:"START"}).state;
  s=step(s,"COMPLETE_MILESTONE").state; // chapter 2
  const first=step(s,"OFF_TOPIC");
  assert.equal(first.status,"REDIRECT");
  assert.equal(first.state.chapter,2);
  assert.equal(first.state.completed,1);
  const second=step(first.state,"OFF_TOPIC");
  assert.equal(second.status,"RETURN_TO_GOAL");
  assert.equal(second.state.completed,1);
  assert.equal(second.state.detours[2],2);
});
test("no overwritten choices, mastery from authored choice only, repair bounded",()=>{
  let s=transition(null,{type:"START"}).state;
  s=step(s,"COMPLETE_MILESTONE").state;
  let selected=step(s,"CHOICE",{option:1});
  assert.equal(selected.status,"CHOICE_RECORDED");
  assert.equal(selected.state.choices[2].quality,0);
  assert.equal(step(selected.state,"CHOICE",{option:0}).status,"REJECTED");
  const repair=step(selected.state,"REPAIR");
  assert.equal(repair.status,"REPAIR_PRACTICED");
  assert.equal(repair.state.choices[2].quality,0);
  assert.equal(step(repair.state,"REPAIR").status,"REJECTED");
  s=step(repair.state,"COMPLETE_MILESTONE").state;
  s=step(s,"COMPLETE_MILESTONE").state; // ch 3
  s=step(s,"CHOICE",{option:4}).state; // ch 4
  s=step(s,"COMPLETE_MILESTONE").state;
  s=step(s,"COMPLETE_MILESTONE").state; // ch 5
  s=step(s,"COMPLETE_MILESTONE").state; // ch 6
  assert.equal(s.chapter,7);
  s=step(s,"CHOICE",{option:1}).state;
  assert.equal(s.mastery,"NOT_YET_DEMONSTRATED");
  assert.equal(step(s,"REPAIR").status,"REJECTED");
  s=step(s,"COMPLETE_MILESTONE").state;
  s=step(s,"COMPLETE_MILESTONE").state;
  assert.equal(s.closed,true);assert.equal(s.mastery,"NOT_YET_DEMONSTRATED");
});
test("safety override pauses progress, requiring explicit clearance to resume same milestone",()=>{
  let s=transition(null,{type:"START"}).state;
  const paused=step(s,"SAFETY");
  assert.equal(paused.status,"SAFETY_PAUSED");
  assert.equal(step(paused.state,"COMPLETE_MILESTONE").status,"PAUSED");
  assert.equal(step(paused.state,"RESUME").status,"PAUSED");
  const resumed=step(paused.state,"RESUME",{safetyCleared:true});
  assert.equal(resumed.status,"RESUMED");
  assert.equal(resumed.state.chapter,1);
  assert.equal(resumed.state.completed,0);
});
