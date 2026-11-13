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
test("Scene reviewer may request a rewrite but cannot veto a usable scene forever",()=>{
 assert.match(core,/lastUsable=\{result,story\}/);
 assert.match(core,/if\(phaseIndex===0\)break/);
 assert.match(core,/if\(reviewPass\(review\)\|\|attempt===attempts-1\)break/);
 assert.match(core,/if\(!story&&lastUsable\)/);
 assert.doesNotMatch(core,/The story repeated or contradicted an earlier scene/);
});
