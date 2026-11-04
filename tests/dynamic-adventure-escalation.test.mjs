import test from "node:test";
import assert from "node:assert/strict";
import {initialAdventure,advanceAdventure,dramaticPressure,directorPrompt} from "../api/dynamic-adventure.mjs";

const pair=[
 {id:1,author:"a",body:"Jill should be allowed to stay home."},
 {id:2,author:"b",body:"Jack's surprise is worth considering."}
];
const continuation=(s)=>({
 consequence:"Jack carefully sets the tickets aside and offers to make pancakes. Jill smiles, then hears his phone ring.",
 nextScene:{
  title:"The ringing phone",
  story:"The morning is quieter until Jack's phone rings. The ropes course operator asks whether they will be arriving for their reservation, and Jack realizes he has not dealt with the tickets. Jill puts the pancake batter aside to hear what the caller says. Neither has decided whether to forfeit the passes. Jack asks the operator to wait while they confer.",
  prompt:"What should Jack do about the reservation before the operator hangs up?",
  options:[
   "Ask about rescheduling the reservation without committing Jill.",
   "Explain that they are keeping this morning free and give up the tickets.",
   "Ask Jill whether she wants to discuss the passes together now."
  ]
 },
 location:s.ledger.setting.location,
 timeIndex:s.ledger.setting.timeIndex+1,
 transition:"The phone rings while they remain at home.",
 newFacts:["The operator called to ask whether they are coming."],
 unresolved:["The operator is waiting for an answer."],
 checkpoint:null,checkpointEvidence:""
});
test("real first-turn choice gets a concrete complication, not counseling homework",()=>{
 const state=initialAdventure();
 const p=directorPrompt(state,pair,{a:"Adam",b:"Alissa"});
 for(const required of ["GAME MASTER","Every pair of player decisions","ON-SCREEN EVENT",
   "Yes, and","Yes, but","CONSEQUENCE","ClIFFHANGER".toLowerCase(),"CAUSAL ESCALATION"]){
  assert.ok(p.instructions.toLowerCase().includes(required.toLowerCase()),required);
 }
 assert.match(p.instructions,/not three versions of "communicate respectfully"/);
 assert.match(p.input,/Jill should be allowed/);
 assert.match(p.input,/Jack's surprise/);
 assert.match(p.input,/spark/);
});
test("dramatic pressure grows from unresolved threads without inserting fixed scenes",()=>{
 let state=initialAdventure();
 assert.equal(dramaticPressure(state).intensity,"spark");
 state=advanceAdventure(state,continuation(state),pair);
 assert.equal(dramaticPressure(state).intensity,"spark");
 assert.deepEqual(dramaticPressure(state).openThreads,["The operator is waiting for an answer."]);
 state={...state,turn:4};
 assert.equal(dramaticPressure(state).intensity,"complication");
 state={...state,turn:7};
 assert.equal(dramaticPressure(state).intensity,"pressure");
 state={...state,turn:10};
 assert.equal(dramaticPressure(state).intensity,"payoff");
 assert.doesNotMatch(JSON.stringify(dramaticPressure(state)),/Christmas|Maya|Owen|prewritten chapter/i);
});
test("new storytelling constraints preserve the existing required ledger and checkpoints",()=>{
 const state=initialAdventure();
 const p=directorPrompt(state,pair,{a:"Adam",b:"Alissa"});
 assert.match(p.instructions,/Preserve every established fact/);
 assert.match(p.instructions,/at most one/);
 assert.match(p.instructions,/Gottman's bids\/repair/);
 assert.match(p.instructions,/Schnarch's differentiation/);
 assert.match(p.instructions,/Aron's shared novelty/);
 assert.equal(state.ledger.setting.location,"Jack and Jill's kitchen");
 assert.equal(state.checkpoints.length,0);
});
