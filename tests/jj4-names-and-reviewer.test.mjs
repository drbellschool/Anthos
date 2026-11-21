import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {personalizeIntroduction} from "../api/jj4-core.mjs";

const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
const opening="<<husband>> and <<wife>>, welcome. Jack and Jill need your help.";
const participants=[
 {role:"jack",first_name:"Adam",joined_at:"2026-11-13T12:00:00Z"},
 {role:"jill",first_name:"Alissa",joined_at:"2026-11-13T12:00:00Z"}
];
test("Sophia introduction substitutes both joined participants' first names",()=>{
 assert.equal(personalizeIntroduction(opening,participants),"Adam and Alissa, welcome. Jack and Jill need your help.");
 assert.doesNotMatch(personalizeIntroduction(opening,participants),/<<husband>>|<<wife>>/);
});
test("The original editorial intro remains unchanged and missing joins have safe fallback",()=>{
 assert.equal(opening,"<<husband>> and <<wife>>, welcome. Jack and Jill need your help.");
 const partial=personalizeIntroduction(opening,[{role:"jack",first_name:"Adam",joined_at:"2026-11-13T12:00:00Z"}]);
 assert.equal(partial,"Adam and wife, welcome. Jack and Jill need your help.");
});
test("Strict QA rejects unverified scenes; regular pilots can salvage a validated usable scene",()=>{
 assert.match(core,/lastUsable=\{result,story,simulationUpdate\}/);
 assert.match(core,/if\(phaseIndex===0&&!qualityGate\)break/);
 assert.match(core,/if\(reviewPass\(review\)\)break/);
 assert.match(core,/if\(!story&&lastUsable&&!qualityGate\)/);
 assert.doesNotMatch(core,/The story repeated or contradicted an earlier scene/);
 assert.match(core,/if\(qualityGate\)\{/);
 assert.match(core,/The independent quality review did not finish/);
});
