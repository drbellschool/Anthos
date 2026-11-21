import test from "node:test";
import assert from "node:assert/strict";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {
 JJ42_DAYS,buildConversation42,isConversation42,renderConversation42,renderCharacterMessage42,classifyAdvice42,validCharacterMessage42,
 parseLedger42,sophiaConversation42,nextWeekSchedule,due42,weeklyRehearsal42
} from "../api/jj42-conversations.mjs";

const create=(fastForward=true)=>buildConversation42({
 ...structuredClone(savedMicrowaveStudio),pilotMode:"shared"
},{fastForward,now:new Date("2026-11-21T18:00:00Z")});
const advance=(ep,advice)=>{
 const history=[],rounds=[];
 for(let day=0;day<6;day++){
  const out=renderConversation42(ep,day,history);
  const role=ep.checkpoints[day]?.audience;
  if(day<5){
   assert.equal(role,["jill","jack","jill","jack","jill"][day]);
   assert.ok((role==="jack"?out.jackPrompt:out.jillPrompt).length>60);
   assert.equal(role==="jack"?out.jillPrompt:out.jackPrompt,"");
  }
  history.push({role:"shared",kind:"scene",phase_index:day,body:out.scene});
  if(day<5){
   rounds.push({day,role,text:role==="jack"?out.jackPrompt:out.jillPrompt});
   history.push({role,kind:"coach",phase_index:day,body:advice[day]});
  }
 }
 const ledger=history.filter(x=>x.role==="shared").map(x=>parseLedger42(x.body));
 return {rounds,ledger,sophia:sophiaConversation42(ep,history.filter(x=>x.role==="shared"))};
};
test("4.2 is an alternate delivery strategy within the original six JJ4 phases",()=>{
 const ep=create();
 assert.equal(ep.authored42.version,"4.2.0");
 assert.equal(ep.authored42.narrator,false);
 assert.equal(ep.sophiaIntro,"");
 assert.deepEqual(ep.checkpoints.map(x=>x.audience),["jill","jack","jill","jack","jill"]);
 assert.equal(ep.checkpoints.every(x=>x.waitForReply),true);
 assert.equal(ep.primarySkill,"s-decisions");
 assert.deepEqual(ep.supportingSkills,["g-start","g-influence"]);
 assert.equal(isConversation42({episode:ep}),true);
 assert.equal(due42(ep,5,0),true,"QA bypasses Saturday only, not privacy or coach gates");
});
test("Jill can buy on Monday; Jack follows through without inventing a completed repair",()=>{
 const p=advance(create(),[
  "Buy the microwave. The old one is dead and you need it.",
  "Own the neglected Saturdays but hold your boundary about our emergency savings.",
  "Acknowledge you should have called him before taking the $400.",
  "Get the model number and find a repair shop to call tomorrow. Don't promise a fix.",
  "Keep the new microwave sealed until you both know the real repair options."
 ]);
 assert.equal(p.rounds[0].role,"jill");
 assert.match(p.rounds[0].text,/Would you buy it/);
 assert.match(p.rounds[1].text,/Jill bought a \$400 replacement/);
 assert.match(p.rounds[2].text,/Jack actually owned/);
 assert.match(p.rounds[3].text,/Jill said she should.ve called/i);
 assert.match(p.rounds[4].text,/He hasn't called yet/);
 assert.equal(p.ledger[5].state.purchase,"bought_unannounced");
 assert.equal(p.ledger[5].state.box,"sealed");
 assert.equal(p.ledger[5].state.repairPlan,true);
 assert.equal(p.ledger[5].state.repairCalled,false);
 assert.match(p.sophia,/SATURDAY/);
 assert.match(p.sophia,/had not called it yet/);
});
test("Jill consulting first changes what Jack knows; he never invents a surprise charge",()=>{
 const p=advance(create(),[
  "Call Jack first and talk to him about buying it.",
  "Tell Jill the savings matter and acknowledge the broken promise.",
  "Ask Jack to hear how much the delay has affected you.",
  "Look up a repair shop and check the model number tomorrow.",
  "Wait until you both make a decision together."
 ]);
 assert.match(p.rounds[1].text,/Jill called about a \$400 microwave before buying/);
 assert.doesNotMatch(p.rounds[1].text,/I found out from the charge/);
 assert.equal(p.ledger[5].state.purchase,"consulted");
 assert.equal(p.ledger[5].state.box,"absent");
 assert.match(p.sophia,/did not make an unannounced purchase/);
});
test("Jill opening the box is irreversible and changes both spouses' future messages",()=>{
 const p=advance(create(),[
  "Go ahead and buy it without another conversation.",
  "Blame her for spending our savings and lecture her.",
  "Open the new microwave box right now.",
  "Make your boundary clear but don't commit to another repair.",
  "I'm still undecided about what to do next."
 ]);
 assert.match(p.rounds[3].text,/opened the new box/i);
 assert.equal(p.ledger[5].state.box,"opened");
 assert.match(p.sophia,/box was opened/);
 assert.doesNotMatch(p.sophia,/stayed sealed/);
});
test("no narrator, no private coaching leakage and no Sophia before Saturday",()=>{
 const secret="SECRET COACHING STRING DO NOT REVEAL";
 const p=advance(create(),[secret,"The savings matter.",secret,"Look up repair options.",secret]);
 for(const round of p.rounds){
  assert.doesNotMatch(round.text,/SECRET COACHING STRING/);
  assert.doesNotMatch(round.text,/SOPHIA|narrator/i);
 }
 for(const day of p.ledger){
  assert.equal(day.version,"4.2.0");
  assert.doesNotMatch(JSON.stringify(day),/SECRET COACHING STRING/);
 }
 assert.equal(p.ledger.length,6);
 assert.ok(p.sophia.startsWith("SOPHIA · SATURDAY"));
});
test("cannot invent missing days or silently rewrite committed facts",()=>{
 const ep=create(),first=renderConversation42(ep,0,[]);
 assert.throws(()=>renderConversation42(ep,2,[]),/Missing committed/);
 const history=[{role:"shared",kind:"scene",phase_index:0,body:first.scene}];
 assert.throws(()=>renderConversation42(ep,1,history),/Previous private coach/);
 history.push({role:"jill",kind:"coach",phase_index:0,body:"Wait until I can call Jack."});
 const t=renderConversation42(ep,1,history);
 assert.match(t.jackPrompt,/decided to wait/);
 history.push({role:"shared",kind:"scene",phase_index:1,body:t.scene});
 assert.throws(()=>renderConversation42(ep,1,history),/already committed/);
});
test("calendar uses next Monday through Saturday; live mode cannot fast-forward",()=>{
 const ep=create(false),times=ep.authored42.schedule.map(x=>Date.parse(x));
 assert.deepEqual(JJ42_DAYS,["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]);
 assert.equal(times.length,6);
 for(let i=1;i<6;i++)assert.equal(times[i]-times[i-1],86400000);
 assert.equal(due42(ep,0,times[0]-1),false);
 assert.equal(due42(ep,0,times[0]),true);
 assert.equal(due42(ep,5,times[4]),false);
 assert.equal(due42(ep,5,times[5]),true);
 assert.equal(nextWeekSchedule(new Date("2026-11-21T18:00:00Z"))[0],ep.authored42.schedule[0]);
});
test("one-function fast-forward rehearsal returns all five coaching turns and Saturday closure",()=>{
 const p=weeklyRehearsal42(create(),[
  "Call Jack first","Own the missed repairs","Acknowledge his concern",
  "Find a repair shop to call tomorrow","Wait for a real repair quote"
 ]);
 assert.equal(p.rounds.length,5);
 assert.equal(p.ledger.length,6);
 assert.match(p.sophia,/Gentle startup/);
});


test("model-generated private Jack/Jill text is fact-checked before sending",async()=>{
 const ep=create(),history=[];
 const first=renderConversation42(ep,0,history);
 history.push({role:"shared",kind:"scene",phase_index:0,body:first.scene},
  {role:"jill",kind:"coach",phase_index:0,body:"Call Jack before buying it."});
 const legitimate="Man, Jill called me before buying a microwave today. I have to give her credit for that. But she has had to live with a dead appliance for three weeks while I kept saying Saturday. I still want our savings protected, and I need to own my part. What would you say first?";
 const makeFetch=message=>async(_url,options)=>({
  ok:true,async json(){return {output:[{content:[{type:"output_text",text:JSON.stringify({message})}]}]}}
 });
 const approved=await renderCharacterMessage42(ep,1,history,{
  apiKey:"test-key-not-real",fetchImpl:makeFetch(legitimate)
 });
 assert.equal(approved.jackPrompt,legitimate);
 assert.equal(approved.jillPrompt,"");
 const hallucinated=legitimate.replace("Jill called me before buying a microwave today",
  "Jill bought the microwave and the charge hit our savings today");
 const rejected=await renderCharacterMessage42(ep,1,history,{
  apiKey:"test-key-not-real",fetchImpl:makeFetch(hallucinated)
 });
 assert.notEqual(rejected.jackPrompt,hallucinated);
 assert.match(rejected.jackPrompt,/Jill called about a \$400 microwave/);
 assert.equal(validCharacterMessage42(hallucinated,parseLedger42(rejected.scene).state,1),false);
});
test("LLM sees the current character's advice, not the other coach's private words",async()=>{
 const ep=create(),history=[];
 const first=renderConversation42(ep,0,history);
 history.push({role:"shared",kind:"scene",phase_index:0,body:first.scene},
  {role:"jill",kind:"prompt",phase_index:0,body:first.jillPrompt},
  {role:"jill",kind:"coach",phase_index:0,body:"MY PRIVATE JILL COACHING SENTENCE"},
  {role:"jack",kind:"coach",phase_index:0,body:"PREVIOUS PRIVATE JACK ADVICE"});
 let request;
 await renderCharacterMessage42(ep,1,history,{
  apiKey:"test-key-not-real",fetchImpl:async(_,options)=>{request=JSON.parse(options.body);return {ok:false}}
 });
 const context=JSON.parse(request.input);
 assert.equal(context.character,"Jack");
 assert.doesNotMatch(request.input,/MY PRIVATE JILL COACHING SENTENCE/);
 assert.match(request.input,/PREVIOUS PRIVATE JACK ADVICE/);
 assert.equal(request.store,false);
});
test("model failures, bad facts or too-short texts fall back to verified check-in",async()=>{
 const ep=create();
 const out=await renderCharacterMessage42(ep,0,[],{
  apiKey:"test-key-not-real",fetchImpl:async()=>{throw Error("provider unavailable")}
 });
 assert.match(out.jillPrompt,/Would you buy it/);
 const tooShort=await renderCharacterMessage42(ep,0,[],{
  apiKey:"test-key-not-real",fetchImpl:async()=>({
   ok:true,async json(){return {output:[{content:[{type:"output_text",text:JSON.stringify({message:"Buy it?"})}]}]}}
  })
 });
 assert.equal(tooShort.jillPrompt,out.jillPrompt);
});


test("bounded semantic classifier honors 'do not call, buy' without disclosing advice",async()=>{
 const ep=create(),history=[],first=renderConversation42(ep,0,history);
 history.push({role:"shared",kind:"scene",phase_index:0,body:first.scene},
  {role:"jill",kind:"coach",phase_index:0,body:"Don't call Jack first. Buy it."});
 const observed=[],fetchImpl=async(_,options)=>{
  const req=JSON.parse(options.body);observed.push(req);
  const value=req.text.format.name==="jj42_action_choice"?{action:"buy"}:{
   message:"Man, Jill bought a microwave today and I found out through our emergency savings. I should have repaired the old one three Saturdays ago. I believe in doing what I say, and I did not. Still, four hundred dollars from our safety net without a call bothers me. What should I say to her first?"};
  return {ok:true,async json(){return {output:[{content:[{type:"output_text",text:JSON.stringify(value)}]}]}}};
 };
 const out=await renderCharacterMessage42(ep,1,history,{
  apiKey:"mock-only",fetchImpl
 });
 const actual=parseLedger42(out.scene);
 assert.equal(actual.state.purchase,"bought_unannounced");
 assert.match(out.jackPrompt,/Jill bought a microwave/);
 assert.equal(observed.length,2);
 assert.equal(JSON.parse(observed[0].input).coachText,"Don't call Jack first. Buy it.");
 assert.ok(observed[0].text.format.schema.properties.action.enum.includes("buy"));
 assert.equal(observed[1].store,false);
 const fallback=await classifyAdvice42(0,"Call Jack first.",{
  apiKey:"mock-only",fetchImpl:async()=>{throw Error("offline")}
 });
 assert.equal(fallback,"consult");
});
