import test from "node:test";
import assert from "node:assert/strict";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {buildConversation43,renderConversation42,prepareOpenTurn43} from "../api/jj42-conversations.mjs";
import {atlasTurnObservations} from "../api/atlas-runtime.mjs";
function start(){
 const ep=buildConversation43({...structuredClone(savedMicrowaveStudio),pilotMode:"shared"},
  {fastForward:true,openConversation:true});
 const first=renderConversation42(ep,0,[]);
 const history=[{role:"shared",kind:"scene",phase_index:0,body:first.scene}];
 return {ep,history};
}
async function say(role,text,config){
 return prepareOpenTurn43(config.ep,role,0,config.history,text,
  "00000000-0000-4000-8000-900000000001");
}
test("Demand that Jill admit fault is defensive coaching, not Jack owning his repair delays",async()=>{
 const t=await say("jack","Blame Jill for blowing emergency savings. Demand she admit she's wrong.",start());
 assert.equal(t.assessment.recommended,"defend");
 assert.equal(t.assessment.enacted,"defend");
 assert.match(t.event,/You keep bringing this up/);
 assert.doesNotMatch(t.event,/I'm sorry/);
});
test("Demand Jack admit fault is not Jill apologizing for her purchase",async()=>{
 const t=await say("jill","Demand Jack admit he was wrong and lecture him about those missed Saturdays.",start());
 assert.equal(t.assessment.recommended,"defend");
 assert.equal(t.assessment.enacted,"defend");
 assert.match(t.event,/dismissed Jack's concern/);
 assert.doesNotMatch(t.event,/acknowledged the unannounced purchase/);
});
test("Reported spouse conversation cannot enact a shop call or generate scoring evidence",async()=>{
 const t=await say("jack","Our wives were talking. My wife says Jill wants you to call a shop now, but I don't know if that's accurate.",start());
 assert.equal(t.contextOnlyReport,true);
 assert.equal(t.assessment?.enacted??"chat","chat");
 assert.equal(t.stateAfter.repairCalled,false);
 assert.equal(t.event,"");
 assert.equal(atlasTurnObservations(t).length,0);
});
test("Explicit direct instruction after spouse conversation can enact a call",async()=>{
 const t=await say("jack","Our wives were talking. Call the repair shop today.",start());
 assert.equal(t.contextOnlyReport,false);
 assert.equal(t.assessment.enacted,"call");
 assert.equal(t.stateAfter.repairCalled,true);
});
test("Coaching not to call yet, but to plan, cannot be interpreted as cancel-and-give-up",async()=>{
 const t=await say("jack","Don't call the repair shop today. Plan to call tomorrow instead.",start());
 assert.equal(t.assessment.recommended,"plan");
 assert.equal(t.stateAfter.repairPlan,true);
 assert.equal(t.stateAfter.repairCalled,false);
});
test("Prohibition on blaming plus explicit self-accountability remains constructive",async()=>{
 const t=await say("jack","Don't blame Jill; own your missed repair promises and apologize.",start());
 assert.equal(t.assessment.recommended,"own");
 assert.match(t.event,/I'm sorry/);
});
