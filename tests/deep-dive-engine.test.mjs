import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=file=>fs.readFileSync(path.join(root,file),"utf8");
const context={window:{}};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source("content.js"),context);
vm.runInContext(source("deep-dive/engine.js"),context);
const engine=context.ANTHOS_DEEP_DIVE_ENGINE;
const story=context.window.THREEFOLD_CONTENT.dive;
const initial=()=>engine.fresh(story);
const act=(state,type,extra={})=>engine.transition(story,state,{type,...extra});
function next(state){
  const result=act(state,"advance");
  assert.equal(result.changed,true,result.reason);
  return result.state;
}
function select(state,index){
  const result=act(state,"choose",{index});
  assert.equal(result.changed,true,result.reason);
  return result.state;
}
function reachMastery(){
  let s=next(initial());  // chapter 2
  s=select(s,0);
  s=next(s);            // chapter 3
  s=next(s);            // chapter 4
  s=select(s,0);
  s=next(s);            // chapter 5
  s=next(s);            // chapter 6
  s=next(s);            // chapter 7
  assert.equal(s.chapter,6);
  assert.equal(s.completed,6);
  return s;
}

test("eight authored chapters, six plausible options per decision, independent chapter 7 test",()=>{
  assert.equal(story.chapters.length,8);
  assert.equal(story.storyVersion,1);
  assert.equal(story.chapters[1].options.length,6);
  assert.equal(story.chapters[3].options.length,6);
  assert.equal(story.chapters[6].options.length,6);
  assert.equal(story.chapters[6].mastery,true);
  assert.equal(story.chapters[7].options,undefined);
  assert.equal(story.endings.length,6);
  for(const i of [1,3,6])for(const opt of story.chapters[i].options){
    assert.ok(opt.impact.length>25);
    assert.ok(opt.coach.length>30);
    assert.ok([0,1,2].includes(opt.quality));
  }
});

test("no skipping, decisions once, and consequences require a choice",()=>{
  let s=initial();
  assert.equal(act(s,"navigate",{chapter:7}).changed,false);
  assert.equal(act(s,"choose",{index:0}).changed,false);
  assert.equal(act(s,"advance").changed,true);
  s=next(s);
  assert.equal(act(s,"advance").reason,"choice-required");
  s=select(s,0);
  assert.equal(act(s,"choose",{index:1}).changed,false);
  assert.equal(engine.view(story,s).canAdvance,true);
  s=next(s);
  assert.equal(s.completed,2);
  s=act(s,"navigate",{chapter:1}).state;
  assert.equal(act(s,"choose",{index:2}).changed,false);
  assert.equal(act(s,"advance").reason,"read-only");
});

test("harmful choices require exactly one bounded repair and preserve the original outcome",()=>{
  let s=next(initial());
  s=select(s,1);
  assert.equal(engine.view(story,s).needsRepair,true);
  assert.equal(act(s,"advance").reason,"repair-required");
  const before=engine.view(story,s).outcome;
  const practiced=act(s,"repair",{repair:"own"});
  assert.equal(practiced.changed,true);
  s=practiced.state;
  assert.equal(engine.view(story,s).outcome,before);
  assert.equal(s.choices["1"],1);
  assert.equal(s.repairs["1"].attempts,1);
  assert.equal(act(s,"repair",{repair:"own"}).reason,"repair-unavailable");
  s=next(s);
  assert.equal(s.completed,2);
});

test("failed practice receives one guided model, then closes the loop",()=>{
  let s=next(initial());
  s=select(s,1);
  s=act(s,"repair",{repair:"deflect"}).state;
  assert.equal(s.repairs["1"].guided,true);
  assert.equal(engine.view(story,s).needsRepair,false);
  assert.equal(act(s,"repair",{repair:"own"}).changed,false);
  assert.equal(next(s).completed,2);
});

test("mastery result appears only after an independent answer; completion cannot rewrite score",()=>{
  let s=reachMastery();
  assert.equal(engine.mastery(story,s),null);
  assert.equal(engine.view(story,s).coaching,null);
  s=select(s,1);  // contempt and global blame
  const score=engine.mastery(story,s);
  assert.equal(score.independent,true);
  assert.equal(score.quality,0);
  assert.equal(score.status,"not-yet-demonstrated");
  assert.equal(engine.view(story,s).canRepair,false);
  assert.equal(act(s,"choose",{index:0}).changed,false);
  s=next(s);
  assert.equal(s.chapter,7);
  assert.match(engine.view(story,s).storyText,/sharp words/i);
  s=next(s);
  assert.equal(s.completed,8);
  assert.equal(engine.mastery(story,s).status,"not-yet-demonstrated");
  assert.equal(act(s,"advance").reason,"read-only");
});

test("respectful mastery and the chapter-eight outcome are distinct from poor choices",()=>{
  let strong=select(reachMastery(),0);
  assert.equal(engine.mastery(story,strong).status,"demonstrated");
  strong=next(strong);
  assert.match(engine.view(story,strong).storyText,/Christmas morning belongs/i);
  let partial=select(reachMastery(),3);
  assert.equal(engine.mastery(story,partial).status,"developing");
  partial=next(partial);
  assert.match(engine.view(story,partial).storyText,/promised second conversation/i);
  let kind=select(reachMastery(),5);
  assert.equal(engine.mastery(story,kind).status,"demonstrated");
});

test("restore supports saved sessions, clips impossible progress, and resets a different story version",()=>{
  let s=next(initial());
  s=select(s,0);
  const recovered=engine.restore(story,JSON.parse(JSON.stringify(s)));
  assert.equal(recovered.completed,1);
  assert.equal(recovered.choices["1"],0);
  const invalid=engine.restore(story,{
    version:1,storyKey:story.id,storyVersion:1,
    chapter:7,completed:8,choices:{"1":0},repairs:{}
  });
  assert.equal(invalid.completed,3);
  assert.equal(invalid.chapter,3);
  const wrongVersion=engine.restore(story,{...s,storyVersion:999});
  assert.equal(wrongVersion.completed,0);
  const legacy=engine.restore(story,{version:1,diveChapter:1,diveCompleted:1,choices:{"1":0},repairs:{}});
  assert.equal(legacy.choices["1"],0);
});

test("UI uses the new engine and keeps all interactions in a clearly marked browser-only demo",()=>{
  const app=source("app.js"),html=source("experience/index.html");
  assert.match(html,/\.\.\/deep-dive\/engine\.js/);
  assert.match(app,/DiveEngine\.transition/);
  assert.match(app,/DiveEngine\.view/);
  assert.match(app,/repairResponse/);
  assert.match(app,/data-repair-id/);
  assert.match(html,/nothing is sent to your partner, Telnyx, OpenAI, or a database/);
  assert.doesNotMatch(app,/supabase\.co|TELNYX_API_KEY|OPENAI_API_KEY/);
});
