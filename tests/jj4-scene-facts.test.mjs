import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initialSimulation,checkSimulationTransition,SIMULATION_SCENE_SCHEMA} from "../api/jj4-character-simulation.mjs";
import {saveSceneFacts,sceneFactsForAI,SCENE_METADATA_SCHEMA} from "../api/jj4-scene-facts.mjs";

const initial=()=>initialSimulation({title:"Can We Talk Later?",sceneSetting:"Kitchen breakfast at the family calendar.",
 jackMotivation:"Reach the work meeting",jillMotivation:"Receive a credible time to talk"});
const story="At 6:00 p.m., Jack placed the new brass keys on the kitchen counter. Jill watched silently.";
const event=(action="placed the keys")=>({
 jack:{position:"undecided",emotion:"anxious",decisionEvidence:"",
  belief:"I need to get to work",beliefEvidence:"",feltCost:"",costEvidence:""},
 jill:{position:"undecided",emotion:"uncertain",decisionEvidence:"",
  belief:"I need an actual return time",beliefEvidence:"",feltCost:"",costEvidence:""},
 objectChanges:[],actorMoves:[],
 newEvent:{actor:"Jack",action,evidence:"Jack placed the new brass keys on the kitchen counter."},
 humor:{attempted:false,actionEvidence:"",reactionEvidence:""},openThreads:[],
 sceneMetadata:{when:{label:"6 p.m.",evidence:"At 6:00 p.m., Jack placed the new brass keys on the kitchen counter."},
  objectsIntroduced:[{id:"brass_keys",label:"brass keys",condition:"new",location:"kitchen counter",
   evidence:"Jack placed the new brass keys on the kitchen counter."}]}
});
test("scene schema requires private time/object metadata on every new generated scene",()=>{
 assert.ok(SIMULATION_SCENE_SCHEMA.properties.simulation.properties.sceneMetadata);
 assert.deepEqual(SCENE_METADATA_SCHEMA.required,["when","objectsIntroduced"]);
 assert.ok(SCENE_METADATA_SCHEMA.properties.when.required.includes("kind"));
 assert.ok(SIMULATION_SCENE_SCHEMA.properties.simulation.required.includes("sceneMetadata"));
});
test("a completed scene persists all five Ws and the newly introduced object",()=>{
 const result=checkSimulationTransition(initial(),event(),story,0,{
  coachedRoles:["jack"],
  coachingTrace:{jackEvidence:"Jack placed the new brass keys on the kitchen counter."}});
 assert.equal(result.ok,true,result.reason);
 const facts=result.state.sceneFacts[0];
 assert.equal(facts.phase,0);
 assert.deepEqual(facts.who.map(x=>x.character),["Jack","Jill"]);
 assert.equal(facts.where.jack,"kitchen");
 assert.equal(facts.where.jill,"kitchen");
 assert.match(facts.what.action,/placed the keys/);
 assert.match(facts.when.anchor,/6:00 p.m./);
 assert.match(facts.why.jack.want,/work meeting/);
 assert.match(facts.why.jack.coachedEffect,/brass keys/);
 assert.equal(facts.why.jill.coachedEffect,"");
 assert.equal(result.state.objects[0].id,"brass_keys");
 assert.equal(result.state.objects[0].location,"kitchen counter");
 assert.equal(result.state.objects[0].condition,"new");
 assert.equal(facts.objects[0].id,"brass_keys");
});
test("next scene inherits known time and the full object register",()=>{
 const one=checkSimulationTransition(initial(),event(),story,0);
 const update=event("kept the keys");
 update.sceneMetadata={when:{label:"tomorrow morning",evidence:"Not actually spoken"},
  objectsIntroduced:[{id:"brass_keys",label:"brass keys",location:"new shelf",condition:"broken",
   evidence:"imaginary object action"}]};
 update.newEvent={actor:"Jill",action:"asked about the meeting",evidence:"Jill asked about the meeting."};
 const follow="Jill asked about the meeting. Jack picked up his coffee and said he needed time.";
 const two=checkSimulationTransition(one.state,update,follow,1);
 assert.equal(two.ok,true,two.reason);
 assert.equal(two.state.sceneFacts.length,2);
 assert.equal(two.state.sceneFacts[1].when.anchor,one.state.sceneFacts[0].when.anchor);
 assert.equal(two.state.objects.length,1);
 assert.equal(two.state.objects[0].condition,"new");
 const prompt=sceneFactsForAI(two.state);
 assert.equal(prompt.recentScenes.length,2);
 assert.equal(prompt.trackedObjects[0].id,"brass_keys");
});
test("invented time/props without visible evidence do not enter committed state",()=>{
 const state=initial();
 state.events=[{actor:"Jack",action:"asked Jill a question",evidence:"Jack asked Jill a question."}];
 const fake={when:{label:"Sunday at 7",evidence:"Jack spoke on Sunday at seven."},
  objectsIntroduced:[{id:"imaginary_receipt",label:"receipt",location:"wallet",condition:"paid",
   evidence:"Jack paid and saved the receipt."}]};
 const result=saveSceneFacts(state,fake,"Jack asked Jill a question.",0);
 assert.equal(result.state.objects.length,0);
 assert.equal(result.state.sceneFacts[0].when.anchor,"time not established");
 assert.ok(result.adjustments.length>=2);
});
test("metadata is passed to BOTH causal coach planner and scene narrator",()=>{
 const source=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
 assert.equal((source.match(/continuityFacts:sceneFactsForAI\(simulationBefore\)/g)||[]).length,2);
 assert.match(source,/coachedRoles:influence\?Object\.keys\(influence\.advice\):\[\],coachingTrace:result\.coachingTrace/);
});
test("records include only public scene evidence, never a private coaching message",()=>{
 const state=initial();
 state.events=[{actor:"Jack",action:"responded",evidence:"Jack placed the new brass keys on the kitchen counter."}];
 const secret="PRIVATE_COACH_MESSAGE_DO_NOT_REVEAL";
 const out=saveSceneFacts(state,{when:{label:"6pm",evidence:"At 6:00 p.m., Jack placed the new brass keys on the kitchen counter."},
 objectsIntroduced:[]},story,0,{coachedRoles:["jack"],coachingTrace:{jackEvidence:secret}});
 assert.ok(!JSON.stringify(out.state.sceneFacts).includes(secret));
 assert.equal(out.state.sceneFacts[0].why.jack.coachedEffect,"");
});

test("object movement is committed only when the destination was witnessed",()=>{
 const first=checkSimulationTransition(initial(),event(),story,0);
 const bad=event("put the keys away");
 bad.sceneMetadata={when:{label:"",evidence:""},objectsIntroduced:[]};
 bad.objectChanges=[{id:"brass_keys",condition:"new",location:"Jill's purse",
  actionEvidence:"Jack looked at the new brass keys on the kitchen counter."}];
 bad.newEvent={actor:"Jack",action:"looked at the keys",
  evidence:"Jack looked at the new brass keys on the kitchen counter."};
 const second=checkSimulationTransition(first.state,bad,
  "Jack looked at the new brass keys on the kitchen counter.",1);
 assert.equal(second.ok,true,second.reason);
 assert.equal(second.state.objects[0].location,"kitchen counter");
 assert.ok(second.adjustments.some(x=>x.includes("ignored object relocation")));
 const real=event("moved the keys");
 real.sceneMetadata={when:{label:"",evidence:""},objectsIntroduced:[]};
 real.objectChanges=[{id:"brass_keys",condition:"new",location:"Jill's purse",
  actionEvidence:"Jill slid the new brass keys into Jill's purse."}];
 real.newEvent={actor:"Jill",action:"moved the keys into her purse",
  evidence:"Jill slid the new brass keys into Jill's purse."};
 const third=checkSimulationTransition(second.state,real,
  "Jill slid the new brass keys into Jill's purse.",2);
 assert.equal(third.ok,true,third.reason);
 assert.equal(third.state.objects[0].location,"Jill's purse");
 assert.equal(third.state.sceneFacts[2].objects[0].location,"Jill's purse");
});
test("later model inputs use a single latest object registry, not redundant snapshots",()=>{
 const one=checkSimulationTransition(initial(),event(),story,0);
 const input=sceneFactsForAI(one.state);
 assert.ok(!Object.hasOwn(input.recentScenes[0],"objects"));
 assert.equal(input.trackedObjects.length,1);
});

test("planned Sunday time is not mistaken for the current scene clock",()=>{
 const state=initial();
 state.events=[{actor:"Jill",action:"requested a scheduled conversation",
  evidence:"Jill suggested Sunday at seven for a conversation."}];
 const s="Jill suggested Sunday at seven for a conversation.";
 const result=saveSceneFacts(state,{when:{label:"Sunday 7 p.m.",kind:"future_reference",evidence:s},
 objectsIntroduced:[]},s,0);
 assert.equal(result.state.sceneFacts[0].when.anchor,"time not established");
 assert.deepEqual(result.state.sceneFacts[0].when.futureReferences,[s]);
});
test("a future reference does not override previously committed scene time",()=>{
 const state=initial();
 state.events=[{actor:"Jack",action:"sent a text",
  evidence:"At 6:00 p.m., Jack sent Jill a text."}];
 saveSceneFacts(state,{when:{label:"6 p.m.",kind:"current",
 evidence:"At 6:00 p.m., Jack sent Jill a text."},objectsIntroduced:[]},
 "At 6:00 p.m., Jack sent Jill a text.",0);
 state.events.push({actor:"Jill",action:"suggested Sunday",
  evidence:"Jill suggested Sunday at seven for a conversation."});
 saveSceneFacts(state,{when:{label:"Sunday",kind:"future_reference",
 evidence:"Jill suggested Sunday at seven for a conversation."},objectsIntroduced:[]},
 "Jill suggested Sunday at seven for a conversation.",1);
 assert.match(state.sceneFacts[1].when.anchor,/6:00 p.m./);
 assert.equal(state.sceneFacts[1].when.futureReferences.length,1);
});

test("a story about a paper note cannot move or break different keys",()=>{
 const state=initialSimulation({sceneSetting:"kitchen",simulationSeed:{objects:[
  {id:"brass_keys",condition:"intact",location:"kitchen counter"},
  {id:"paper_note",condition:"folded",location:"desk"}]}});
 const scene="Jill folded the paper note and placed it inside Jill's purse. Jack watched quietly.";
 const p=event("put the note away");
 p.objectChanges=[{id:"brass_keys",condition:"broken",location:"Jill's purse",
  actionEvidence:"Jill folded the paper note and placed it inside Jill's purse."}];
 p.sceneMetadata={when:{kind:"unspecified",label:"",evidence:""},objectsIntroduced:[]};
 p.newEvent={actor:"Jill",action:"folded a note",
  evidence:"Jill folded the paper note and placed it inside Jill's purse."};
 const result=checkSimulationTransition(state,p,scene,0);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.state.objects[0].condition,"intact");
 assert.equal(result.state.objects[0].location,"kitchen counter");
 assert.ok(result.adjustments.some(a=>a.includes("wrong object")));
});
test("an object cannot spontaneously become broken when only relocated",()=>{
 const state=initialSimulation({sceneSetting:"kitchen",simulationSeed:{objects:[
  {id:"brass_keys",condition:"intact",location:"kitchen counter"}]}});
 const scene="Jack placed the brass keys inside his jacket pocket.";
 const p=event("tucked keys into a pocket");
 p.objectChanges=[{id:"brass_keys",condition:"broken",location:"jacket pocket",
  actionEvidence:"Jack placed the brass keys inside his jacket pocket."}];
 p.sceneMetadata={when:{kind:"unspecified",label:"",evidence:""},objectsIntroduced:[]};
 p.newEvent={actor:"Jack",action:"moved the keys",
  evidence:"Jack placed the brass keys inside his jacket pocket."};
 const result=checkSimulationTransition(state,p,scene,0);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.state.objects[0].condition,"intact");
 assert.equal(result.state.objects[0].location,"jacket pocket");
 assert.ok(result.adjustments.some(a=>a.includes("unsupported object condition")));
});
test("two similar sets of keys cannot share a change unless specified",()=>{
 const state=initialSimulation({sceneSetting:"kitchen",simulationSeed:{objects:[
  {id:"brass_keys",condition:"intact",location:"counter"},
  {id:"car_keys",condition:"intact",location:"drawer"}]}});
 const scene="Jack placed the keys in his jacket pocket.";
 const p=event("moved keys");
 p.objectChanges=[{id:"brass_keys",condition:"intact",location:"jacket pocket",
  actionEvidence:"Jack placed the keys in his jacket pocket."}];
 p.sceneMetadata={when:{kind:"unspecified",label:"",evidence:""},objectsIntroduced:[]};
 p.newEvent={actor:"Jack",action:"moved keys",evidence:"Jack placed the keys in his jacket pocket."};
 const result=checkSimulationTransition(state,p,scene,0);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.state.objects[0].location,"counter");
});
