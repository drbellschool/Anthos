import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SIMULATION_VERSION,SIMULATION_SCENE_SCHEMA,initialSimulation,simulationEnabled,
 checkSimulationTransition,observedEventExcerpt} from "../api/jj4-character-simulation.mjs";
const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase/migrations/20261115190000_jj4_character_simulation_state.sql",import.meta.url),"utf8");
const testEpisode={title:"The Four-Hundred-Dollar Surprise",
 jackMotivation:"Protect shared emergency savings while admitting delay",
 jillMotivation:"Keep the kitchen usable and assert independence"};
const base=()=>initialSimulation(testEpisode);
const delta=()=>({
 jack:{position:"undecided",emotion:"worried",decisionEvidence:""},
 jill:{position:"favor",emotion:"frustrated",decisionEvidence:""},
 objectChanges:[],
 newEvent:{actor:"Jack",action:"asked about shared savings",
 evidence:"Jack put the statement beside the microwave"},
 openThreads:["Whether to keep the replacement microwave"]
});
const beat="Jack put the statement beside the microwave and asked Jill about the $400 charge. Jill held her position: she wanted a working appliance.";

test("new character simulation keeps opposing positions distinct, without numerical marital scores",()=>{
 const s=base();
 assert.equal(s.version,SIMULATION_VERSION);
 assert.equal(s.lastPhase,-1);
 assert.equal(s.characters.jack.position,"undecided");
 assert.equal(s.characters.jill.position,"favor");
 assert.equal(s.objects[0].condition,"sealed");
 assert.match(s.knownFacts[0],/Jill made the \$400 purchase/);
 assert.equal("meters" in s.characters.jack,false);
});
test("simulation is activated only by a pinned versioned room, not existing pilots",()=>{
 assert.equal(simulationEnabled({scenario_id:"67588dbf-b108-460d-87aa-c3a10d326d35"}),false);
 assert.equal(simulationEnabled({simulation_state:base()}),true);
 assert.equal(simulationEnabled({simulation_state:{version:"evolution-1"}}),false);
 const other=initialSimulation({title:"The Night We Said Yes",jackMotivation:"Protect his hope",jillMotivation:"Explore trust"});
 assert.equal(other.objects.length,0);
 assert.match(other.characters.jack.want,/Protect his hope/);
});
test("scene can progress without arbitrarily changing either character's decision",()=>{
 const s=base(),result=checkSimulationTransition(s,delta(),beat,0);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.state.lastPhase,0);
 assert.equal(result.state.characters.jack.position,"undecided");
 assert.equal(result.state.characters.jill.position,"favor");
 assert.equal(s.lastPhase,-1,"The old snapshot must not mutate");
 assert.equal(result.state.events.length,1);
});
test("unexplained agreement is ignored without stalling a usable story",()=>{
 const p=delta();p.jack.position="favor";
 let res=checkSimulationTransition(base(),p,beat,0);
 assert.equal(res.ok,true,res.reason);
 assert.equal(res.state.characters.jack.position,"undecided");
 assert.ok(res.adjustments.some(x=>x.includes("retained prior stance")));
 p.jack.decisionEvidence="Jack put the statement beside the microwave";
 res=checkSimulationTransition(base(),p,beat,0);
 assert.equal(res.ok,true);
 assert.equal(res.state.characters.jack.position,"undecided","Putting down a statement is not consent");
});
test("explicitly chosen change may update a character, but a different role remains independent",()=>{
 const p=delta();
 p.jack.position="favor";p.jack.decisionEvidence="I want to keep this microwave";
 const scene=beat+" Jack said, 'I want to keep this microwave.'";
 const out=checkSimulationTransition(base(),p,scene,0);
 assert.equal(out.ok,true,out.reason);
 assert.equal(out.state.characters.jack.position,"favor");
 assert.equal(out.state.characters.jill.position,"favor");
});
test("object change must be a narrated action and is persisted",()=>{
 const p=delta();
 p.objectChanges=[{id:"replacement_box",condition:"opened",location:"kitchen counter",
 actionEvidence:"Jill peeled back the tape and opened the box"}];
 let out=checkSimulationTransition(base(),p,beat,0);
 assert.equal(out.ok,true,out.reason);
 assert.equal(out.state.objects[0].condition,"sealed","Unsupported box-state proposals must be ignored");
 out=checkSimulationTransition(base(),p,beat+" Jill peeled back the tape and opened the box.",0);
 assert.equal(out.ok,true,out.reason);
 assert.equal(out.state.objects[0].condition,"opened");
 const next={...delta(),newEvent:{actor:"Jack",action:"saw the receipt",evidence:"Jack saw the paper receipt"}};
 const contradict=checkSimulationTransition(out.state,next,
   "The unopened box sat between them. Jack saw the paper receipt.",1);
 assert.equal(contradict.ok,false);
 assert.match(contradict.reason,/box/i);
});
test("invalid phase cannot advance, while paraphrased event evidence is safely replaced",()=>{
 assert.equal(checkSimulationTransition(base(),delta(),beat,2).ok,false);
 const p=delta();p.newEvent.evidence="A phone call that never occurred";
 const out=checkSimulationTransition(base(),p,beat,0);
 assert.equal(out.ok,true,out.reason);
 assert.ok(beat.includes(out.event.evidence));
 assert.ok(!out.event.evidence.includes("phone call"));
 assert.equal(out.event.action,out.event.evidence);
 const excerpt=observedEventExcerpt(beat);
 assert.match(excerpt,/Jack put the statement/);
});
test("no character action means no fallback to an invented event",()=>{
 const p=delta();p.newEvent.evidence="A phone call never shown";
 const result=checkSimulationTransition(base(),p,"It was quiet. The clock ticked. Both were thinking.",0);
 assert.equal(result.ok,false);
});
test("visible box opening is recorded even when the model forgets its metadata",()=>{
 const p=delta();p.objectChanges=[];
 const result=checkSimulationTransition(base(),p,beat+" Jack opened the packaging.",0);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.state.objects[0].condition,"opened");
});
test("scene schema records evidence separate from narrative words",()=>{
 assert.ok(SIMULATION_SCENE_SCHEMA.properties.simulation);
 assert.ok(SIMULATION_SCENE_SCHEMA.required.includes("jackBeat"));
 assert.ok(SIMULATION_SCENE_SCHEMA.required.includes("simulation"));
});
test("simulation writes state atomically with scene and leaves earlier pilots alone",()=>{
 assert.match(sql,/simulation_state jsonb/);
 assert.match(sql,/public\.anthos_jj4_commit_scene\(p_room,p_claim,p_phase,p_story,p_jack,p_jill\)/);
 assert.match(sql,/insert into public\.anthos_jj4_simulation_events/);
 assert.match(sql,/primary key\(room_id,phase\)/);
 assert.match(sql,/enable row level security/);
 assert.match(core,/simulation_state:initialSimulation\(draft\)/);
 assert.match(core,/simulationEnabled\(latest\)/);
 assert.match(core,/anthos_jj4_commit_simulated_scene/);
 assert.match(core,/SIMULATION_SCENE_SCHEMA/);
});
