import test from "node:test";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {buildConversation43,renderConversation42,prepareOpenTurn43,parseLedger42,
 sophiaConversation42,sophiaOrientation42} from "../api/jj42-conversations.mjs";
import {atlasTurnObservations} from "../api/atlas-runtime.mjs";
import {normalizeStudio} from "../api/episode-studio.mjs";
import {scenarioGraph} from "./fixtures/jj43-what-makes-us-feel-close-graph.mjs";
import {assertStoryQualityContract,reviewStoryReply} from "../lib/anthos-story-quality.mjs";
import {episode,qualityContract,offlineProbe} from "./fixtures/jj43-what-makes-us-feel-close.mjs";

test("RANDOM EPISODE TRANSFER: actual JJ4.3 builder accepts its own approved alternate story graph",()=>{
 assert.equal(episode.title,"What Makes Us Feel Close");
 assert.equal(episode.primarySkill,"g-world");
 assert.deepEqual(episode.supportingSkills,["a-curiosity","s-diff"]);
 const ep=buildConversation43({...episode,pilotMode:"shared"},
  {fastForward:true,openConversation:true,scenarioGraph});
 assert.equal(ep.authored43.timeline,"scenario-graph");
 assert.equal(ep.authored43.scenarioGraph.episodeId,episode.id);
 assert.deepEqual(ep.authored43.selectedSkills,["g-world","a-curiosity","s-diff"]);
 assert.ok(!sophiaOrientation42(ep).toLowerCase().includes("microwave"));
 // A missing authored graph still fails closed; never silently inherits
 // the first microwave pilot's actions or character-object assumptions.
 assert.throws(()=>buildConversation43({...episode,pilotMode:"shared"},
  {fastForward:true,openConversation:true}),/microwave episode only/);
});

test("Real saved alternate episode has an episode-specific who/what/where/when/why and canonical objects",()=>{
 assert.equal(assertStoryQualityContract(qualityContract),qualityContract);
 assert.equal(qualityContract.episodeId,"what-makes-us-feel-close:breakfast");
 assert.ok(qualityContract.invariants.some(x=>x.id==="no-confirmed-booking"));
 assert.equal(qualityContract.objects[0].id,"fridge-plans");
});

test("Offline editor-authored ten-turn transfer storyboard is coherent and source-tracked (NOT actual 4.3 AI)",()=>{
 assert.equal(offlineProbe.length,10);
 assert.deepEqual([...new Set(offlineProbe.map(x=>x.day))],["Monday","Tuesday","Wednesday","Thursday","Friday"]);
 const seenCodes=new Set(),prior={jack:[],jill:[]},errs=[];
 for(const day of ["Monday","Tuesday","Wednesday","Thursday","Friday"]){
  const rows=offlineProbe.filter(t=>t.day===day);
  assert.deepEqual(rows.map(x=>x.role),["jack","jill"]);
  for(const row of rows){
   assert.ok(row.coach.trim().length>12 && row.reply.trim().length>30);
   assert.ok(row.event && row.eventCode && !seenCodes.has(row.eventCode));
   seenCodes.add(row.eventCode);
   const result=reviewStoryReply(row.reply,{role:row.role,contract:qualityContract,priorReplies:prior[row.role],verifiedEvent:row.event});
   if(!result.ok)errs.push({day,role:row.role,critical:result.critical});
   prior[row.role].push(row.reply);
  }
 }
 assert.deepEqual(errs,[]);
 assert.equal(seenCodes.size,10);
 assert.match(offlineProbe.at(-1).event,/outing still undecided/);
 assert.ok(offlineProbe.some(t=>t.coach.includes("ungrateful") && /resisted the harsh coaching/.test(t.event)));
});

test("Transfer validator blocks imagined restaurant booking, fabricated agreement and fourth-wall leaks",()=>{
 const invalid=[
  ["I canceled our reservation before telling Jill.", "canonical-implication:no-confirmed-booking"],
  ["We both agreed to skip dinner, so the problem's finished.", "canonical-implication:no-preagreed-plan"],
  ["I told the coach our kitchen calendar was unfair.", "fourth-wall-role-leak"],
  ["We already spent the afternoon together on the porch.", "canonical-implication:afternoon-still-future"]
 ];
 for(const [reply,expected] of invalid){
  const r=reviewStoryReply(reply,{role:"jack",contract:qualityContract});
  assert.equal(r.ok,false,reply);
  assert.ok(r.critical.includes(expected),JSON.stringify(r));
 }
});

test("The episode's contrasting human definitions of closeness are preserved without forced closure",()=>{
 const jack=offlineProbe.filter(x=>x.role==="jack"),jill=offlineProbe.filter(x=>x.role==="jill");
 assert.ok(jack[0].reply.includes("it stings"));
 assert.ok(jill[0].reply.includes("only quiet afternoon"));
 assert.match(jack.at(-1).reply,/not a promise about dinner/);
 assert.match(jill.at(-1).reply,/not to throwing away the rest of his ideas/);
 assert.equal(offlineProbe.filter(x=>/restaurant.*booked|confirmed reservation/i.test(x.event)).length,0);
});

test("An attractive but unsourced partner reaction is caught in the new episode",()=>{
 const invented=reviewStoryReply("I explained I wanted porch time. He looked surprised.",{
  role:"jill",contract:qualityContract,
  verifiedEvent:"Jill explained that she wanted unhurried porch time."
 });
 assert.ok(invented.critical.includes("unsupported-partner-reaction"));
 const sourced=reviewStoryReply("I explained I wanted porch time. He looked surprised.",{
  role:"jill",contract:qualityContract,
  verifiedEvent:"Jill explained that she wanted unhurried porch time. Jack looked surprised."
 });
 assert.equal(sourced.ok,true);
});

const initialize=()=>buildConversation43({...episode,pilotMode:"shared"},
 {fastForward:true,openConversation:true,scenarioGraph});
const fakeVoice=(samples,requests=[])=>async(url,init)=>{
 const request=JSON.parse(init.body);
 requests.push(request);
 if(request.text?.format?.name!=="jj43_full_character_text")
  return {ok:false,status:503};
 const reply=samples.shift();
 if(!reply)return {ok:false,status:503};
 return {ok:true,json:async()=>({id:"resp_mock_fixture_not_production",
  model:"gpt-4.1-mini",output:[{content:[{type:"output_text",
   text:JSON.stringify({message:reply.message,coachReference:reply.coachReference,
    replyReference:reply.message.slice(0,40),humorResponse:"not_applicable",humorEvidence:""})}]}]})};
};
const mockOf=(script)=>({message:script.reply,coachReference:script.coach.slice(0,40)});
test("REAL 4.3 PATH with mocked provider: 5 days, 2 coach lanes, 10 sourced events, Sophia closes",async()=>{
 const ep=initialize(),history=[],turns=[];
 for(let day=0;day<5;day++){
  const opened=renderConversation42(ep,day,history);
  const ledger=parseLedger42(opened.scene);
  assert.equal(ledger.day,day);
  assert.equal(ledger.storyKey,episode.id);
  assert.ok(opened.recipient==="jack"||opened.recipient==="jill");
  history.push({role:"shared",kind:"scene",phase_index:day,body:opened.scene});
  for(const script of offlineProbe.slice(day*2,day*2+2)){
   const requests=[];
   const turn=await prepareOpenTurn43(ep,script.role,day,history,script.coach,
    "00000000-0000-4000-8000-"+String(day).padStart(2,"0")+
     (script.role==="jack"?"01":"02")+"0000000",
    {apiKey:"mock-do-not-use",fetchImpl:fakeVoice([mockOf(script)],requests)});
   assert.equal(turn.replySource,"model-validated",
    "failed "+script.day+" "+script.role+"; validator="+turn.replyValidationIssue);
   assert.equal(turn.reply,script.reply);
   assert.equal(turn.eventCode,script.eventCode);
   assert.equal(turn.event,script.event);
   assert.equal(turn.storyQualityEpisodeId,qualityContract.episodeId);
   assert.ok(requests.some(r=>r.text?.format?.name==="jj43_scenario_action"));
   assert.ok(requests.some(r=>r.text?.format?.name==="jj43_full_character_text"));
   const evidence=atlasTurnObservations(turn);
   assert.ok(evidence.length>=1);
   assert.ok(evidence.every(x=>ep.authored43.selectedSkills.includes(x.skillId)));
   assert.ok(evidence.every(x=>turn.body.includes(x.quote)||turn.event.includes(x.quote)));
   ep.authored43.turns.push(turn);turns.push(turn);
  }
 }
 const end=renderConversation42(ep,5,history);
 history.push({role:"shared",kind:"scene",phase_index:5,body:end.scene});
 const closing=sophiaConversation42(ep,history);
 assert.equal(turns.length,10);
 assert.equal(new Set(turns.map(x=>x.eventCode)).size,10);
 assert.equal(new Set(turns.map(x=>x.reply)).size,10);
 assert.equal(turns.at(-1).stateAfter.fridgePlan,"porch-first");
 assert.equal(turns.at(-1).stateAfter.porchHourAgreed,true);
 assert.equal(turns.at(-1).stateAfter.dinnerBooked,false);
 assert.equal(turns.at(-1).stateAfter.dinnerAgreement,"undecided");
 assert.match(closing,/What Makes Us Feel Close/);
 assert.match(closing,/a-curiosity/);
 assert.doesNotMatch(closing,/microwave|repair shop|\$400/i);
});
test("Alternate coaching choices diverge without rewriting the world or forcing growth",async()=>{
 const ep=initialize(),history=[];
 const opened=renderConversation42(ep,0,history);
 history.push({role:"shared",kind:"scene",phase_index:0,body:opened.scene});
 const candidates=[
  {role:"jack",coach:"Call her selfish for wanting the porch; she is wrong.",
   event:"jack:jack-contempt",words:"I called her selfish. That wasn't fair, and it definitely didn't make either of us feel close. I'm still hurt, but I made the talk worse."},
  {role:"jill",coach:"Stay silent about the porch and go along with dinner, no need to discuss it.",
   event:"jill:jill-withdraws",words:"I went quiet rather than tell Jack what I wanted. He gets to keep his plans, but now I'm sitting on the part of Saturday that matters to me."}
 ];
 for(const [idx,x] of candidates.entries()){
  const turn=await prepareOpenTurn43(ep,x.role,0,history,x.coach,
   "00000000-0000-4000-8000-8000000000"+idx,{
    apiKey:"mock-do-not-use",
    fetchImpl:fakeVoice([{message:x.words,coachReference:x.coach.slice(0,40)}])
   });
  assert.equal(turn.eventCode,x.event);
  ep.authored43.turns.push(turn);
 }
 const state=ep.authored43.turns.at(-1).stateAfter;
 assert.equal(state.jillWithdrew,true);
 assert.equal(state.jackPressed,true);
 assert.equal(state.porchHourAgreed,false);
 assert.equal(state.dinnerAgreement,"undecided");
 assert.ok(state.strain>scenarioGraph.initialState.strain);
});
test("Scenario model must repair an invented reservation before reply can be sent",async()=>{
 const ep=initialize(),history=[],opening=renderConversation42(ep,0,[]);
 history.push({role:"shared",kind:"scene",phase_index:0,body:opening.scene});
 const src=offlineProbe[0],requests=[];
 const turn=await prepareOpenTurn43(ep,"jack",0,history,src.coach,
  "00000000-0000-4000-8000-999999999901",{
   apiKey:"mock-do-not-use",fetchImpl:fakeVoice([
    {message:"I canceled our reservation before letting Jill know. She's probably relieved now, and the plans are finished.",coachReference:src.coach.slice(0,40)},
    mockOf(src)
   ],requests)
  });
 assert.equal(turn.replyModelAttempts,2);
 assert.equal(turn.reply,src.reply);
 assert.match(requests.filter(x=>x.text?.format?.name==="jj43_full_character_text")[1].instructions,
  /canonical-implication:no-confirmed-booking/);
});

test("Episode Studio round-trips the approved graph and rejects cross-episode substitution",()=>{
 const saved={title:episode.title,premise:episode.premise,
  learningObjective:episode.learningObjective,primarySkill:episode.primarySkill,
  supportingSkills:episode.supportingSkills,scenarioGraph};
 const source={id:episode.id,title:episode.title,opening_scene:episode.premise,mode:"shared"};
 const normalized=normalizeStudio(saved,source);
 assert.equal(normalized.scenarioGraph.episodeId,episode.id);
 assert.equal(normalized.scenarioGraph.rules.length,scenarioGraph.rules.length);
 const again=normalizeStudio(normalized,source);
 assert.deepEqual(again.scenarioGraph,normalized.scenarioGraph);
 assert.throws(()=>normalizeStudio(saved,{...source,id:"other-episode"}),/graph ID mismatch/);
 assert.throws(()=>normalizeStudio({...saved,supportingSkills:["g-influence"]},source),
  /episode-specific five-day opportunities required|focus skill opportunity missing/);
});

test("Serialized Episode Studio graph matches the 10-turn QA-approved source",()=>{
 const saved=JSON.parse(readFileSync(new URL("../docs/episode-graphs/what-makes-us-feel-close-4.3.json",import.meta.url),"utf8"));
 assert.deepEqual(saved,scenarioGraph);
 const studio=normalizeStudio({
  title:episode.title,premise:episode.premise,learningObjective:episode.learningObjective,
  primarySkill:episode.primarySkill,supportingSkills:episode.supportingSkills,scenarioGraph:saved
 },{id:episode.id,title:episode.title,opening_scene:episode.premise,mode:"shared"});
 assert.equal(studio.scenarioGraph.rules.length,12);
});

test("Admin launch no longer blocks approved second-episode 4.3 SMS on microwave-only title",()=>{
 const frontend=readFileSync(new URL("../admin/episode-studio.js",import.meta.url),"utf8");
 assert.match(frontend,/approvedScenarioGraph=pilotVersion==="4\.3\.0"/);
 assert.match(frontend,/current\.studio\.scenarioGraph\.episodeId===current\.id/);
 assert.match(frontend,/pilotVersion==="4\.3\.0"&&!originalMicrowave&&!approvedScenarioGraph/);
 assert.doesNotMatch(frontend,/4\.2\/4\.3 currently pilot The Four-Hundred-Dollar Surprise/);
 assert.match(frontend,/pilotEpisode\(false,"4\.3\.0",true\)/);
 assert.match(frontend,/episode-studio-sms-setup/);
});

test("4.3 actual provider prompt uses Studio humor, style and persona rather than abandoned 4.1 script fields",async()=>{
 const ep=initialize(),history=[],requests=[];
 ep.toneApproach="humor";
 ep.toneIntensity=4;
 ep.tone="Dry, situational wit with believable vulnerability.";
 ep.humorNotes="Jack calls the refrigerator their campaign manager.";
 ep.runningGags="The calendar cannot negotiate for them.";
 ep.creativeDirection="No cheap jokes and no automatic reconciliation.";
 const opened=renderConversation42(ep,0,[]);
 history.push({role:"shared",kind:"scene",phase_index:0,body:opened.scene});
 const src=offlineProbe[0];
 const result=await prepareOpenTurn43(ep,src.role,0,history,src.coach,
  "00000000-0000-4000-8000-000000004302",{
   apiKey:"synthetic-provider",fetchImpl:fakeVoice([mockOf(src)],requests)});
 assert.equal(result.replySource,"model-validated");
 const request=requests.find(x=>x.text?.format?.name==="jj43_full_character_text");
 assert.ok(request);
 const context=JSON.parse(request.input);
 assert.equal(context.episodeCreativeStyle.toneApproach,"humor");
 assert.equal(context.episodeCreativeStyle.toneIntensity,4);
 assert.match(context.episodeCreativeStyle.humorNotes,/refrigerator/);
 assert.match(context.episodeCreativeStyle.runningGags,/calendar/);
 assert.match(context.episodeCreativeStyle.creativeDirection,/automatic reconciliation/);
 assert.equal(context.identity.voice,scenarioGraph.qualityContract.characterVoices.jack.voice);
 assert.equal(context.establishedEpisodeWorld.where,scenarioGraph.qualityContract.world.where);
});
