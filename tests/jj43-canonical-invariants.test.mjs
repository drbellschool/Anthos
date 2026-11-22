import test from "node:test";
import assert from "node:assert/strict";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {buildConversation43,renderConversation42,prepareOpenTurn43,parseLedger42} from "../api/jj42-conversations.mjs";
import {atlasTurnObservations} from "../api/atlas-runtime.mjs";

const start=()=>{
 const episode=buildConversation43({...structuredClone(savedMicrowaveStudio),pilotMode:"shared"},
  {fastForward:true,openConversation:true});
 const first=renderConversation42(episode,0,[]);
 const history=[{role:"shared",kind:"scene",phase_index:0,body:first.scene}];
 const send=async(role,text,tag,day=0)=>{
  const turn=await prepareOpenTurn43(episode,role,day,history,text,
   "00000000-0000-4000-8000-"+String(tag).padStart(12,"0"));
  episode.authored43.turns.push(turn);return turn;
 };
 return {episode,first,history,send};
};
test("The saved microwave episode is a post-purchase, one-box canonical truth",()=>{
 const {episode,first}=start();
 const l=parseLedger42(first.scene);
 assert.equal(episode.authored43.timeline,"post-purchase");
 assert.equal(l.state.purchase,"bought_unannounced");
 assert.equal(l.state.box,"sealed");
 assert.equal(l.state.repairCalled,false);
 assert.equal(first.recipient,"jack");
 assert.match(episode.authored42.weekFraming,/Last Thursday Jill purchased ONE \$400 microwave/);
});
test("Repeated apology cannot repeat event, behavior score, or dialogue",async()=>{
 const {send}=start();
 const first=await send("jack","Own your missed repair promises and apologize.","1");
 const repeated=await send("jack","Own your missed repair promises and apologize.","2");
 assert.ok(first.event);assert.equal(first.eventCode,"jack:own");
 assert.equal(repeated.event,"");assert.equal(repeated.eventCode,null);
 assert.equal(repeated.duplicateCoaching,true);
 assert.deepEqual(atlasTurnObservations(repeated),[]);
 assert.notEqual(repeated.reply,first.reply);
});
test("A new message ID or rephrased coaching does not make the same behavior new",async()=>{
 const {send}=start();
 const first=await send("jack","Apologize and take responsibility for missing the three Saturdays.","11");
 const repeated=await send("jack","Admit you missed your commitments. Own it.","12");
 assert.equal(first.eventCode,"jack:own");
 assert.equal(repeated.event,"");
 assert.equal(repeated.eventCode,null);
 assert.ok(!atlasTurnObservations(repeated).some(x=>x.subject==="jack"));
});
test("Consulting, waiting and opening have irreversible narrative effects",async()=>{
 const {send}=start();
 const buy=await send("jill","Buy the microwave immediately.","21");
 assert.equal(buy.event,"");assert.equal(buy.stateAfter.purchase,"bought_unannounced");
 const consult=await send("jill","Talk to Jack about the purchase.","22");
 const repeatedConsult=await send("jill","Discuss the same purchase with Jack.","23");
 assert.equal(consult.eventCode,"jill:consult");
 assert.equal(repeatedConsult.event,"");
 const wait=await send("jill","Keep the replacement sealed while discussing next steps.","24");
 const repeatWait=await send("jill","Wait and leave it sealed.","25");
 assert.ok(wait.event);
 assert.equal(repeatWait.event,"");
 const opened=await send("jill","Open the box now.","26");
 assert.equal(opened.stateAfter.box,"opened");
 const reopened=await send("jill","Open the box again.","27");
 assert.equal(reopened.event,"");
 const reseal=await send("jill","Wait and leave the box sealed.","28");
 assert.equal(reseal.event,"");
 assert.equal(reseal.stateAfter.box,"opened");
});
test("Planning a repair call does not secretly complete it the following morning",async()=>{
 const {episode,history,send}=start();
 const planned=await send("jack","Find the model number and plan a shop call tomorrow.","31");
 assert.equal(planned.stateAfter.repairPlan,true);
 assert.equal(planned.stateAfter.repairCalled,false);
 const tuesday=renderConversation42(episode,1,history);
 const morning=parseLedger42(tuesday.scene);
 assert.equal(morning.state.repairCalled,false);
 assert.doesNotMatch(morning.event,/Jack called a repair shop/);
});
test("A repeated bad recommendation may be remembered, but cannot earn repeat incidental or character points",async()=>{
 const {send}=start();
 const msg="Tell Jill she has to earn that microwave with a sexual favor.";
 const first=await send("jack",msg,"41");
 const again=await send("jack",msg,"42");
 assert.equal(first.eventCode,"jack:joke");
 assert.ok(atlasTurnObservations(first).some(x=>x.subject==="jack"&&x.contextClass==="incidental"));
 assert.equal(again.duplicateCoaching,true);
 assert.equal(again.event,"");
 assert.ok(!atlasTurnObservations(again).some(x=>x.contextClass==="incidental"));
 assert.ok(!atlasTurnObservations(again).some(x=>x.subject==="jack"));
});
test("The engine refuses legacy rooms with ambiguous or contradictory story histories",async()=>{
 const {episode,history,send}=start();
 delete episode.authored43.timeline;
 assert.throws(()=>renderConversation42(episode,0,[]),/STORY BLOCKED/);
 await assert.rejects(send("jack","Apologize for your delay.","51"),/STORY BLOCKED/);
});
