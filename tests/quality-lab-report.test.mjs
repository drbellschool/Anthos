import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
test("quality dashboard renders synthetic runs without private coaching content or invented costs",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"anthos-quality-"));
 try{
  const sample={synthetic:true,id:"demo",episodeId:"ep-test",petal:"romance-courtship",mode:"shared",
   profile:"adversarial",seed:17,engineCommit:"abc",model:"fixture",episodeVersion:1,
   scenes:Array.from({length:6},(_,phase)=>({phase,body:"Jack and Jill maintain their different opinions, while a new disagreement unfolds."})),
   coaching:[{role:"jack",afterPhase:0,syntheticInput:"Private synthetic advice should NOT appear in the dashboard"}],
   closure:{body:"Sophia notices the unresolved difference."},
   transitions:null,judgments:null,gates:{},costUsd:null};
  await writeFile(join(dir,"qa-fixture.json"),JSON.stringify(sample));
  execFileSync(process.execPath,[new URL("../quality-lab/report.mjs",import.meta.url).pathname,dir,dir]);
  const metrics=JSON.parse(await readFile(join(dir,"metrics.json"),"utf8"));
  const html=await readFile(join(dir,"dashboard.html"),"utf8");
  assert.equal(metrics.stats.attempted,1);
  assert.equal(metrics.stats.scored,0);
  assert.equal(metrics.stats.meanCostUsd,null);
  assert.equal(metrics.stats.accepted,0);
  assert.ok(html.includes("Anthos AI Quality Lab"));
  assert.ok(html.includes("Unscored"));
  assert.ok(html.includes("Unknown"));
  assert.ok(!html.includes(sample.coaching[0].syntheticInput));
 }finally{await rm(dir,{recursive:true,force:true})}
});
