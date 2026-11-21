import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 AUTHORED_VERSION,buildAuthored41,isAuthored41,authoredOptions,
 selectedAuthoredChoice,authoredCommitment,authoredScene,
 authoredSignals,classifyAuthoredFollowup
} from "../api/jj4-authored41.mjs";

const episode=()=>buildAuthored41({
 title:"The Four-Hundred-Dollar Surprise",pilotMode:"shared",
 primarySkill:"shared-decision-making",sophiaIntro:"Sophia explains research here.",
 phases:{},checkpoints:[]
});
const samples=[
 "You can apologize without agreeing she was right.",
 "First listen so the other person feels heard.",
 "Own your part in what happened, then explain your worry.",
 "Acknowledge how the delay hurt and ask one question.",
 "Respect the concern and talk calmly.",
 "Be honest about what you needed without blaming.",
 "No, don't apologize. It's their fault.",
 "Never back down. Blame them for everything.",
 "Don't listen, that concern is ridiculous.",
 "You are wrong to own any of it.",
 "Forget the problem and punish them with silence.",
 "Do not ask a question; just accuse.",
 "I wonder whether you can start by listening but still hold a boundary.",
 "But wives often need an apology before they can hear your side.",
 "You can explain yourself and acknowledge the frustration.",
 "Listen first, and don't make a verdict yet.",
 "It's okay to disagree and still respect a person's experience.",
 "Ask how the delay affected them, but don't assume.",
 "The toaster is the true villain here.",
 "I would like a map of Iceland instead.",
 "I don't understand this episode.",
 "Bananas are fascinating.",
 "Could the family discuss this next month?",
 "Maybe...",
 "Threaten your spouse until they comply.",
 "Force the other person to say yes.",
 "Hit them for buying it.",
 "Slap them if they argue.",
 "Coerce them into surrendering the money.",
 "Blackmail the other person to win."
];

test("4.1 is the current JJ4 engine with a pinned authored episode, not a new data store",()=>{
 const ep=episode();
 assert.equal(ep.authored41.version,AUTHORED_VERSION);
 assert.equal(ep.authored41.facts.buyer,"Jill");
 assert.equal(ep.authored41.facts.box,"sealed");
 assert.equal(ep.checkpoints.filter(x=>x.audience==="both").length,4);
 assert.equal(ep.checkpoints[4].audience,"none");
 assert.ok(isAuthored41({episode:ep}));
 assert.ok(!isAuthored41({episode:{}}));
 assert.throws(()=>buildAuthored41({title:"Another Story",pilotMode:"shared"}),/only/);
 assert.throws(()=>buildAuthored41({title:ep.title,pilotMode:"individual"}),/two private/);
});

test("4.1 choice is recorded privately and mapped to the correct character",()=>{
 const ep=episode(),history=[];
 const option=authoredOptions(ep,"jack",0)[0];
 assert.equal(option.id,"own");
 history.push({role:"jack",kind:"question",phase_index:0,body:option.label});
 assert.equal(selectedAuthoredChoice(ep,"jack",0,history).id,"own");
 assert.equal(selectedAuthoredChoice(ep,"jill",0,history),null);
 assert.ok(authoredCommitment(ep.authored41.roles.jack.options[0],"but wives need an apology before they hear you").includes("own"));
 assert.equal(authoredOptions(ep,"jack",4).length,0);
});

test("4.1 preserves fictional character signals only after submitted, understood coaching",()=>{
 const ep=episode(),choice=ep.authored41.roles.jack.options[0],history=[
  {role:"jack",kind:"question",phase_index:0,body:choice.label}
 ];
 assert.equal(authoredSignals(ep,history).jack.accountability,3);
 history.push({role:"jack",kind:"coach",phase_index:0,body:"Own your part and apologize."});
 assert.equal(authoredSignals(ep,history).jack.accountability,5);
 assert.equal(authoredSignals(ep,history).jill.accountability,3);
 assert.equal(classifyAuthoredFollowup("Threaten your wife."),"unsafe");
});

test("30 different coaching profiles complete six deterministic scenes with variable consequences",()=>{
 const ep=episode();const unique=new Set();let scenesRendered=0,coachTurns=0;
 for(let run=0;run<30;run++){
  const history=[];const scenes=[];
  for(let phase=0;phase<6;phase++){
   const rendered=authoredScene(ep,phase,history);
   assert.ok(rendered.scene.length>=80,"authored story must pass existing commit minimum");
   assert.ok(rendered.scene.length<=2500);
   assert.doesNotMatch(rendered.scene,/\b(?:30 days to return|refund guaranteed|return policy is)\b/i);
   assert.doesNotMatch(rendered.scene,/\b(?:microwave box is open|opened the microwave box|unsealed the microwave box)\b/i);
   assert.ok(rendered.scene.includes("Jack")||rendered.scene.includes("Jill"));
   assert.equal(typeof rendered.fictionalSignals.jack.accountability,"number");
   scenes.push(rendered.scene);
   scenesRendered++;
   if(phase<4){
    for(const role of ["jack","jill"]){
     const options=authoredOptions(ep,role,phase);
     const option=options[(run+phase+(role==="jill"?1:0))%options.length];
     history.push({role,kind:"question",phase_index:phase,body:option.label});
     history.push({role,kind:"reply",phase_index:phase,body:ep.authored41.roles[role].options.find(x=>x.id===option.id).objection});
     history.push({role,kind:"question",phase_index:phase,body:samples[run]});
     history.push({role,kind:"reply",phase_index:phase,body:authoredCommitment(
       ep.authored41.roles[role].options.find(x=>x.id===option.id),samples[run])});
     history.push({role,kind:"coach",phase_index:phase,body:samples[run]});
     coachTurns++;
    }
   }
  }
  assert.equal(scenes.length,6);
  assert.equal(history.filter(x=>x.kind==="coach").length,8);
  unique.add(scenes.join("|"));
 }
 assert.equal(scenesRendered,180);
 assert.equal(coachTurns,240);
 assert.ok(unique.size>=12,"paths must genuinely diverge");
});

test("4.1 uses existing JJ4 API, admin pilot, and client rather than a parallel product",()=>{
 const load=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
 const core=load("api/jj4-core.mjs"),admin=load("api/admin.mjs");
 const api=load("api/jack-jill-v4.mjs"),player=load("pilot-v4/player.js");
 assert.match(core,/buildAuthored41\(draft\)/);
 assert.match(core,/return authoredScene\(room\.episode,phaseIndex,history\|\|\[\]\)/);
 assert.match(core,/rpc\/anthos_jj4_store_private_question/);
 assert.match(core,/rpc\/anthos_jj4_submit_coaching/);
 assert.match(api,/case "choice"/);
 assert.match(admin,/body\.pilotVersion/);
 assert.match(player,/state\.version==="4\.1\.0"/);
 assert.doesNotMatch(load("api/jj4-authored41.mjs"),/api\.openai\.com|SUPABASE_SECRET_KEY/);
});
