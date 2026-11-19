import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initialSimulation,simulationEnabled,SIMULATION_VERSION} from "../api/jj4-character-simulation.mjs";
import {validateActorLocations} from "../api/jj4-actor-state.mjs";

const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
test("every NEW v4 pilot starts the original persistent simulation state",()=>{
 assert.match(core,/simulation_state:initialSimulation\(draft\)/);
 assert.doesNotMatch(core,/seed\?\.enabled===true\s*;\s*const simulate/);
 const state=initialSimulation({title:"Can We Talk Later?",sceneSetting:"Kitchen breakfast, Jack at the door."});
 assert.equal(state.version,SIMULATION_VERSION);
 assert.equal(simulationEnabled({simulation_state:state}),true);
 assert.equal(simulationEnabled({simulation_state:null}),false);
 assert.equal(state.actorLocations.jack.place,"kitchen");
 assert.equal(state.lastPhase,-1);
});
test("after the Hook the initial setting is NOT injected a second time",()=>{
 assert.match(core,/sceneSetting:phaseIndex===0\?room\.episode\.sceneSetting:""/);
 assert.doesNotMatch(core,/sceneSettingForPhase/);
});
test("simulated rooms use the existing chronology and compact editing checks",()=>{
 assert.match(core,/if\(qualityGate\|\|simulate\)\{\s*const chronology=committedTimelineViolation/);
 assert.match(core,/if\(\(qualityGate\|\|simulate\)&&checkSceneLength\(story\)\.words>110\)/);
 assert.match(core,/if\(lastUsable&&!qualityGate\)/);
});
test("a committed exit prevents silent reappearance at the kitchen doorway",()=>{
 const start=initialSimulation({sceneSetting:"Kitchen, a weekday breakfast at the family calendar."});
 const left=validateActorLocations(start,"Jack finally exited the house. Jill stayed at the calendar.",0,[]);
 assert.equal(left.ok,true,left.reason);
 assert.equal(left.locations.jack.place,"away");
 assert.equal(left.locations.jack.departedFrom,"kitchen");
 const reset=validateActorLocations({actorLocations:left.locations},
  "Jack pauses at the kitchen door without returning, his hand on the knob.",1,[]);
 assert.equal(reset.ok,false);
 assert.match(reset.reason,/jack.*without narrated travel/i);
});
test("a narrated return home succeeds and clears the departure",()=>{
 const start=initialSimulation({sceneSetting:"Kitchen, a weekday breakfast."});
 const exited=validateActorLocations(start,"Jack finally exited the house. Jill stayed in the kitchen.",0,[]);
 assert.equal(exited.ok,true,exited.reason);
 const returned=validateActorLocations({actorLocations:exited.locations},
  "Jack walked back into the kitchen and greeted Jill.",1,[]);
 assert.equal(returned.ok,true,returned.reason);
 assert.equal(returned.locations.jack.place,"kitchen");
 assert.equal(returned.locations.jack.departedFrom,undefined);
});
test("Jack arriving at work after leaving home is permitted",()=>{
 const initial=initialSimulation({sceneSetting:"Kitchen, a weekday breakfast."});
 const left=validateActorLocations(initial,"Jack finally exited the house.",0,[]);
 assert.equal(left.ok,true,left.reason);
 const office=validateActorLocations({actorLocations:left.locations},
  "At the office, Jack read the meeting agenda.",1,[]);
 assert.equal(office.ok,true,office.reason);
 assert.equal(office.locations.jack.place,"office");
});
