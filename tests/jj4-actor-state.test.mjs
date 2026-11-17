import test from "node:test";
import assert from "node:assert/strict";
import {initialActorLocations,validateActorLocations} from "../api/jj4-actor-state.mjs";
import {initialSimulation,checkSimulationTransition,SIMULATION_SCHEMA} from "../api/jj4-character-simulation.mjs";
import {enforcePhaseContract} from "../api/jj4-phase-contract.mjs";

test("initializes both character locations from authored setting",()=>{
 const seed=initialActorLocations({sceneSetting:"A weekday kitchen breakfast with an overcrowded calendar."});
 assert.equal(seed.jack.place,"kitchen");assert.equal(seed.jill.place,"kitchen");
});
test("Jack leaves kitchen and persists as away without a guessed work arrival",()=>{
 const state={actorLocations:initialActorLocations({sceneSetting:"Kitchen breakfast"})};
 const result=validateActorLocations(state,"Jack reached the front door. Jill frowned. Jack left quickly while she watched.",0,[]);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.locations.jack.place,"away");
 assert.equal(result.locations.jill.place,"kitchen");
});
test("in-car text establishes Jack's current location after leaving home",()=>{
 const state={actorLocations:{jack:{place:"away",asOfPhase:0},jill:{place:"kitchen",asOfPhase:0}}};
 const text="Jack sat in his car and texted Jill that his meeting would run late. Jill glanced at the kitchen calendar.";
 const r=validateActorLocations(state,text,1,[]);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.locations.jack.place,"car");
 assert.equal(r.locations.jill.place,"kitchen");
});
test("blocks car-to-kitchen teleport after committed car location",()=>{
 const state={actorLocations:{jack:{place:"car",asOfPhase:1},jill:{place:"kitchen",asOfPhase:1}}};
 const story='Jack paused at the kitchen doorway, checked his phone, and texted Jill. Jill looked at her calendar.';
 const result=validateActorLocations(state,story,2,[]);
 assert.equal(result.ok,false);
 assert.match(result.reason,/jack appeared at kitchen without moving from car/);
});
test("allows an explicit, evidenced return home and stores new position",()=>{
 const state={actorLocations:{jack:{place:"car",asOfPhase:1},jill:{place:"kitchen",asOfPhase:1}}};
 const story="Jack walked from his car into the kitchen after the meeting. Jill waited inside.";
 const result=validateActorLocations(state,story,2,[{
  role:"jack",from:"car",to:"kitchen",evidence:"Jack walked from his car into the kitchen after the meeting."
 }]);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.locations.jack.place,"kitchen");
});
test("cannot invent a location transition only in structured annotation",()=>{
 const state={actorLocations:{jack:{place:"car",asOfPhase:1},jill:{place:"kitchen",asOfPhase:1}}};
 const story="Jack checked his phone and texted Jill. Jill drank tea in the kitchen.";
 const result=validateActorLocations(state,story,2,[{
  role:"jack",from:"car",to:"kitchen",evidence:"Jack checked his phone and texted Jill."
 }]);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.locations.jack.place,"car");
 assert.ok(result.adjustments.some(x=>/destination not shown|no narrated travel/.test(x)));
});
test("never moves someone based on the other character's location",()=>{
 const state={actorLocations:{jack:{place:"car",asOfPhase:1},jill:{place:"kitchen",asOfPhase:1}}};
 const story="Jack called Jill in the kitchen and asked for a time. Jill answered from the kitchen.";
 const result=validateActorLocations(state,story,2,[]);
 assert.equal(result.locations.jack.place,"car");
});
test("Hook contract rejects an invented accepted time before coaching",()=>{
 const episode={phases:{hook:"Jill raises a difficult question while Jack says 'later' and reaches for his keys."},
 sceneStress:"No return time has been mutually agreed."};
 const invalid="Jack said, 'Later, how about 3 PM?' Jill said, 'Yes, 3 PM works for me.' They agreed to talk at 3 PM.";
 assert.equal(enforcePhaseContract(episode,0,invalid).code,"premature_hook_resolution");
 const valid="Jack said, 'We'll talk later,' and reached for his keys while Jill demanded a definite time.";
 assert.deepEqual(enforcePhaseContract(episode,0,valid),{ok:true});
});
test("Hook contracts never block other authored phases or invented petal requirements",()=>{
 assert.deepEqual(enforcePhaseContract({phases:{hook:"Two people disagree about a camping destination."}},0,
  "They planned a hike but did not book."),{ok:true});
 assert.deepEqual(enforcePhaseContract({phases:{hook:"Jack says later."}},4,
  "They agreed to talk Sunday."),{ok:true});
});
test("simulation schema records actorMoves without altering existing character requirements",()=>{
 assert.ok(SIMULATION_SCHEMA.required.includes("actorMoves"));
 assert.ok(SIMULATION_SCHEMA.required.includes("newEvent"));
});


test("real Hook: pronoun 'He left' commits Jack as away instead of kitchen",()=>{
 const state={actorLocations:initialActorLocations({sceneSetting:"Kitchen breakfast"})};
 const story='Jack reached for the door. Jill demanded a time. Jack paused, keys in hand. He left without answering. Jill sighed.';
 const r=validateActorLocations(state,story,0,[]);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.locations.jack.place,"away");
 assert.equal(r.locations.jill.place,"kitchen");
});
test("a returned actor can enter kitchen without being marked away by earlier departure",()=>{
 const state={actorLocations:{jack:{place:"car",asOfPhase:1},jill:{place:"kitchen",asOfPhase:1}}};
 const story="Jack left his car and walked into the kitchen. Jill greeted him inside.";
 const r=validateActorLocations(state,story,2,[{role:"jack",from:"car",to:"kitchen",evidence:"Jack left his car and walked into the kitchen."}]);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.locations.jack.place,"kitchen");
});


test("actual second Hook records Jack stepping outside after vague later",()=>{
 const prior={actorLocations:initialActorLocations({sceneSetting:"A kitchen breakfast"})};
 const scene="Jack fastened his watch. Jill asked a serious question. Jack said, 'We'll talk later.' He grabbed keys and left through the front door. Jill watched. Jack stepped outside, the door clicking shut.";
 const r=validateActorLocations(prior,scene,0,[]);
 assert.equal(r.ok,true,r.reason);
 assert.ok(["away","outside"].includes(r.locations.jack.place));
 assert.notEqual(r.locations.jack.place,"kitchen");
});
test("actual Conflict moves Jack from doorstep into car without resetting him to kitchen",()=>{
 const prior={actorLocations:{jack:{place:"outside",asOfPhase:0},jill:{place:"kitchen",asOfPhase:-1}}};
 const scene="Jack's watch buzzed as he fumbled with his phone on the doorstep, texting Jill. He sent the text, slid into his car and looked away. Jill read the message by the kitchen calendar.";
 const r=validateActorLocations(prior,scene,1,[]);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.locations.jack.place,"car");
 assert.equal(r.locations.jill.place,"kitchen");
});
