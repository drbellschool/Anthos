import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const html=read("experience/index.html"),source=read("app.js"),css=read("styles.css"),vercel=JSON.parse(read("vercel.json"));
const context={window:{}};
vm.runInNewContext(read("content.js"),context);
const data=context.window.THREEFOLD_CONTENT;

test("four launch experiences exist",()=>{
  for(const section of ["home","whispers","dates","dive","journey"]){
    assert.match(html,new RegExp('data-page="'+section+'"'));
  }
  assert.match(html,/id="homeArt"/);
  assert.match(html,/id="journeyArt"/);
  assert.match(html,/id="confirmShare"/);
});
test("eight milestones and major six-choice decisions including independent mastery",()=>{
  assert.equal(data.dive.chapters.length,8);
  for(const i of [1,3,6])assert.equal(data.dive.chapters[i].options.length,6);
  assert.equal(data.dive.chapters[6].mastery,true);
  assert.ok(data.dive.chapters.filter(x=>x.story).length===8);
  for(const chapter of data.dive.chapters){
    if(chapter.options)for(const choice of chapter.options){
      assert.ok(choice.impact&&choice.coach&&[0,1,2].includes(choice.quality));
    }
  }
});
test("whispers and budget-sensitive curated dates are present",()=>{
  assert.ok(data.whispers.length>=4);
  assert.ok(data.dates.some(d=>d.id==="first-braid"));
  assert.ok(data.dates.some(d=>d.baseCost===0));
  for(const d of data.dates)assert.ok(d.steps.length>=3 && d.minutes>0);
});
test("static app scripts parse, and expected DOM references exist",()=>{
  assert.doesNotThrow(()=>new Function(source));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,"No duplicate DOM IDs");
  const refs=[...source.matchAll(/\$\("([^"]+)"\)/g)].map(x=>x[1]);
  const expectedMissing=new Set(["statusAnnouncer"]); // optional accessible announcer
  for(const ref of refs)assert.ok(ids.includes(ref)||expectedMissing.has(ref),"Missing "+ref);
  assert.match(css,/prefers-reduced-motion/);
});
test("demo clearly discloses local-only progress and keeps private share gated",()=>{
  assert.match(html,/INTERACTIVE DEMO/);
  assert.match(html,/nothing is sent to your partner/);
  assert.match(source,/function previewShare/);
  assert.match(source,/function confirmShare/);
  assert.match(source,/localStorage/);
  assert.doesNotMatch(source,/\bfetch\s*\(/);
  assert.doesNotMatch(source,/api\.openai\.com|api\.telnyx\.com|service_role|sk-proj-/);
});
test("Vercel root is deployable without framework runtime",()=>{
  assert.equal(vercel.version,2);
  assert.ok(vercel.headers.length);
  assert.match(html,/\.\.\/styles\.css/);
  assert.match(html,/\.\.\/content\.js/);
  assert.match(html,/\.\.\/app\.js/);
});
