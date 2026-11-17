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


test("live third Hook: 'then leaves' commits Jack's departure",()=>{
 const state={actorLocations:initialActorLocations({sceneSetting:"A kitchen breakfast"})};
 const story='Jack fastens his watch. Jill asks a question. Jack says, "We will talk later." He tightens his grip on keys, pauses by the family calendar, then leaves, closing the door behind him. Jill watches.';
 const r=validateActorLocations(state,story,0,[]);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.locations.jack.place,"away");
});
test("live third Conflict: fronted parking-lot setting locates Jack away from Jill",()=>{
 const state={actorLocations:{jack:{place:"away",asOfPhase:0},jill:{place:"kitchen",asOfPhase:0}}};
 const story="In the parking lot, Jack texts Jill that his meeting may run late. Jill taps the kitchen calendar and asks him to choose an actual time.";
 const r=validateActorLocations(state,story,1,[]);
 assert.equal(r.ok,true,r.reason);
 assert.notEqual(r.locations.jack.place,"kitchen");
 assert.match(r.locations.jack.place,/parking lot/);
 assert.equal(r.locations.jill.place,"kitchen");
});


test("full live pilot: Jack steps back inside after being outside",()=>{
 const prior={actorLocations:{jack:{place:"outside",asOfPhase:0},jill:{place:"kitchen",asOfPhase:-1}}};
 const story="Jack's watch buzzed as he opened the door, paused, then stepped back inside. Facing Jill, Jack said, '2:15 is still our plan.'";
 const r=validateActorLocations(prior,story,3,[]);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.locations.jack.place,"inside");
});
test("after entering home, office location can be established in a later scene",()=>{
 const prior={actorLocations:{jack:{place:"inside",asOfPhase:3},jill:{place:"kitchen",asOfPhase:-1}}};
 const story="At 2:15, Jack's phone buzzed in his cramped office. He dialed Jill from his desk.";
 const r=validateActorLocations(prior,story,4,[]);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.locations.jack.place,"office");
});


test("new real Hook: Jill watches him leave means Jack actually departed",()=>{
 const before={actorLocations:{jack:{place:"kitchen",asOfPhase:-1},jill:{place:"kitchen",asOfPhase:-1}}};
 const scene='Jack tightens his watch. Jill stands by the kitchen calendar. Jack said, "We will talk later," grabs his keys and prepares to leave. She watches him leave. The door clicks shut.';
 const result=validateActorLocations(before,scene,0,[]);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.locations.jack.place,"away");
});
test("new real Conflict: cannot use kitchen counter again without a return",()=>{
 const before={actorLocations:{jack:{place:"away",asOfPhase:0},jill:{place:"kitchen",asOfPhase:0}}};
 const scene="Jack slings his keys onto the counter; his watch buzzes as he reaches for the door. Jill watches.";
 const result=validateActorLocations(before,scene,1,[]);
 assert.equal(result.ok,false);
 assert.match(result.reason,/counter after leaving/);
});
test("a stated return permits a new physical counter action",()=>{
 const before={actorLocations:{jack:{place:"away",asOfPhase:0},jill:{place:"kitchen",asOfPhase:0}}};
 const scene="Jack returned home to the kitchen and slings his keys onto the counter. Jill looked up.";
 const result=validateActorLocations(before,scene,1,[]);
 assert.equal(result.ok,true,result.reason);
});


test("live QA Hook cannot replace Jack's authored 'later' with tentative tomorrow after 8",()=>{
 const episode={phases:{hook:"At breakfast Jill asks about the serious issue. Jack says 'later' and reaches for his keys."},sceneStress:"No time has been mutually agreed."};
 const bad='Jack said firmly, "I can’t dive in before my meeting. I’ll carve out time tomorrow after 8." Jill repeated tomorrow after 8, still feeling postponed.';
 const result=enforcePhaseContract(episode,0,bad);
 assert.equal(result.ok,false);
 assert.equal(result.code,"missing_authored_dialogue");
 const good='Jack glanced at the calendar, sighed, "We’ll talk later," and grabbed his keys. Jill watched him leave.';
 assert.deepEqual(enforcePhaseContract(episode,0,good),{ok:true});
});


test("live Scene 2 must not replay home departure after Hook already put Jack away",()=>{
 const prev={actorLocations:{jack:{place:"away",asOfPhase:0},jill:{place:"kitchen",asOfPhase:-1}}};
 const scene="Jack hurried out the door, phone in hand, the busy family calendar looming. From his car, Jack texted Jill that his meeting had started.";
 const result=validateActorLocations(prev,scene,1,[]);
 assert.equal(result.ok,false);
 assert.match(result.reason,/replayed a household doorway departure/);
});
test("workplace exit is not incorrectly treated as a duplicate home departure",()=>{
 const prev={actorLocations:{jack:{place:"office",asOfPhase:2},jill:{place:"kitchen",asOfPhase:2}}};
 const scene="Jack hurried out the office door, phone in hand, headed toward his car. Jill was home.";
 const result=validateActorLocations(prev,scene,3,[]);
 assert.equal(result.ok,true,result.reason);
});
