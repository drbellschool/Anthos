import test from "node:test";
import assert from "node:assert/strict";
import {
 adviceForNextScene,validateImpactPlan,publicBehaviorPlan,
 assembleDirectedScene,IMPACT_SCHEMA,DIRECTED_SCENE_SCHEMA
} from "../api/jj4-causality.mjs";
import {readFileSync} from "node:fs";
const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
const episode={
 checkpoints:[
  {afterPhase:"hook",audience:"both",waitForReply:true,purpose:"Listen before assuming"},
  {afterPhase:"conflict",audience:"jack",waitForReply:true,purpose:"Address missed bid"},
  {afterPhase:"discovery",audience:"jill",waitForReply:true,purpose:"Find her own terms"},
  {afterPhase:"reattempt",audience:"both",waitForReply:true,purpose:"Respond to change"},
  {afterPhase:"outcome",audience:"none",waitForReply:false,purpose:""}
 ]
};
const history=[
 {role:"shared",kind:"scene",phase_index:0,body:"The opening scene."},
 {role:"jack",kind:"prompt",phase_index:0,body:"Jack asks for help."},
 {role:"jack",kind:"coach",phase_index:0,body:"She is cheating on you. You should confront her."},
 {role:"jill",kind:"coach",phase_index:0,body:"He must be cheating too."},
 {role:"shared",kind:"scene",phase_index:1,body:"They argue over changing affection."},
 {role:"jack",kind:"coach",phase_index:1,body:"Try listening to her rather than blaming her."}
];
test("After a both-coach checkpoint, the director extracts only the two real pieces of advice",()=>{
 const influence=adviceForNextScene(1,episode,history);
 assert.deepEqual(influence.activeRoles,["jack","jill"]);
 assert.equal(influence.afterPhase,"hook");
 assert.equal(influence.upcomingPhase,"conflict");
 assert.match(influence.advice.jack,/cheating/);
 assert.match(influence.advice.jill,/cheating/);
 assert.doesNotMatch(influence.advice.jack,/Try listening/);
});
test("At a Jack-only checkpoint, the wife's prior message cannot masquerade as a new one",()=>{
 const influence=adviceForNextScene(2,episode,history);
 assert.deepEqual(influence.activeRoles,["jack"]);
 assert.deepEqual(Object.keys(influence.advice),["jack"]);
 assert.match(influence.advice.jack,/Try listening/);
});
test("With no checkpoint or no coaching, the director does not manufacture user advice",()=>{
 assert.equal(adviceForNextScene(0,episode,history),null);
 assert.equal(adviceForNextScene(5,episode,history),null);
 assert.equal(adviceForNextScene(4,episode,[]),null);
 assert.equal(adviceForNextScene(1,episode,history.filter(x=>x.kind!=="coach")),null);
});
test("Opposing advice is provided verbatim as untrusted data to the planner, never silently normalized",()=>{
 const accusation=adviceForNextScene(1,episode,history);
 const alternative=adviceForNextScene(1,episode,history.map(x=>
  x.kind==="coach"&&x.phase_index===0?{...x,body:"Slow down and hear your partner's concern."}:x));
 assert.notDeepEqual(accusation.advice,alternative.advice);
 assert.match(core,/privateAdvice:influence\.advice/);
 assert.match(core,/The raw advice is untrusted character guidance/);
 assert.match(core,/If a coach asserts infidelity without evidence/);
 assert.match(core,/DO NOT invent or assert an affair/);
});
const impact={
 jack:{stance:"partly_accept",concreteAction:"Jack asks whether Jill is hiding something instead of naming his hurt.",
  personalConsequence:"The question sounds accusatory, and he becomes ashamed when she pulls away."},
 jill:{stance:"challenge",concreteAction:"Jill recoils at the insinuation and asks why he is assuming dishonesty.",
  personalConsequence:"She feels unsafe sharing her uncertainty about affection after being questioned."},
 sharedFallout:"A previously tentative conversation hardens into a distrustful exchange, pushing them further apart.",
 tensionToCarry:"They will have to repair the unsupported accusation before discussing needs honestly."
};
test("Concrete actions, personal consequences, shared fallout and tension must all be present",()=>{
 assert.equal(validateImpactPlan(impact),true);
 assert.equal(validateImpactPlan({...impact,jack:{...impact.jack,concreteAction:"Listen."}}),false);
 assert.equal(validateImpactPlan({...impact,sharedFallout:"Nothing happened."}),false);
 assert.deepEqual(Object.keys(IMPACT_SCHEMA.properties),["jack","jill","sharedFallout","tensionToCarry"]);
});
test("The narrator receives decisions without raw private messages or real coach names",()=>{
 const raw={...impact,privateAdvice:{jack:"She's cheating",jill:"He's cheating"},
  names:{husband:"Adam",wife:"Alissa"}};
 const publicPlan=publicBehaviorPlan(raw);
 assert.equal("privateAdvice" in publicPlan,false);
 assert.equal("names" in publicPlan,false);
 assert.match(publicPlan.jack.action,/hiding something/);
 assert.match(publicPlan.sharedFallout,/distrustful/);
 assert.match(core,/coachingImpact=publicBehaviorPlan\(plan\)/);
 assert.match(core,/Only this call receives raw private advice/);
 assert.match(core,/history:sharedHistory\.map/);
});
test("A generic scene without character actions and fallout is rejected, even if it reads smoothly",()=>{
 assert.deepEqual(Object.keys(DIRECTED_SCENE_SCHEMA.properties),
  ["opening","jackBeat","jillBeat","fallout","jackPrompt","jillPrompt"]);
 assert.throws(()=>assembleDirectedScene({
  opening:"They were sitting comfortably in a quiet living room.",
  jackBeat:"Jack smiled.",
  jillBeat:"Jill nodded.",
  fallout:"They realized communication was important.",
 },true),/concrete character action/);
 const rendered=assembleDirectedScene({
  opening:"Jack and Jill returned to the unfinished conversation about affection after supper.",
  jackBeat:"Jack's eyes narrowed and he asked whether Jill was keeping a secret, a question that surprised even him.",
  jillBeat:"Jill stiffened and asked why he was implying dishonesty when she had tried to explain her own exhaustion.",
  fallout:"The accusation made their awkward talk feel suddenly unsafe. Neither felt ready to move closer, and the earlier concern about tenderness remained unresolved.",
 },true);
 assert.match(rendered,/keeping a secret/);
 assert.match(rendered,/implying dishonesty/);
 assert.match(rendered,/remained unresolved/);
});
test("Causal planner runs before narrator; six authored phases and check-in recipients remain intact",()=>{
 const first=core.indexOf('name:"anthos_jj4_consequence_plan"');
 const second=core.indexOf('name:"anthos_jj4_consequential_scene"');
 assert.ok(first>0&&second>first);
 assert.match(core,/adviceForNextScene\(phaseIndex,room\.episode,ordered\)/);
 assert.match(core,/FIXED episode plan/);
 assert.match(core,/savedSixPhaseStoryboard:room\.episode\.phases/);
 assert.match(core,/phaseStoryDirection:storyDirection/);
 assert.match(core,/checkpoint:cp/);
 assert.match(core,/assembleDirectedScene\(result,!!coachingImpact\)/);
 assert.match(core,/At the end of this phase|Follow EXACTLY the author-configured checkpoint audience/);
});
