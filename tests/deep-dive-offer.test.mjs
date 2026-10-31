import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";import vm from "node:vm";
const data=JSON.parse(fs.readFileSync(new URL("../dive-review/stories/offer.v1.json",import.meta.url),"utf8"));
const context={};context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../dive-review/engine.js",import.meta.url),"utf8"),context);
const E=context.ANTHOS_DEEP_DIVE_ENGINE;
test("serious Anthos story has fully authored eight chapters and six endings",()=>{
 E.storyCheck(data);assert.equal(data.chapters.length,8);assert.equal(data.endings.length,6);assert.equal(data.chapters[6].mastery,true);
 for(const n of [1,3,6]){assert.equal(data.chapters[n].options.length,6);assert.ok(data.chapters[n].options.some(x=>x.quality===2));assert.ok(data.chapters[n].options.some(x=>x.quality===0));}
});
test("story integrates with slide review and preserves separate review progress",()=>{
 const js=fs.readFileSync(new URL("../dive-review/review.js",import.meta.url),"utf8");
 const html=fs.readFileSync(new URL("../dive-review/index.html",import.meta.url),"utf8");
 assert.match(js,/offer:"\/dive-review\/stories\/offer.v1.json"/);
 assert.match(html,/data-story="offer"/);
 const state=E.fresh(data);assert.equal(E.view(data,state).index,0);
 const next=E.transition(data,state,{type:"advance"});assert.equal(next.changed,true);
 assert.equal(E.view(data,next.state).index,1);
});
