import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CHECKPOINTS,initialAdventure,validateDecision,advanceAdventure,
 adventureFeed,directorPrompt} from "../api/dynamic-adventure.mjs";

const spouses=[
 {id:11,author:"a",body:"I think Jill should have a voice in the Saturday plans."},
 {id:12,author:"b",body:"Jack's surprise matters, even if they choose a different adventure."}
];
function candidate(previous,overrides={}){
 const old=previous.ledger.setting;
 return {
  consequence:"Jack listens carefully instead of insisting on the tickets, and Jill explains what the quiet morning means to her. They decide to talk before committing to the ropes course.",
  nextScene:{
   title:"A different possibility",
   story:"Jack puts the envelope down and asks Jill what she had imagined for Saturday. She talks about pancakes and a quiet morning. Jack explains why he'd bought the tickets. They both realize their hopes were loving but different. The morning is still theirs to decide.",
   prompt:"Which plan will Jack and Jill try before their Saturday begins?",
   options:["Share pancakes and discuss the tickets first.","Keep the ropes course but decide together how long to stay.","Offer the passes to friends and invent a new adventure."]
  },
  location:old.location,timeIndex:old.timeIndex+7,transition:"They continue talking at the kitchen table.",
  newFacts:["They agreed to discuss plans before committing."],
  unresolved:["What happens to the ropes course tickets?"],
  checkpoint:"two_perspectives",
  checkpointEvidence:"Both spouses named distinct legitimate hopes, and those hopes changed how Jack responded.",
  ...overrides
 };
}
test("eight checkpoint objectives contain no required locations or manuscript scenes",()=>{
 assert.equal(CHECKPOINTS.length,8);
 assert.equal(new Set(CHECKPOINTS.map(x=>x.id)).size,8);
 assert.ok(CHECKPOINTS.every(x=>x.goal.length>20));
 const init=initialAdventure();
 assert.equal(init.checkpoints.length,0);
 assert.equal(init.turn,1);
 assert.equal(init.ledger.setting.location,"Jack and Jill's kitchen");
});
test("a couple's choice persists: one calm path and one ropes-course path diverge",()=>{
 const a=initialAdventure();
 const quiet=advanceAdventure(a,candidate(a,{
  location:"Jack and Jill's kitchen",timeIndex:2050,
  transition:"They went to sleep and awoke on Saturday morning.",
  nextScene:{...candidate(a).nextScene,story:"On Saturday morning the kitchen smells of fresh pancakes. Jack has set the tickets aside. Jill pours coffee. They're glad to have a quiet start. A question about the unused passes remains, but neither has to rush into answering it just yet."}
 }),spouses);
 const active=advanceAdventure(a,candidate(a,{
  location:"Ropes course entrance",timeIndex:2045,
  transition:"After agreeing to try the outing, they drive to the ropes course Saturday morning.",
  nextScene:{...candidate(a).nextScene,story:"On Saturday morning Jack and Jill arrive together at the ropes course. They read the safety rules and laugh at the towering obstacles. Jill is still apprehensive, and Jack listens instead of pushing ahead. The guide calls them over to begin the first challenge."}
 }),spouses);
 assert.notEqual(quiet.scene.story,active.scene.story);
 assert.equal(quiet.ledger.setting.location,"Jack and Jill's kitchen");
 assert.equal(active.ledger.setting.location,"Ropes course entrance");
 assert.equal(a.turn,1);
 assert.equal(quiet.turn,2);
 assert.equal(quiet.checkpoints.length,1);
 assert.equal(quiet.checkpoints[0].id,"two_perspectives");
});
test("story validator rejects a kitchen rewind and unexplained teleports",()=>{
 const a=initialAdventure();
 assert.deepEqual(validateDecision(a.scene,a,candidate(a,{timeIndex:100}),spouses).problems,
  ["story time jumps backward or too far"]);
 assert.ok(validateDecision(a.scene,a,candidate(a,{
  location:"At the beach",transition:"Suddenly."
 }),spouses).problems.includes("location changes without a transition"));
 assert.equal(validateDecision(a.scene,a,candidate(a),[spouses[0]]).ok,false);
});
test("checkpoint cannot be awarded twice or without specific evidence",()=>{
 const a=initialAdventure(),first=advanceAdventure(a,candidate(a),spouses);
 assert.equal(validateDecision(first.scene,first,candidate(first),[
  {id:13,author:"a",body:"Yes"},{id:14,author:"b",body:"Agreed"}
 ]).ok,false);
 assert.equal(validateDecision(a.scene,a,candidate(a,{checkpointEvidence:"short"}),spouses).ok,false);
});
test("eight valid checkpoints yield a personalized ending without a forced next choice",()=>{
 let state=initialAdventure(),id=1;
 for(const cp of CHECKPOINTS){
  const messages=[
   {id:++id,author:"a",body:"I would find a creative way forward."},
   {id:++id,author:"b",body:"I think listening to each other matters."}
  ];
  state=advanceAdventure(state,candidate(state,{
   checkpoint:cp.id,
   checkpointEvidence:"Their choice showed "+cp.goal+" The fictional events changed as a result."
  }),messages);
 }
 assert.equal(state.checkpoints.length,8);
 assert.equal(state.finished,true);
 assert.equal(state.scene.options.length,0);
 const feed=adventureFeed(state,[],{a:"Alex",b:"Sam"});
 assert.equal(feed.at(-1).kind,"chapter");
 assert.ok(feed.some(x=>x.kind==="consequence"));
 assert.equal(feed.filter(x=>x.kind==="choices").length,8);
});
test("story feed keeps real replies between opening scene and consequence",()=>{
 const initial=initialAdventure();
 const after=advanceAdventure(initial,candidate(initial),spouses);
 const feed=adventureFeed(after,spouses,{a:"Alex",b:"Sam"});
 const i=feed.findIndex(x=>x.author==="a"),j=feed.findIndex(x=>x.kind==="consequence");
 assert.ok(i>=2 && j>i);
 assert.equal(feed[0].author,"sophia");
 assert.equal(feed[1].kind,"choices");
 assert.equal(feed.filter(x=>x.kind==="choices").length,2);
});
test("Dungeon Master receives only shared dialogue, ledger and confirmed profile",()=>{
 const state=initialAdventure();
 const p=directorPrompt(state,spouses,{a:"Alex",b:"Sam"},
  {yearsMarried:12,mutuallySelectedCelebrations:["Christmas"]});
 const text=JSON.stringify(p);
 assert.match(text,/different adventure/);
 assert.match(text,/Christmas/);
 assert.match(text,/Dungeon Master/);
 assert.match(text,/NOT predetermined story chapters/);
 for(const privateField of ["birth_date","phone_e164","email_opt_in_at","postal_code"])
  assert.equal(text.includes(privateField),false);
});
test("new Dynamic Adventure mode remains gated and existing classic/fluid paths intact",()=>{
 const core=readFileSync(new URL("../api/pilot-core.mjs",import.meta.url),"utf8");
 const admin=readFileSync(new URL("../api/admin.mjs",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../pilot/app.js",import.meta.url),"utf8");
 const page=readFileSync(new URL("../admin/index.html",import.meta.url),"utf8");
 const sql=readFileSync(new URL("../supabase/migrations/20261104163832_dynamic_adventure_ledger_beta.sql",import.meta.url),"utf8");
 assert.match(core,/createCustomerRoom\(origin,groupId,engine="fluid"\)/);
 assert.match(core,/engine==="dynamic"/);
 assert.match(core,/await maybeDynamicAdventure\(c\)/);
 assert.match(core,/version:"eq."\+record.version,processing:"eq.false"/);
 assert.match(core,/version:"eq."\+record.version,processing:"eq.true"/);
 assert.match(admin,/action==="pilot-create-dynamic-couple"/);
 assert.match(page,/id="customerStartDynamicPilot"/);
 assert.match(ui,/\["fluid","dynamic"\]\.includes\(state.conversationMode\)/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public.anthos_dynamic_adventures from public,anon,authenticated/);
 assert.match(sql,/grant select,insert,update,delete on public.anthos_dynamic_adventures to service_role/);
});
