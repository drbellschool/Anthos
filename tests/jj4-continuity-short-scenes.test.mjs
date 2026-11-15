import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 TARGET_SCENARIO_ID,isContinuityPilot,continuityInput,reviewPass,wordCount,CONTINUITY_FACTS
} from "../api/jj4-continuity.mjs";
import {composeSophiaClosure} from "../api/jj4-closure.mjs";
const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
const named={title:"The Four-Hundred-Dollar Surprise"};
test("Strict quality mode and simulation receive guarded continuity/word limits",()=>{
 assert.equal(isContinuityPilot({scenario_id:TARGET_SCENARIO_ID}),true);
 assert.equal(isContinuityPilot({scenario_id:"a different scenario"}),false);
 assert.match(core,/const attempts=qualityGate\?5:simulate\?3:focusedPilot\?2:1/);
 assert.match(core,/const words=wordCount\(story\)/);
 assert.match(core,/words<70\|\|words>115/);
 assert.match(core,/anthos_jj4_scene_quality_gate/);
 assert.match(core,/if\(!story&&lastUsable&&!qualityGate\)/);
 assert.match(core,/if\(phaseIndex===0\)break/);
 assert.match(core,/unsupportedExternalPolicyClaims\(story,validFacts\)/);
 assert.match(core,/checkCoachingTrace\(story,result.coachingTrace/);
 assert.match(core,/if\(reviewPass\(review\)\)break/);
 assert.doesNotMatch(core,/The story repeated or contradicted an earlier scene/);
});
test("Continuity ledger retains who made the purchase and completed history",()=>{
 const history=[{phase:"hook",body:"Jill purchased the microwave."}];
 const ledger=continuityInput(1,hi¶»§q«^