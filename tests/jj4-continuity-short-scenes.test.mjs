import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 TARGET_SCENARIO_ID,isContinuityPilot,continuityInput,reviewPass,wordCount,CONTINUITY_FACTS
} from "../api/jj4-continuity.mjs";
import {composeSophiaClosure} from "../api/jj4-closure.mjs";
const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
const named={title:"The Four-Hundred-Dollar Surprise"};
test("Only this pilot gets the strict length and continuity review",()=>{
 assert.equal(isContinuityPilot({scenario_id:TARGET_SCENARIO_ID}),true);
 assert.equal(isContinuityPilot({scenario_id:"a different scenario"}),false);
 assert.match(core,/const attempts=focusedPilot\?2:1/);
 assert.match(core,/const words=wordCount\(story\)/);
 assert.match(core,/words<60\|\|words>145/);
 assert.match(core,/anthos_jj4_scene_quality_gate/);
 assert.match(core,/if\(!story&&lastUsable\)/);
 assert.match(core,/if\(phaseIndex===0\)break/);
 assert.match(core,/if\(reviewPass\(review\)\|\|attempt===attempts-1\)break/);
 assert.doesNotMatch(core,/The story repeated or contradicted an earlier scene/);
});
test("Continuity ledger retains who made the purchase and completed history",()=>{
 const history=[{phase:"hook",body:"Jill purchased the microwave."}];
 const ledger=continuityInput(1,history,null);
 assert.deepEqual(ledger.allCompletedScenes,history);
 assert.match(ledger.canonicalFacts.join(" "),/Jill bought the \$400/);
 assert.match(ledger.canonicalFacts.join(" "),/Jack did NOT spend the \$400/);
 assert.equal(wordCount("Now Jack takes a different step."),6);
});
test("A critic must explicitly identify a new development and no contradiction",()=>{
 const good={approved:true,distinctNewEvent:"Jack calls a repair professional for the first time.",
  continuityError:"",repetitionError:"",responsibilityError:"",coachingError:""};
 assert.equal(reviewPass(good),true);
 assert.equal(reviewPass({...good,distinctNewEvent:""}),false);
 assert.equal(reviewPass({...good,continuityError:"Already called that person."}),false);
 assert.equal(reviewPass({...good,approved:false}),false);
});
test("Sophia's edited ending never truncates sentences or cites irrelevant Aron research",()=>{
 const observation="Jack arranged for an appliance repair estimate. Jill kept the box closed. Jack is uncertain whether a repair will be economical, and Jill still wants a plan for savings.";
 const practice="Agree on one specific date to revisit your household decision.";
 const result=composeSophiaClosure(named,{observation,practice});
 assert.ok(result.includes(observation));
 assert.ok(result.includes(practice));
 assert.doesNotMatch(result,/Aron|novel activities|lingeri|shared fi/);
 assert.match(result,/gentle startup/);
 assert.ok(result.includes("\n\n"));
 const broken=composeSophiaClosure(named,{observation:"A long unfinished thought ".repeat(70),practice:"unfinished phrase"});
 assert.doesNotMatch(broken,/unfinished thought.*$/);
 assert.match(broken,/Jack acknowledged his delayed repair/);
 const old=composeSophiaClosure({title:"Some other story"},{observation:"A complete sentence.",practice:"Try a small action."});
 assert.match(old,/Aron/);
});
