import test from "node:test";
import assert from "node:assert/strict";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {buildAuthored41,authoredScene,authoredOptions,authoredObjection,
 selectedAuthoredChoice,authoredCommitment,composeAuthored41Closure} from "../api/jj4-authored41.mjs";

const source=()=>structuredClone(savedMicrowaveStudio);
const roles=["jack","jill","jack","jill"];
const scenarios={
 cooperative:[
  ["explain","Tell Jill plainly why the emergency fund matters. Own missing the repairs without excusing spending without a call."],
  ["explain","Tell Jack you were tired of reheating meals on the stove, and why three missed Saturdays pushed you to buy it."],
  ["own","Offer to get a real answer on repairing the old one tomorrow. Ask Jill to compare options with you."],
  ["ask","Ask Jack to check the old microwave tomorrow and say you'll wait to open the new one if he follows through."]
 ],
 resistant:[
  ["explain","I won't discuss the repairs. Just blame her for spending the money."],
  ["own","Don't acknowledge the money. This is entirely his fault."],
  ["explain","Don't ask her anything. Tell her she has no say in the budget."],
  ["ask","Ignore Jack and accuse him again."]
 ],
 unilateral:[
  ["own","Own the three missed Saturdays without pretending the $400 was agreed."],
  ["explain","Explain how difficult the stove reheating has become."],
  ["ask","Ask Jill whether she'd consider waiting until tomorrow to decide."],
  ["explain","Open the new microwave now. Do not wait for Jack."]
 ]
};
function runScenario(tone="cooperative"){
 const ep=buildAuthored41(source()),history=[],scenes=[],turns=[];
 for(let phase=0;phase<6;phase++){
  const out=authoredScene(ep,phase,history);
  scenes.push(out);
  if(phase>=4)continue;
  const role=roles[phase],other=role==="jack"?"jill":"jack";
  assert.ok(out[role==="jack"?"jackPrompt":"jillPrompt"],"active "+role+" must have a private question");
  assert.equal(out[other==="jack"?"jackPrompt":"jillPrompt"],"","wrong spouse must not have a checkpoint");
  assert.equal(out.skillChallenge.primary,"s-decisions");
  const [id,advice]=scenarios[tone][phase];
  const option=authoredOptions(ep,role,phase).find(x=>x.id===id);
  assert.ok(option,"expected selected role option");
  assert.deepEqual(authoredOptions(ep,other,phase),[],"source has exactly one role per phase");
  const question={role,phase_index:phase,kind:"question",body:option.label};
  const choice=selectedAuthoredChoice(ep,role,phase,[...history,question]);
  const objection=authoredObjection(ep,role,phase,id);
  const reply=authoredCommitment(choice,advice,{episode:ep,role,phase});
  history.push(question,{role,kind:"reply",phase_index:phase,body:objection},
   {role,kind:"question",phase_index:phase,body:advice},
   {role,kind:"reply",phase_index:phase,body:reply},
   {role,kind:"coach",phase_index:phase,body:advice});
  turns.push({role,phase:phase+1,id,objection,advice,reply});
 }
 return {ep,scenes,turns,history,closing:composeAuthored41Closure(ep,
  scenes.map((x,phase_index)=>({phase_index,body:x.scene})))};
}
test("saved Studio data controls the one-arrival scene, named skills, and precise alternating roles",()=>{
 const p=runScenario();
 assert.equal(p.ep.authored41.studioContract.primarySkill,"s-decisions");
 assert.deepEqual(p.ep.authored41.studioContract.supportingSkills,["g-start","g-influence"]);
 assert.deepEqual(p.ep.checkpoints.map(x=>x.audience),["jack","jill","jack","jill","none"]);
 assert.equal(p.turns.length,4);
 assert.match(p.scenes[0].scene,/Thursday at 7:15 p\.m\./);
 assert.match(p.scenes[0].scene,/cracked phone/);
 assert.match(p.scenes[0].scene,/I'LL FIX IT SATURDAY/);
 assert.doesNotMatch(p.scenes.map(x=>x.scene).join(" "),/six ten|tomato magnet|arrives again/i);
 assert.match(p.scenes[1].scene,/emergency fund/i);
 assert.match(p.scenes[2].scene,/three weeks|three Saturdays/i);
 assert.match(p.closing,/Face hard decisions/);
 assert.match(p.closing,/gentle startup and accept influence/);
});
test("an edited wrong source premise, skill or sequence cannot launch the stale script",()=>{
 const invalid=[()=>{const x=source();x.premise=x.premise.replace("7:15","6:10");return x},
  ()=>{const x=source();x.primarySkill="g-bids";return x},
  ()=>{const x=source();x.checkpoints[0].audience="both";return x},
  ()=>{const x=source();x.phases.conflict="";return x}];
 for(const make of invalid)assert.throws(()=>buildAuthored41(make()),/contract/i);
});
test("assertive Jack accepts his repair obligation without giving away the financial boundary",()=>{
 const p=runScenario();
 assert.match(p.scenes[1].scene,/should've fixed|should have fixed|fixed the old/i);
 assert.match(p.scenes[1].scene,/without (?:a call|talking)|savings/i);
 assert.doesNotMatch(p.scenes[1].scene,/hold space|I see why being heard matters|you are changing my approach/i);
 assert.match(p.scenes[3].scene,/repair|old one|check/i);
 assert.equal(p.scenes[4].skillChallenge.primary,"s-decisions");
});
test("a unilateral opening changes the actual physical box state through Reflection",()=>{
 const p=runScenario("unilateral");
 assert.match(p.scenes[4].scene,/pulls the tape|tape is broken/i);
 assert.match(p.scenes[5].scene,/tape hangs loose/i);
 assert.match(p.closing,/opened the box/i);
 assert.doesNotMatch(p.scenes[5].scene,/box stays sealed|box remains sealed/i);
});
test("hostile coaching does not force mutual agreement or a happy ending",()=>{
 const p=runScenario("resistant");
 assert.doesNotMatch(p.closing,/Both accepted a specific check/);
 assert.doesNotMatch(p.scenes[4].scene,/they agree|both accept|They both accept/i);
 assert.equal(p.turns.length,4);
});
export {runScenario};
