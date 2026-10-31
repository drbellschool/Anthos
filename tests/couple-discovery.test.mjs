import test from "node:test";
import assert from "node:assert/strict";
import {CHOICES,submitAnswer,canReveal,compare,planningBrief,buildAdventure} from "../discovery/engine.mjs";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const good=(self,prediction,why="")=>submitAnswer({self,prediction,why,share:true});

test("six common choices and mandatory mutual sharing",()=>{
  assert.equal(CHOICES.length,6);
  assert.throws(()=>submitAnswer({self:"explore",prediction:"play",share:false}),/share/);
  assert.throws(()=>submitAnswer({self:"made-up",prediction:"play",share:true}),/Choose/);
  assert.throws(()=>submitAnswer({self:"explore",prediction:"play",why:"a".repeat(361),share:true}),/360/);
  assert.equal(canReveal(good("play","quiet"),null),false);
  assert.throws(()=>compare(good("play","quiet"),null),/Both/);
});
test("each prediction compares only against spouse's actual self-choice",()=>{
  const him=good("play","quiet","She often wants a quiet afternoon.");
  const her=good("explore","friends");
  const c=compare(him,her);
  assert.equal(c.firstPredictionMatches,false);
  assert.equal(c.secondPredictionMatches,false);
  assert.match(c.message,/surprised/);
  const brief=planningBrief(him,her);
  assert.deepEqual(brief.preferences,["Doing something playful or adventurous","Exploring somewhere new"]);
  assert.doesNotMatch(JSON.stringify(brief),/quiet|friends|often|prediction/i);
  const plan=buildAdventure(him,her);
  assert.equal(plan.title,"The Place We Haven't Found Yet");
  assert.match(plan.steps.join(" "),/detour/);
  assert.doesNotMatch(JSON.stringify(plan),/often wants|she predicted|friends|relaxing together at home/i);
});
test("nonidentical preferences are not incompatibility scores",()=>{
  const c=compare(good("explore","play"),good("quiet","explore"));
  assert.equal(c.firstPredictionMatches,false);
  assert.equal(c.secondPredictionMatches,true);
  assert.equal(Object.hasOwn(c,"score"),false);
  assert.match(c.message,/worth discovering/);
});
test("every one of the 36 preference pairs yields an actionable suggestion",()=>{
  for(const a of CHOICES)for(const b of CHOICES){
    const plan=buildAdventure(good(a.id,b.id),good(b.id,a.id));
    assert.ok(plan.title.length);
    assert.ok(plan.steps.length>=3);
    assert.ok(plan.steps.every(s=>typeof s==="string"&&s.length>15));
    assert.match(plan.note,/No place, price, time, childcare/);
  }
});
test("no network, storage or sensitive disclosure path is included in client demo",()=>{
  const page=fs.readFileSync(path.join(root,"discovery/index.html"),"utf8");
  const script=fs.readFileSync(path.join(root,"discovery/app.mjs"),"utf8");
  const core=fs.readFileSync(path.join(root,"discovery/engine.mjs"),"utf8");
  assert.match(page,/same-device demo/i);
  assert.match(page,/No responses are sent or saved/);
  assert.doesNotMatch(script+core,/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|navigator\.sendBeacon/);
  assert.match(script,/textContent/);
  assert.match(page,/name="share"/);
  assert.match(page,/href="\/experience\/"/);
});
