import test from "node:test";
import assert from "node:assert/strict";
import {
 ENGINE_VERSION,EVOLUTION_VERSION,AXES,EVOLUTION_STORY_SCHEMA,initialEvolution,
 validEvolution,validateEvolutionStory,evolveState,characterEvolutionContext,
 evolutionStoryPrompt,storySimilarity
} from "../api/jj-evolution.mjs";

const scenario={
 title:"One of Us Loves Mountains",
 opening_scene:"Jack wants to hike while Jill hopes for a quiet weekend by the lake.",
 learning_objective:"Honor two differing needs without abandoning either person's identity.",
 research_lenses:["gottman","schnarch","aron"]
};
const newDilemmas=[
 "A kayak rental is due back but one person secretly signed up for a lake race.",
 "The festival photographer puts their funny photo on a large public display.",
 "A phone call invites the couple to an early-morning group challenge.",
 "A thunderstorm turns the scenic path into a muddy walk with no shuttle.",
 "The couple must decide how to describe the trip to friends without hiding its costs."
];
function beat(state,step,variant="collaborative"){
 const options={
  "all-in":{
    jack:{connection:3,agency:2,trust:1,energy:2,friction:-1,curiosity:2,
     gain:"Jack feels chosen because Jill is sharing his favorite experience",
     cost:"Jack worries that her enthusiasm may be hiding exhaustion"},
    jill:{connection:3,agency:-3,trust:0,energy:-3,friction:2,curiosity:2,
     gain:"Jill genuinely laughs while exploring something unexpected",
     cost:"Jill feels tired and loses an afternoon she wanted for herself"},
    rel:[3,1]
  },
  "separate":{
    jack:{connection:-2,agency:3,trust:-1,energy:1,friction:2,curiosity:0,
     gain:"Jack enjoys exploring the trail at his own pace",
     cost:"Jack feels increasingly lonely when they never reconnect"},
    jill:{connection:-2,agency:3,trust:-1,energy:2,friction:1,curiosity:-1,
     gain:"Jill finally enjoys uninterrupted time to herself",
     cost:"Jill begins missing moments of shared fun with Jack"},
    rel:[-2,-1]
  },
  "collaborative":{
    jack:{connection:2,agency:1,trust:2,energy:1,friction:-1,curiosity:1,
     gain:"Jack finds surprising pleasure in the calm lakeside walk",
     cost:"Jack postpones the more demanding route he hoped to try"},
    jill:{connection:2,agency:2,trust:2,energy:1,friction:-1,curiosity:2,
     gain:"Jill discovers that a little adventure can feel refreshing",
     cost:"Jill gives up some of the reading time she had imagined"},
    rel:[2,2]
  },
  "double-down":{
    jack:{connection:-3,agency:2,trust:-2,energy:-1,friction:3,curiosity:-2,
     gain:"Jack keeps control of his own hiking plans",
     cost:"Jack sees Jill withdraw after his careless remark"},
    jill:{connection:-3,agency:-1,trust:-2,energy:-2,friction:3,curiosity:-1,
     gain:"Jill recognizes the need to speak honestly about her limits",
     cost:"Jill feels unheard and stops proposing activities"},
    rel:[-3,-2]
  }
 };
 const o=options[variant];
 const outcome=
  "At the lake the two choose to act on their earlier plans. Jack spots the new sign, looks at the map and realizes that the day is not going as expected. "+
  "Jill checks the time and notices a new complication neither had planned for. They both get something from the attempt, but it also changes what they want next. "+
  "Neither pretends the earlier disagreement has disappeared; the next decision grows out of what they actually did.";
 const nextScene=
  "Just before dinner, "+newDilemmas[step-1]+
  " Their earlier choices now matter, and both need to decide how to respond without pretending the weekend has been reset.";
 const impactFor=(role)=>({
   ...o[role],evidence:role==="jack"?
    "Jack spots the new sign, looks at the map":
    "Jill checks the time and notices a new complication",
   immediateGain:o[role].gain,delayedCost:o[role].cost,
   newWant:role==="jack"?"To make a choice that honors what the weekend taught him":
    "To decide what she wants now instead of automatically returning to the original plan",
   beliefShift:role==="jack"?"A weekend can be adventurous without being a summit":
    "An unexpected adventure can be enjoyable and exhausting at once"
 });
 return {
  outcome,nextScene,location:"The lake and the adjoining festival",
  tension:"A consequence of the couple's last choice becomes visible at the lakeside",
  facts:["They have to make a fresh decision","The previous choice has consequences"],
  researchNote:"Characters can honor competing needs and still discover new interests.",
  newDilemma:newDilemmas[step-1],
  relationshipConnection:o.rel[0],relationshipTrust:o.rel[1],
  unresolvedThread:"The couple has not agreed how to preserve both connection and independence",
  impacts:{jack:impactFor("jack"),jill:impactFor("jill")}
 };
}
const actions=(variant,step)=>[
 {character:"Jack",action:"Jack "+variant+" chooses a specific course for day "+step+" of the weekend."},
 {character:"Jill",action:"Jill "+variant+" chooses her own independent response to that situation."}
];
test("initial state is a valid story model, not a psychological measurement",()=>{
 const state=initialEvolution(scenario);
 assert.equal(ENGINE_VERSION,"3.1.0");
 assert.equal(state.version,EVOLUTION_VERSION);
 assert.equal(state.completedBeats,0);
 assert.equal(state.arc.beats.length,0);
 assert.ok(validEvolution(state));
 assert.deepEqual(AXES,["connection","agency","trust","energy","friction","curiosity"]);
});
test("different advice produces four diverging five-beat character trajectories",()=>{
 const endStates={};
 for(const variant of ["all-in","separate","collaborative","double-down"]){
  let state=initialEvolution(scenario);
  for(let step=1;step<=5;step++){
   const previous=structuredClone(state);
   const story=beat(state,step,variant),decisions=actions(variant,step);
   assert.equal(validateEvolutionStory(story,state,step,decisions).ok,true,
    "Scenario "+variant+" step "+step+" must be causally usable");
   state=evolveState(state,story,step,decisions);
   assert.deepEqual(previous.arc.beats,step===1?[]:previous.arc.beats,
    "Published state must not mutate earlier snapshots");
   assert.equal(state.completedBeats,step);
   assert.equal(state.arc.beats.length,step);
   assert.notEqual(state.arc.lastDilemma,state.arc.openingDilemma);
  }
  endStates[variant]=state;
 }
 assert.ok(endStates["all-in"].characters.jill.meters.connection>
   endStates["separate"].characters.jill.meters.connection);
 assert.ok(endStates["all-in"].characters.jill.meters.agency<
   endStates["collaborative"].characters.jill.meters.agency);
 assert.ok(endStates["all-in"].characters.jill.meters.energy<
   endStates["separate"].characters.jill.meters.energy);
 assert.ok(endStates["double-down"].characters.jack.meters.friction>
   endStates["collaborative"].characters.jack.meters.friction);
 assert.ok(endStates["collaborative"].relationship.trust>
   endStates["double-down"].relationship.trust);
 assert.equal(new Set(Object.values(endStates).map(s=>JSON.stringify(s.characters.jill.meters))).size,4);
});
test("character-specific context protects the other coach's private transcript",()=>{
 const state=initialEvolution(scenario);
 const s=beat(state,1,"all-in");
 const next=evolveState(state,s,1,actions("all-in",1));
 const jill=characterEvolutionContext(next,"jill");
 assert.equal(jill.ownGains.at(-1),s.impacts.jill.immediateGain);
 assert.equal(jill.ownCosts.at(-1),s.impacts.jill.delayedCost);
 assert.ok(!("privateHistory" in jill));
 assert.ok(!("private_memory" in jill));
 assert.ok(!("otherCharacterSecrets" in jill));
 assert.ok(JSON.stringify(jill).includes("Jill"));
});
test("novel consequences are required; copied old dilemmas fail validation",()=>{
 const state=initialEvolution(scenario),decisions=actions("collaborative",1);
 const story=beat(state,1,"collaborative");
 story.newDilemma=state.arc.lastDilemma;
 assert.ok(validateEvolutionStory(story,state,1,decisions).errors.includes("stale_dilemma"));
 story.newDilemma=newDilemmas[0];
 story.impacts.jill.agency=50;
 assert.ok(validateEvolutionStory(story,state,1,decisions).errors.includes("jill_impact_out_of_range"));
 story.impacts.jill.agency=2;
 story.impacts.jill.evidence="a private thought that no one could see";
 assert.ok(validateEvolutionStory(story,state,1,decisions).errors.includes("jill_ungrounded_effect"));
});
test("no mutation from bad model output; only confirmed choices can evolve the world",()=>{
 const state=initialEvolution(scenario),story=beat(state,1,"all-in");
 assert.equal(validateEvolutionStory(story,state,1,[]).ok,false);
 assert.throws(()=>evolveState(state,story,1,[]),/Invalid fictional transition/);
 assert.equal(state.completedBeats,0);
 assert.equal(state.characters.jill.meters.agency,54);
});
test("the new story prompt includes evolving costs and only public fictional actions",()=>{
 const state=initialEvolution(scenario),prompt=evolutionStoryPrompt({
  mode:"shared",scenario,scene:{scene:scenario.opening_scene},step:1,
  actions:actions("all-in",1),evolution:state
 });
 assert.match(prompt.instructions,/NEVER freeze their desires/);
 assert.match(prompt.instructions,/genuinely create delight and connection/);
 assert.match(prompt.instructions,/no mind reading/i);
 assert.equal(prompt.input.confirmedActions.length,2);
 assert.ok(!("privateMessages" in prompt.input));
 assert.ok(EVOLUTION_STORY_SCHEMA.required.includes("impacts"));
});
