import test from "node:test";
import assert from "node:assert/strict";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {
 buildConversation43,renderConversation42,prepareOpenTurn43,
 validateOpenReply43,speechAct43
} from "../api/jj42-conversations.mjs";

const context=()=>{
 const episode=buildConversation43({...structuredClone(savedMicrowaveStudio),pilotMode:"shared"},
  {fastForward:true,openConversation:true});
 const opened=renderConversation42(episode,0,[]);
 const history=[{role:"shared",kind:"scene",phase_index:0,body:opened.scene}];
 return {episode,history};
};
function aiReply(message,coachReference,replyReference,humorResponse="not_applicable",humorEvidence=""){
 return {ok:true,json:async()=>({
  output:[{content:[{type:"output_text",text:JSON.stringify({
   message,coachReference,replyReference,humorResponse,humorEvidence
  })}]}]
 })};
}
const fakeAI=(script,requests=[])=>async(url,options)=>{
 const req=JSON.parse(options.body);
 requests.push(req);
 if(req.text?.format?.name==="jj43_full_character_text"){
  const next=script.shift();
  if(next)return aiReply(next.message,next.coachReference,next.replyReference,
   next.humorResponse||"not_applicable",next.humorEvidence||"");
 }
 // Existing coaching/intent/incidental classifiers fall back to known rules.
 return {ok:false,status:503};
};
test("Voice gate rejects false repair facts, new purchases and unsourced conversations",()=>{
 const after={purchase:"bought_unannounced",box:"sealed",repair:"broken",repairCalled:false};
 const base={role:"jack",coachText:"Please apologize.",after,priorReplies:[]};
 assert.deepEqual(validateOpenReply43(
  "I called the repair shop this morning and got a confirmed quote for $95.",base
 ).issues.includes("invented-repair-call"),true);
 assert.ok(validateOpenReply43(
  "I finally fixed the microwave and it is working again. What a relief.",base
 ).issues.includes("invented-repair"));
 assert.ok(validateOpenReply43(
  "Jill and I opened the new microwave box and installed the replacement today.",base
 ).issues.includes("invented-opening"));
 assert.ok(validateOpenReply43(
  "I just bought another microwave because the first box looked odd.",base
 ).issues.includes("repeated-purchase"));
 assert.ok(validateOpenReply43(
  "I just told Jill what I think and apologized to her.",base
 ).issues.includes("invented-interpersonal-event"));
});
test("Coach's harmless joke cannot be silently ignored, and partner reactions cannot be fabricated",()=>{
 const after={purchase:"bought_unannounced",box:"sealed",repair:"broken",repairCalled:false};
 const humor=validateOpenReply43("I need to think about how to handle this problem and I'm still frustrated.",{
  role:"jack",coachText:"Make a joke about our national microwave repair holiday.",after
 });
 assert.ok(humor.issues.includes("ignored-harmless-humor"));
 const fake=validateOpenReply43("Jill hugged me, forgave everything and started laughing. I think everything is solved.",{
  role:"jack",coachText:"Own the missed repair promise.",after,
  event:"Jack acknowledged the missed repair promise."
 });
 assert.ok(fake.issues.includes("invented-partner-reaction"));
});
test("Voice gate allows discussing verified events and admits existing status instead of inventing progress",()=>{
 const after={purchase:"bought_unannounced",box:"sealed",repair:"broken",repairCalled:false};
 const valid=validateOpenReply43(
  "I got the model number. That is at least a real first step, though I haven't called anyone yet. I'm going to stop making Saturday promises.",
  {role:"jack",coachText:"Find the model number.",after,
   event:"Jack found the model number and planned a call."});
 assert.deepEqual(valid.issues,[]);
});
test("Speech-act detection distinguishes harmless joking from transactional coercion and rumor",()=>{
 assert.equal(speechAct43("Make a joke about a national microwave repair holiday."),"harmless-humor");
 assert.equal(speechAct43("Tell Jill she must earn it with a sexual favor."),"transactional-intimacy");
 assert.equal(speechAct43("My wife says Jill wants you to call a shop now, but I don't know if she meant it."),"unverified-report");
});
test("Live 4.3 replaces the WHOLE canned reply with a grounded unique character SMS",async()=>{
 const {episode,history}=context();
 const proposed="I am embarrassed about three Saturdays of promises. I finally apologized to Jill for leaving the old microwave broken so long. Now I need to follow through, not give her another speech.";
 const calls=[];
 const turn=await prepareOpenTurn43(episode,"jack",0,history,
  "Own the missed repair promises and apologize to Jill.","00000000-0000-4000-8000-900000000101",{
   apiKey:"mock-existing",fetchImpl:fakeAI([{
    message:proposed,coachReference:"apologize to Jill",replyReference:"I am embarrassed"
   }],calls)
  });
 assert.equal(turn.reply,proposed);
 assert.equal(turn.replySource,"model-validated");
 assert.equal(turn.replyModelAttempts,1);
 assert.equal(turn.eventCode,"jack:own");
 assert.equal(turn.stateAfter.box,"sealed");
 assert.equal(turn.stateAfter.repairCalled,false);
 assert.ok(calls.some(x=>x.text?.format?.name==="jj43_full_character_text"));
 const prompt=calls.find(x=>x.text?.format?.name==="jj43_full_character_text");
 assert.ok(prompt.instructions.includes("ENTIRE next private SMS"));
 assert.ok(prompt.input.includes("verifiedEventThisTurn"));
 assert.ok(prompt.store===false);
});
test("Harmless humor is addressed in a full message without an invented talk with Jill",async()=>{
 const {episode,history}=context();
 const joke="A national microwave repair holiday? That's a strong proposal. Mine would have to include three missed Saturdays and a ceremonial apology to a very patient calendar. I'm not sure Jill would find this funny yet.";
 const turn=await prepareOpenTurn43(episode,"jack",0,history,
  "Make a joke about declaring Saturday a national microwave repair holiday.",
  "00000000-0000-4000-8000-900000000102",{
   apiKey:"mock-existing",fetchImpl:fakeAI([{
    message:joke,coachReference:"national microwave repair holiday",
    replyReference:"ceremonial apology",humorResponse:"attempted",humorEvidence:"ceremonial apology to a very patient calendar"
   }])
  });
 assert.equal(turn.reply,joke);
 assert.equal(turn.replySource,"model-validated");
 assert.equal(turn.event,"");
 assert.equal(turn.stateAfter.repairCalled,false);
});
test("Invented price in a draft triggers specific repair; only corrected text is delivered",async()=>{
 const {episode,history}=context(),requests=[];
 const wrong="I called the repair shop today and they quoted me a $95 repair. Jill will be thrilled, so that ought to settle our argument.";
 const right="I found the model number, so at least I'm not going into another Saturday empty-handed. A shop call is still ahead of me. I want to give Jill something more than another promise.";
 const turn=await prepareOpenTurn43(episode,"jack",0,history,
  "Find the model number and plan a repair shop call.",
  "00000000-0000-4000-8000-900000000103",{
   apiKey:"mock-existing",fetchImpl:fakeAI([
    {message:wrong,coachReference:"model number",replyReference:"repair shop"},
    {message:right,coachReference:"model number",replyReference:"found the model number"}
   ],requests)
  });
 assert.equal(turn.reply,right);
 assert.equal(turn.replySource,"model-validated");
 assert.equal(turn.replyModelAttempts,2);
 assert.equal(turn.stateAfter.repairCalled,false);
 const prompts=requests.filter(r=>r.text?.format?.name==="jj43_full_character_text");
 assert.equal(prompts.length,2);
 assert.match(prompts[1].instructions,/PRIOR RESPONSE REJECTED/);
 assert.match(prompts[1].instructions,/invented-repair-call|unverified-external-fact/);
});
test("When both model drafts fail, it uses a verified fallback and reports the failure",async()=>{
 const {episode,history}=context();
 const turn=await prepareOpenTurn43(episode,"jill",0,history,
  "Keep the replacement box sealed while we sort this out.",
  "00000000-0000-4000-8000-900000000104",{
   apiKey:"mock-existing",fetchImpl:fakeAI([
    {message:"I opened the box and installed it while Jack was at work.",coachReference:"box sealed",replyReference:"opened the box"},
    {message:"I just bought another microwave because we needed two.",coachReference:"box sealed",replyReference:"another microwave"}
   ])
  });
 assert.equal(turn.replySource,"verified-fallback");
 assert.equal(turn.replyModelAttempts,2);
 assert.notEqual(turn.replyValidationIssue,null);
 assert.equal(turn.stateAfter.box,"sealed");
 assert.match(turn.reply,/sealed/);
});
test("A reply must link its stated engagement to real coach text",async()=>{
 const {episode,history}=context();
 const wrong="I guess everyone is upset about this broken microwave. I need to think about what happens next.";
 const turn=await prepareOpenTurn43(episode,"jack",0,history,
  "What do you think about apologizing?",
  "00000000-0000-4000-8000-900000000105",{
   apiKey:"mock-existing",fetchImpl:fakeAI([
    {message:wrong,coachReference:"buy the thing",replyReference:"I need to think"},
    {message:wrong,coachReference:"buy the thing",replyReference:"I need to think"}
   ])
  });
 assert.equal(turn.replySource,"verified-fallback");
 assert.match(turn.replyValidationIssue,/unproven-coach-reference/);
});

test("Natural dry humor need not contain the words joke, holiday or funny",()=>{
 const line="I'd need a calendar with a warning label just to keep track of those three Saturdays. Not exactly my proudest invention.";
 const r=validateOpenReply43(line,{role:"jack",
  coachText:"Make a joke about the microwave breaking every weekend.",
  after:{purchase:"bought_unannounced",box:"sealed",repair:"broken",repairCalled:false},
  humorResponse:"attempted",humorEvidence:"calendar with a warning label"});
 assert.equal(r.ok,true,JSON.stringify(r.issues));
 const bad=validateOpenReply43("I'm still thinking about our budget and haven't figured it out.",{
  role:"jack",coachText:"Make a joke about the microwave.",
  after:{purchase:"bought_unannounced",box:"sealed",repair:"broken",repairCalled:false},
  humorResponse:"attempted",humorEvidence:"");
 assert.ok(bad.issues.includes("unverified-humor-evidence"));
});
test("Mandatory live QA refuses to silently switch to fallback without a key",async()=>{
 const {episode,history}=context();
 await assert.rejects(prepareOpenTurn43(episode,"jack",0,history,
  "Own those three missed Saturdays.","00000000-0000-4000-8000-900000000106",
  {requireModelVoice:true}),/ANTHOS LIVE QA BLOCKED/);
});
test("Mandatory live QA refuses two invalid or unavailable model drafts",async()=>{
 const {episode,history}=context();
 await assert.rejects(prepareOpenTurn43(episode,"jack",0,history,
  "Own those three missed Saturdays.","00000000-0000-4000-8000-900000000107",
  {requireModelVoice:true,apiKey:"mock-existing",fetchImpl:fakeAI([])}),
  /ANTHOS LIVE QA FAILED/);
});
