import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const review=read("dive-review/review.js");
const html=read("dive-review/index.html");
const css=read("dive-review/review.css");
const context={globalThis:null};context.globalThis=context;
vm.createContext(context);
vm.runInContext(read("dive-review/engine.js"),context);
const E=context.ANTHOS_DEEP_DIVE_ENGINE;
const stories=[
 JSON.parse(read("dive-review/stories/questions.v1.json")),
 JSON.parse(read("dive-review/stories/christmas.v1.json"))
];
const act=(story,s,type,extra={})=>E.transition(story,s,{type,...extra});
function readyForMastery(story){
 let s=E.fresh(story);
 for(let i=0;i<6;i++){
   let v=E.view(story,s);
   if(v.canChoose){const result=act(story,s,"choose",{index:0});assert.equal(result.changed,true);s=result.state;}
   if(E.view(story,s).needsRepair){
      const x=act(story,s,"repair",{repair:"own"});assert.equal(x.changed,true);s=x.state;
   }
   const r=act(story,s,"advance");assert.equal(r.changed,true,r.reason);s=r.state;
 }
 return s;
}
test("mobile review loads both complete authored stories and only review UI",()=>{
 assert.match(html,/dive-review\/engine\.js/);
 assert.match(html,/dive-review\/review\.js/);
 assert.match(html,/REVIEW PROTOTYPE/);
 assert.match(html,/Sample marriage and partner stats/);
 assert.match(html,/No SMS is sent/);
 assert.match(html,/name="robots" content="noindex/);
 assert.match(html,/id="reviewNotes"/);
 assert.match(html,/id="storyDialog"/);
 assert.match(css,/min-height:47px/);
 assert.match(css,/max-width:min\(calc\(100% - 22px\),460px\)/);
 assert.doesNotMatch(review,/fetch\([^)]*supabase|telnyx\.com|service_role|OPENAI_API_KEY/);
});
test("review JavaScript compiles and story assets satisfy state-engine contract",()=>{
 assert.doesNotThrow(()=>new vm.Script(review));
 for(const story of stories){
  assert.doesNotThrow(()=>E.storyCheck(story));
  assert.equal(story.chapters.length,8);
  assert.equal(story.chapters[6].mastery,true);
  assert.equal(story.endings.length,6);
  for(const n of [1,3,6]){
   assert.equal(story.chapters[n].options.length,6);
   assert.ok(story.chapters[n].options.some(o=>o.quality===2));
   assert.ok(story.chapters[n].options.some(o=>o.quality===0));
  }
 }
});
test("user can read chapters but cannot skip decisions or forge mastery",()=>{
 for(const story of stories){
  let s=E.fresh(story);
  assert.equal(act(story,s,"navigate",{chapter:7}).changed,false);
  assert.equal(act(story,s,"choose",{index:5}).changed,false);
  s=act(story,s,"advance").state;
  assert.equal(E.view(story,s).canChoose,true);
  assert.equal(act(story,s,"advance").reason,"choice-required");
  const chosen=act(story,s,"choose",{index:1});assert.equal(chosen.changed,true);s=chosen.state;
  assert.equal(act(story,s,"choose",{index:0}).changed,false);
  if(story.chapters[1].options[1].quality===0){
    assert.equal(act(story,s,"advance").reason,"repair-required");
    s=act(story,s,"repair",{repair:"own"}).state;
    assert.equal(act(story,s,"repair",{repair:"deflect"}).changed,false);
  }
  assert.equal(act(story,s,"advance").changed,true);
 }
});
test("chapter seven first choice controls ending and result, not completion",()=>{
 for(const story of stories){
  let s=readyForMastery(story);
  assert.equal(E.mastery(story,s),null);
  const poor=story.chapters[6].options.findIndex(o=>o.quality===0);
  s=act(story,s,"choose",{index:poor}).state;
  assert.equal(E.mastery(story,s).quality,0);
  assert.equal(E.view(story,s).canRepair,false);
  s=act(story,s,"advance").state;
  assert.equal(E.view(story,s).storyText,story.endings[poor]);
  s=act(story,s,"advance").state;
  assert.equal(s.completed,8);
  assert.equal(E.mastery(story,s).status,"not-yet-demonstrated");
 }
});
test("mobile demo never requires private data or exposes a secret-bearing token",()=>{
 assert.match(review,/localStorage/);
 assert.match(review,/navigator.clipboard/);
 assert.match(review,/storyDialog/);
 assert.match(html,/14 years/);
 assert.match(html,/3 \/ 8/);
 assert.doesNotMatch(html,/data-auth-user|data-spouse-id|SUPABASE_SERVICE_ROLE/);
 assert.doesNotMatch(review,/fetch\s*\(\s*["'\`]https:\/\/.*\/rest\/v1\//);
});

test("Friendship review repair buttons use the actual Mara and Eli characters",()=>{
 const engine=read("dive-review/engine.js");
 assert.doesNotMatch(engine,/Jill|Jack/);
 assert.match(review,/Mara acknowledges the accusation/);
 assert.match(review,/Eli acknowledges the pressure/);
 assert.match(review,/Mara says she's sorry Eli took it badly/);
 assert.doesNotMatch(review,/sorry Jill was upset/);
});
