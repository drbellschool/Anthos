import test from "node:test";
import assert from "node:assert/strict";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {buildConversation43,weeklyRehearsal42,parseLedger42,renderConversation42,developmentTransition43,renderCharacterMessage42} from "../api/jj42-conversations.mjs";
import {DEVELOPMENTAL_PHASES,normalizeDevelopmentalFlow,weightedSkillRating,offlineCoaching43,validateCoaching43,ratingObject43} from "../api/jj43-developmental.mjs";
import {normalizeStudio} from "../api/episode-studio.mjs";
const ep=()=>buildConversation43({...structuredClone(savedMicrowaveStudio),pilotMode:"shared"},{fastForward:true});
const run=advice=>weeklyRehearsal42(ep(),advice);
test("4.3 editorial flow retains skill IDs, scores, evidence and independent legacy stories",()=>{
 const draft={...structuredClone(savedMicrowaveStudio),developmentalFlow:{hook:{objective:"Recognize a disputed financial decision.",evidence:"Invites input or excludes a spouse.",emphasis:{"s-decisions":5,"g-start":1,"g-influence":4,"bogus":5}}}};
 const normalized=normalizeStudio(draft,{...draft,mode:"shared"});
 assert.equal(normalized.developmentalFlow.hook.emphasis["g-start"],1);
 assert.equal(normalized.developmentalFlow.hook.emphasis.bogus,undefined);
 assert.equal(normalized.developmentalFlow.hook.objective,draft.developmentalFlow.hook.objective);
 assert.equal(normalized.phases.hook,draft.phases.hook);
 assert.equal(Object.keys(normalized.developmentalFlow).length,6);
 assert.deepEqual(DEVELOPMENTAL_PHASES.map(p=>p.title),["Recognize","Interpret","Navigate","Regulate","Differentiate","Discover"]);
});
test("emphasis is not performance and missing evidence is excluded",()=>{
 const r={"s-decisions":5,"g-start":1,"g-influence":null};
 assert.equal(weightedSkillRating(r,{"s-decisions":5,"g-start":1,"g-influence":5}),26/6);
 assert.equal(weightedSkillRating(r,{"s-decisions":1,"g-start":5,"g-influence":5}),10/6);
 assert.equal(weightedSkillRating({"g-start":null},{"g-start":5}),null);
 assert.equal(offlineCoaching43("Not sure.")["g-start"],null);
 assert.equal(validateCoaching43({ratings:[{skill:"s-decisions",score:5,evidence:"made up"}]},"Call Jack."),null);
});
test("weekly paths choose different private recipients and preserve real outcomes",()=>{
 const buy=run(["Buy it now without asking.","Blame her and lecture her.","Open the microwave box now.","Demand she admit you're right.","Open it now."]);
 const consult=run(["Call Jack first and consider his concerns.","Listen to his concern.","Own the missed repair promises and explain why.","Call the repair shop today.","Wait and review together."]);
 assert.equal(buy.rounds[1].role,"jack");
 assert.equal(consult.rounds[1].role,"jill");
 for(const p of [buy,consult]){
  assert.equal(p.rounds.length,5);
  assert.equal(p.ledger.length,6);
  assert.equal(new Set(p.ledger.slice(0,5).map(x=>x.task)).size,5);
  assert.ok(p.rounds.filter(x=>x.role==="jack").length>=2);
  assert.ok(p.rounds.filter(x=>x.role==="jill").length>=2);
  assert.ok(p.ledger.every(x=>JSON.stringify(x).length<=2500));
  assert.ok(p.sophia.length<=2500);
  assert.match(p.sophia,/GENTLE STARTUP/);
 }
 assert.equal(buy.ledger[5].state.box,"opened");
 assert.notEqual(consult.ledger[5].state.purchase,"bought_unannounced");
 assert.ok(buy.ledger[5].state.strain>consult.ledger[5].state.strain);
 assert.equal(consult.ledger[5].state.repairCalled,true);
 assert.match(consult.sophia,/made the call/);
 assert.match(buy.sophia,/Missed opportunity/);
});
test("actual behavior and recommended advice are separate, and harsh advice cannot score a good startup",()=>{
 const e=ep();const first=parseLedger42(renderConversation42(e,0,[]).scene).state;
 const emphasis=e.authored43.flow.conflict.emphasis;
 const strain={...first,strain:5};
 const result=developmentTransition43(strain,1,"Own your missed promises and listen respectfully.",emphasis,{ratings:ratingObject43([5,5,5]),action:"accountable"});
 assert.equal(result.assessment.recommended,"accountable");
 assert.equal(result.assessment.enacted,"firm");
 assert.equal(result.assessment.coachingStrength,5);
 assert.notEqual(result.assessment.behaviorStrength,5);
 assert.match(result.event,/resisted/);
 const bad=developmentTransition43(first,1,"Blame her and lecture her.",emphasis);
 assert.equal(bad.assessment.behavior["g-start"],2);
 assert.equal(bad.assessment.coaching["g-start"],1);
 const no=developmentTransition43(first,0,"Wait.",emphasis);
 assert.equal(no.assessment.behavior["g-start"],null);
});
test("4.3 model context sees own coaching only; ratings use evidence and are not stored in customer dialogue",async()=>{
 const e=ep(),first=renderConversation42(e,0,[]),history=[{role:"shared",kind:"scene",phase_index:0,body:first.scene},{role:"jill",kind:"coach",phase_index:0,body:"Call Jack first."}];
 const requests=[];
 await renderCharacterMessage42(e,1,history,{apiKey:"fake",fetchImpl:async(_,options)=>{requests.push(JSON.parse(options.body));return {ok:false}}});
 assert.ok(requests.some(r=>r.text.format.name==="jj43_coach_rubric"));
 const msg=requests.find(r=>r.text.format.name==="jj42_private_text");
 assert.ok(msg);
 assert.ok(JSON.parse(msg.input).developmentalObjective);
});

test("changing author emphasis changes the next decision opportunity, not just a displayed score",()=>{
 const create=()=>ep();
 const historyFor=e=>{
  const h=[];
  for(let day=0;day<2;day++){
   const out=renderConversation42(e,day,h);
   h.push({role:"shared",kind:"scene",phase_index:day,body:out.scene},
    {role:out.recipient,kind:"coach",phase_index:day,body:day===0?"Call Jack first.":"Listen to his concern."});
  }
  return h;
 };
 const standard=create(),focused=create();
 focused.authored43.flow.discovery.emphasis={"s-decisions":5,"g-start":1,"g-influence":1};
 const a=parseLedger42(renderConversation42(standard,2,historyFor(standard)).scene);
 const b=parseLedger42(renderConversation42(focused,2,historyFor(focused)).scene);
 assert.equal(a.task,1);
 assert.equal(b.task,3);
 assert.equal(a.state.purchase,b.state.purchase);
 assert.equal(a.recipient,"jack");assert.equal(b.recipient,"jack");
});
