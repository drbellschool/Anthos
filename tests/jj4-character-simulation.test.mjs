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
 jack:{position:"undecided",emotion:"worried",decisionEvidence:"",
  belief:"Unannounced spending may endanger our shared savings",beliefEvidence:"",
  feltCost:"",costEvidence:""},
 jill:{position:"favor",emotion:"frustrated",decisionEvidence:"",
  belief:"Jack's missed repair promises leave me to solve daily problems",beliefEvidence:"",
  feltCost:"",costEvidence:""},
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
test("opening a box's pamphlet does not silently open the box itself",()=>{
 const p=delta();
 const sentence="Jack opens the box’s return policy pamphlet and glances at Jill. The still-sealed $400 box waits on the counter.";
 p.newEvent.evidence="Jack opens the box’s return policy pamphlet";
 p.objectChanges=[{id:"replacement_box",condition:"opened",location:"kitchen counter",
  actionEvidence:"Jack opens the box’s return policy pamphlet"}];
 const out=checkSimulationTransition(base(),p,sentence,0);
 assert.equal(out.ok,true,out.reason);
 assert.equal(out.state.objects[0].condition,"sealed");
});
test("reading a return label without unsealing does NOT open the replacement box",()=>{
 const p=delta();
 const scene="Jack peels back the tape corner, squinting at the print on the return label. He smooths the tape back down without breaking the seal fully. The box stays sealed on the counter. Jill watches him.";
 p.newEvent.evidence="Jack peels back the tape corner, squinting at the print on the return label.";
 p.objectChanges=[{id:"replacement_box",condition:"opened",location:"kitchen counter",
  actionEvidence:"Jack peels back the tape corner"}];
 const out=checkSimulationTransition(base(),p,scene,0);
 assert.equal(out.ok,true,out.reason);
 assert.equal(out.state.objects[0].condition,"sealed");
 assert.ok(out.state.events[0].evidence.length>12);
 const later={...delta(),newEvent:{actor:"Jill",action:"insists on the decision",evidence:"Jill says she wants to keep it"}};
 const follow=checkSimulationTransition(out.state,later,"Jill says she wants to keep it. The box remains sealed.",1);
 assert.equal(follow.ok,true,follow.reason);
 assert.equal(follow.state.objects[0].condition,"sealed");
});
test("repeated unresolved questions collapse into distinct threads",()=>{
 const p=delta();
 p.openThreads=["Whether to keep or return the microwave",
  "Decision whether to keep or return the replacement microwave",
  "How to rebuild shared savings"];
 const prior=base();
 prior.openThreads=["Whether to keep the microwave","How to rebuild shared savings"];
 const out=checkSimulationTransition(prior,p,beat,0);
 assert.equal(out.ok,true,out.reason);
 assert.ok(out.state.openThreads.length<5);
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

test("characters retain independent fears and beliefs after a new scene",()=>{
 const previous=base(),out=checkSimulationTransition(previous,delta(),beat,0);
 assert.equal(out.ok,true,out.reason);
 assert.match(out.state.characters.jack.fear,/financial security/i);
 assert.match(out.state.characters.jill.fear,/missed promise/i);
 assert.notEqual(previous.characters.jack.belief,previous.characters.jill.belief);
 assert.equal(out.state.characters.jack.belief,previous.characters.jack.belief);
 assert.equal(out.state.characters.jill.belief,previous.characters.jill.belief);
});
test("visible Jill interpretation and cost never overwrite Jack's belief",()=>{
 const previous=base(),p=delta();
 const JillBelief="Jack is not taking me seriously";
 p.jill.belief=JillBelief;
 p.jill.beliefEvidence="Jill says she is not taking his delay lightly.";
 p.jill.feltCost="Jill feels dismissed.";
 p.jill.costEvidence="Jill says she feels dismissed by his response.";
 const scene="Jack looks at the box. Jill says she is not taking his delay lightly. Jill says she feels dismissed by his response.";
 const out=checkSimulationTransition(previous,p,scene,0);
 assert.equal(out.ok,true,out.reason);
 assert.equal(out.state.characters.jill.belief,JillBelief);
 assert.equal(out.state.characters.jill.feltCost,"Jill feels dismissed.");
 assert.equal(out.state.characters.jack.belief,previous.characters.jack.belief);
 assert.equal(out.state.characters.jack.feltCost,"");
});
test("covert belief edit and other-character evidence cannot silently change Jack",()=>{
 const previous=base(),p=delta();
 p.jack.belief="Jill intended to bankrupt us";
 p.jack.beliefEvidence="Jill says she feels dismissed by his response.";
 p.jack.feltCost="Jack is devastated";
 p.jack.costEvidence="Jack silently imagines an entirely new betrayal.";
 const scene="Jack stands near the counter. Jill says she feels dismissed by his response.";
 const out=checkSimulationTransition(previous,p,scene,0);
 assert.equal(out.ok,true,out.reason);
 assert.equal(out.state.characters.jack.belief,previous.characters.jack.belief);
 assert.equal(out.state.characters.jack.feltCost,"");
 assert.ok(out.adjustments.some(s=>s.includes("belief retained")));
});


test("regression: refusing to open a box cannot mutate persisted physical state",()=>{
 const previous=base(),proposal=delta();
 const scene="Jack stands by the sealed box and says, 'Let's not open the box tonight.' Jill nods and writes 'decide tomorrow' on the sealed package.";
 const res=checkSimulationTransition(previous,proposal,scene,0);
 assert.equal(res.ok,true,res.reason);
 assert.equal(res.state.objects[0].condition,"sealed");
});
test("regression: models cannot turn Jill's explicit refusal into an open box",()=>{
 const previous=base(),proposal=delta();
 proposal.objectChanges=[{id:"replacement_box",condition:"opened",location:"kitchen counter",
  actionEvidence:"Jill says she will not open the box tonight"}];
 const scene="Jill says she will not open the box tonight. Jack looks upset. The box remains sealed.";
 const res=checkSimulationTransition(previous,proposal,scene,0);
 assert.equal(res.ok,true,res.reason);
 assert.equal(res.state.objects[0].condition,"sealed");
});
test("regression: conditional discussion cannot count as completed box opening",()=>{
 const previous=base(),proposal=delta();
 const scene="Jack says, 'If Jill opened the box, we could not put it back exactly.' Jill crosses her arms. The box is still sealed.";
 const res=checkSimulationTransition(previous,proposal,scene,0);
 assert.equal(res.ok,true,res.reason);
 assert.equal(res.state.objects[0].condition,"sealed");
});
test("positive unsealing remains durable with a real on-stage action",()=>{
 const previous=base(),proposal=delta();
 const scene="Jill opened the microwave box with both hands, then placed the lid on the counter. Jack watched her in silence.";
 const res=checkSimulationTransition(previous,proposal,scene,0);
 assert.equal(res.ok,true,res.reason);
 assert.equal(res.state.objects[0].condition,"opened");
 const p2=delta();
 const sequel=checkSimulationTransition(res.state,p2,"Jack says, 'Let's not open the box again.' Jill stands beside him.",1);
 assert.equal(sequel.ok,true,sequel.reason);
 assert.equal(sequel.state.objects[0].condition,"opened");
});


test("a different Anthos petal retains its own authored facts, not microwave facts",()=>{
 const episode={title:"Changing Seasons of Desire",jackMotivation:"Wants connection",jillMotivation:"Needs autonomy",
  simulationSeed:{enabled:true,knownFacts:["Neither partner owes sex in response to a gift.","Consent must be freely given."],
   jackBelief:"Jill may be drifting away",jillBelief:"Jack may misunderstand my exhaustion"}};
 const state=initialSimulation(episode);
 assert.equal(state.knownFacts.length,2);
 assert.match(state.knownFacts[0],/gift/);
 assert.doesNotMatch(state.knownFacts.join(" "),/microwave|\$400/);
 assert.match(state.characters.jack.belief,/drifting away/);
 assert.match(state.characters.jill.belief,/misunderstand/);
});


test("Batch 1 regression: the opened microwave box cannot become sealed in Reflection",()=>{
 const previous=base();
 const opened=checkSimulationTransition(previous,delta(),"Jill breaks the tape on the microwave box and lifts the lid. Jack watches her.",0);
 assert.equal(opened.ok,true,opened.reason);
 assert.equal(opened.state.objects[0].condition,"opened");
 const next=delta();
 next.objectChanges=[{id:"replacement_box",condition:"sealed",location:"kitchen counter",
  actionEvidence:"The sealed microwave box waits quietly on the counter."}];
 const invalid=checkSimulationTransition(opened.state,next,
  "Jack places the repair note by the sink. The sealed microwave box waits quietly on the counter. Jill looks away.",1);
 assert.equal(invalid.ok,false);
 assert.match(invalid.reason,/opened box/);
});
test("Batch 1 regression: a sealed replacement microwave box in prose contradicts an already opened box",()=>{
 const state=base();state.objects[0].condition="opened";state.lastPhase=0;
 const r=checkSimulationTransition(state,delta(),
  "Jack looks at the sealed microwave box, although Jill had opened it. Jill nods.",1);
 assert.equal(r.ok,false);
 assert.match(r.reason,/opened box/);
});
test("Batch 1 regression: an unsubstantiated structured sealed transition is rejected",()=>{
 const state=base();state.objects[0].condition="opened";state.lastPhase=0;
 const proposed=delta();
 proposed.objectChanges=[{id:"replacement_box",condition:"sealed",location:"kitchen counter",actionEvidence:"Jack shifts the lid on the counter"}];
 const result=checkSimulationTransition(state,proposed,"Jack shifts the lid on the counter while Jill watches.",1);
 assert.equal(result.ok,false);
});

test("QA live event ledger credits Jill rather than Jack for Jill-only quoted action",()=>{
 const proposal=delta();
 proposal.newEvent={actor:"Jack",action:"Jack accepted for Jill",
  evidence:'Jill replied, "Sunday after lunch is better than nothing."'};
 const story='Jack read his phone. Jill replied, "Sunday after lunch is better than nothing."';
 const out=checkSimulationTransition(base(),proposal,story,0);
 assert.equal(out.ok,true,out.reason);
 assert.equal(out.event.actor,"Jill");
 assert.equal(out.event.action,proposal.newEvent.evidence);
 assert.ok(out.adjustments.some(x=>/corrected event actor/.test(x)));
});

test("a two-character observed event does not guess an actor from a mention",()=>{
 const proposal=delta();
 proposal.newEvent={actor:"Jack",action:"Jack texted Jill",evidence:"Jack texted Jill a specific time."};
 const out=checkSimulationTransition(base(),proposal,"Jack texted Jill a specific time. Jill read the message.",0);
 assert.equal(out.ok,true,out.reason);
 assert.equal(out.event.actor,"Jack");
});

test("the visible seal breaking is committed even when AI proposes no object changes",()=>{
 const prior=base();
 const scene=beat+" Jill peels tape from the new microwave box. The box’s seal breaks with a sharp tear.";
 const proposal=delta();
 proposal.objectChanges=[];
 const result=checkSimulationTransition(prior,proposal,scene,0);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.state.objects.find(x=>x.id==="replacement_box").condition,"opened");
});
test("opening a previously opened box again must be rejected",()=>{
 const prior=base();
 prior.objects.find(x=>x.id==="replacement_box").condition="opened";
 prior.lastPhase=0;
 const scene="Jack watches Jill open the new microwave box. Jill says she needed to act.";
 const proposal=delta();
 proposal.objectChanges=[];
 const result=checkSimulationTransition(prior,proposal,scene,1);
 assert.equal(result.ok,false);
 assert.match(result.reason,/already opened/i);
});
