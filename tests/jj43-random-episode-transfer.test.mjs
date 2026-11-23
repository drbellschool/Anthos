import test from "node:test";
import assert from "node:assert/strict";
import {buildConversation43} from "../api/jj42-conversations.mjs";
import {assertStoryQualityContract,reviewStoryReply} from "../lib/anthos-story-quality.mjs";
import {episode,qualityContract,offlineProbe} from "./fixtures/jj43-what-makes-us-feel-close.mjs";

test("RANDOM EPISODE TRANSFER: current 4.3 builder fails closed rather than secretly replaying microwave",()=>{
 assert.equal(episode.title,"What Makes Us Feel Close");
 assert.equal(episode.primarySkill,"g-world");
 assert.deepEqual(episode.supportingSkills,["a-curiosity","s-diff"]);
 assert.throws(()=>buildConversation43({
  ...episode,pilotMode:"shared",supportingSkills:[...episode.supportingSkills]
 },{fastForward:true,openConversation:true}),/4\.2 currently pilots the saved shared microwave episode only/);
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
   const result=reviewStoryReply(row.reply,{role:row.role,contract:qualityContract,priorReplies:prior[row.role]});
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
