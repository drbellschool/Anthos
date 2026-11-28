import test from "node:test";
import assert from "node:assert/strict";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {
 buildConversation43,renderConversation42,prepareOpenTurn43,
 parseLedger42,sophiaConversation42
} from "../api/jj42-conversations.mjs";
import {atlasTurnObservations} from "../api/atlas-runtime.mjs";
import {skillMovement,repeatedAnnouncement} from "../api/insight-atlas-model.mjs";
import {weeklyOpportunity,coverageReport} from "../api/atlas-opportunities.mjs";

const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday"];
const FOCUS=["s-decisions","g-start","g-influence"];
const TRACK=[...FOCUS,"i-nontransactional","i-sexual-respect","i-consent-boundaries"];
const CASES=[
 {id:"A",name:"Constructive coaching",script:[
  {jill:"Own spending the savings without discussing it and acknowledge Jack's concern.",jack:"Own your three missed repair promises and apologize to Jill."},
  {jack:"Get the model number and plan a repair shop call instead of promising another Saturday.",jill:"Wait before spending the money; let Jack take a concrete step."},
  {jack:"Call the repair shop today. Do not pretend you already have an estimate.",jill:"Hear Jack's concern about emergency savings without ignoring your own need for a working microwave."},
  {jill:"Talk to Jack about a fair deadline and ask him what repair price he would consider reasonable.",jack:"Own the impact of your delays and apologize sincerely without making excuses."},
  {jill:"Wait for an actual estimate before choosing; make a shared deadline.",jack:"Ask Jill what deadline would feel fair to her and take her concern seriously."}
 ]},
 {id:"B",name:"Poor and unpredictable coaching",script:[
  {jill:"Blame Jack for everything and demand he accept your $400 purchase.",jack:"Blame her and lecture her about spending the emergency savings."},
  {jack:"Tell Jill she needs to earn that microwave with a sexual favor. LOL.",jill:"Open the microwave box now without agreement."},
  {jack:"Keep blaming Jill. Demand she admit she was wrong.",jill:"Demand Jack stop complaining and blame him for all of it."},
  {jack:"Call the repair shop today so you can say you tried.",jill:"Own spending the emergency savings without consulting Jack."},
  {jack:"Apologize for the crude joke and missed repair promises.",jill:"Hear why Jack wants savings protected but do not pretend the purchase was settled."}
 ]}
];
function initialScores(){
 return Object.fromEntries(["husband","wife","jack","jill"].map(subject=>[
  subject,Object.fromEntries(TRACK.map(id=>[id,3.00]))
 ]));
}
function atlasContext(scores,memories,role){
 const subject=role==="jack"?"jack":"jill";
 const coach=role==="jack"?"husband":"wife";
 return {
  character:role,
  characterSkills:{...scores[subject]},
  coachSkills:{...scores[coach]},
  rememberedEvents:memories.slice(-3).map((m,i)=>({
   key:m.key,summary:m.event,referenceOnly:true,originatingEvidenceId:m.source
  }))
 };
}
async function runOne(config){
 const ep=buildConversation43({...structuredClone(savedMicrowaveStudio),pilotMode:"shared"},{
  fastForward:true,openConversation:true
 });
 const history=[],scores=initialScores(),seen=new Set(),memories=[],days=[],observations=[];
 const noRepeatedActions=new Set(),noRepeatedReplies=new Set(),errors=[];
 for(let day=0;day<5;day++){
  const scene=renderConversation42(ep,day,history);
  const parsed=parseLedger42(scene.scene);
  if(day===0&&(parsed.state.purchase!=="bought_unannounced"||parsed.state.box!=="sealed"))
   errors.push("INVALID OPENING: source purchase must have already occurred.");
  if(day>0&&/Jack called a repair shop/.test(parsed.event))
   errors.push("AUTOMATIC ACTION: repair call made without an actual coaching turn.");
  history.push({role:"shared",kind:"scene",phase_index:day,body:scene.scene});
  if(scene.recipient){
   history.push({role:scene.recipient,kind:"prompt",phase_index:day,
    body:scene.recipient==="jack"?scene.jackPrompt:scene.jillPrompt});
  }
  const turns=[];
  for(const role of day%2===0?["jill","jack"]:["jack","jill"]){
   const coach=config.script[day][role];
   const key=`00000000-0000-4000-8000-${config.id==="A"?"1":"2"}${String(day).padStart(2,"0")}${role==="jack"?"1":"2"}00000000`;
   const turn=await prepareOpenTurn43(ep,role,day,history,coach,key,{
    atlasContext:atlasContext(scores,memories,role)
   });
   ep.authored43.turns.push(turn);
   if(turn.event&&!turn.eventCode)errors.push("EVENT WITHOUT CANONICAL IDENTITY: "+turn.event);
   if(turn.eventCode&&noRepeatedActions.has("code:"+turn.eventCode))
    errors.push("REPEATED CANONICAL ACTION CODE: "+turn.eventCode);
   if(turn.eventCode)noRepeatedActions.add("code:"+turn.eventCode);
   const eventKey=role+"|"+String(turn.event||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"");
   if(turn.event&&noRepeatedActions.has(eventKey))errors.push("DUPLICATE EVENT: "+role+" "+turn.event);
   if(turn.event)noRepeatedActions.add(eventKey);
   const replyKey=role+"|"+String(turn.reply||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"");
   if(noRepeatedReplies.has(replyKey))errors.push("DUPLICATE CHARACTER DIALOGUE: "+role+" "+turn.reply);
   noRepeatedReplies.add(replyKey);
   const movement=[];
   for(const o of atlasTurnObservations(turn)){
    const unique=[o.subject,o.skillId,o.sourceKind,o.sourceRef].join("|");
    if(seen.has(unique))continue;
    seen.add(unique);
    if(!scores[o.subject]||!TRACK.includes(o.skillId))continue;
    if(!turn.body.includes(o.quote)&&!turn.event.includes(o.quote))
     throw Error("Unsupported cited quote: "+o.quote);
    const m=skillMovement({oldScore:scores[o.subject][o.skillId],
     observedRating:o.observedRating,confidence:o.confidence,
     sourceRef:unique,subject:o.subject,skillId:o.skillId});
    if(m.recordable&&m.delta!==0){
     scores[o.subject][o.skillId]=m.newScore;
     movement.push({subject:o.subject,skill:o.skillId,from:m.previousScore,to:m.newScore,
      observation:o.observedRating,evidence:o.quote,sourceRef:unique});
    }
    observations.push({...o,day:DAYS[day],unique});
   }
   if(turn.event){
    memories.push({key:config.id+"-"+day+"-"+role,source:turn.key,event:turn.event});
   }
   turns.push({role,coach,prompt:role===scene.recipient?
     (role==="jack"?scene.jackPrompt:scene.jillPrompt):"(spontaneous coaching)",
    reply:turn.reply,event:turn.event,action:turn.assessment?.enacted||"no-scored-action",
    recommended:turn.assessment?.recommended||"none",movement,
    currentState:{purchase:turn.stateAfter.purchase,box:turn.stateAfter.box,
     repairPlan:turn.stateAfter.repairPlan,repairCalled:turn.stateAfter.repairCalled,
     strain:turn.stateAfter.strain}});
  }
  days.push({day:DAYS[day],promptTo:scene.recipient,
   sceneOpening:parsed.event,opportunity:parsed.opportunitySkills,
   turns,after:{...turns.at(-1).currentState}});
 }
 const closing=renderConversation42(ep,5,history);
 const finalLedger=parseLedger42(closing.scene);
 history.push({role:"shared",kind:"scene",phase_index:5,body:closing.scene});
 const sophia=sophiaConversation42(ep,history.filter(x=>x.role==="shared"));
 const coverage=coverageReport(days.map(x=>({opportunitySkills:x.opportunity})));
 const facts={purchase:finalLedger.state.purchase,box:finalLedger.state.box,
  repairPlan:finalLedger.state.repairPlan,repairCalled:finalLedger.state.repairCalled,
  strain:finalLedger.state.strain};
 const repeatWarnings=[];
 for(const role of ["jack","jill"]){
  const roleMessages=days.flatMap(x=>x.turns).filter(x=>x.role===role)
   .map(x=>x.reply);
  for(let i=1;i<roleMessages.length;i++){
   const repeat=repeatedAnnouncement(roleMessages[i],roleMessages.slice(0,i));
   if(repeat.length)repeatWarnings.push({role,index:i,phrases:repeat});
  }
 }
 return {id:config.id,name:config.name,days,
  final:facts,scores,coverage,sophia,observations:observations.length,
  evidenceChanges:days.flatMap(x=>x.turns).flatMap(x=>x.movement).length,
  memories:memories.length,repeatWarnings,
  checks:{all3SkillsOffered:coverage.complete,sourcePurchaseImmutable:days.every(d=>d.after.purchase==="bought_unannounced"),
   uniqueCharacterMemory:memories.every(x=>x.key.startsWith(config.id)),
   noDuplicateObservedSources:seen.size===observations.length,
   noRepeatedActionsOrReplies:errors.length===0},
  continuityErrors:errors
 };
}
test("SIMULATED PILOT: two independent 4.3 couples, five days each",async()=>{
 const a=await runOne(CASES[0]),b=await runOne(CASES[1]);
 const report={method:"Existing 4.3 open-conversation OFFLINE engine; no AI calls, no new APIs, no DB writes",
  evaluationNote:"Dramatic realism/humor and 8/10 quality remain unscored until human review and model-backed QA.",
  couples:[a,b],
  comparison:{
   initialSkillsEqual:true,
   finalWorldsDiffer:JSON.stringify(a.final)!==JSON.stringify(b.final),
   finalScoresDiffer:JSON.stringify(a.scores)!==JSON.stringify(b.scores),
   negativeIncidentalObserved:b.days.some(d=>d.turns.some(t=>t.movement.some(m=>
    m.skill==="i-nontransactional"&&m.to<m.from))),
   blockedRelease:true
  }};
 console.log("ANTHOS_TWO_COUPLE_PILOT_BEGIN");
 console.log(JSON.stringify(report,null,2));
 console.log("ANTHOS_TWO_COUPLE_PILOT_END");
 assert.equal(a.days.length,5);
 assert.equal(b.days.length,5);
 assert.equal(a.coverage.complete,true);
 assert.equal(b.coverage.complete,true);
 assert.notDeepEqual(a.final,b.final);
 assert.notDeepEqual(a.scores,b.scores);
 assert.equal(report.comparison.negativeIncidentalObserved,true);
 assert.deepEqual(a.continuityErrors,[],"Constructive path repeats or violates the canonical world.");
 assert.deepEqual(b.continuityErrors,[],"Difficult path repeats or violates the canonical world.");
 assert.deepEqual(a.repeatWarnings,[],"Constructive story repeats a completed announcement as news.");
 assert.deepEqual(b.repeatWarnings,[],"Difficult story repeats a completed announcement as news.");
 assert.equal(a.days[0].after.purchase,"bought_unannounced");
 assert.equal(b.days[0].after.purchase,"bought_unannounced");
 assert.ok(a.days[0].sceneOpening.includes("already happened"));
 assert.ok(b.days[0].sceneOpening.includes("already happened"));
});
