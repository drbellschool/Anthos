import test from "node:test";
import assert from "node:assert/strict";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {
 JJ42_DAYS,JJ42_WEEK_FRAMING,buildConversation42,isConversation42,renderConversation42,renderCharacterMessage42,classifyAdvice42,validCharacterMessage42,sophiaOrientation42,reactionConversation42,JJ42_RESEARCH_SOURCES,
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
 assert.match(p.sophia,/no actual call or completed repair was recorded/i);
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
 assert.match(p.sophia,/consulted Jack before buying/i);
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
 assert.match(p.sophia,/gentle startup/i);
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


test("natural negated aside does not reverse Jill's explicit buy advice",()=>{
 const ep=create(),first=renderConversation42(ep,0,[]);
 const history=[
  {role:"shared",kind:"scene",phase_index:0,body:first.scene},
  {role:"jill",kind:"coach",phase_index:0,
   body:"Buy it today. Jack has had three Saturdays, and you've had enough. But don't pretend that spending from savings without calling is harmless."}
 ];
 const tuesday=renderConversation42(ep,1,history);
 assert.equal(parseLedger42(tuesday.scene).state.purchase,"bought_unannounced");
 assert.match(tuesday.jackPrompt,/Jill bought a \$400 replacement/);
 const alternatives=[
  ["Do not buy it without talking to him first.","wait"],
  ["Call Jack first. Discuss the price before buying.","consult"],
  ["Don't call Jack. Buy it today.","buy"],
  ["Buy it now and don't blame him for your choice.","buy"]
 ];
 for(const [advice,expected] of alternatives){
  history[1].body=advice;
  const result=renderConversation42(ep,1,history);
  const purchase=parseLedger42(result.scene).state.purchase;
  assert.equal(purchase,expected==="buy"?"bought_unannounced":
   expected==="consult"?"consulted":"waiting",advice);
 }
});


test("Sophia introduces the precise saved three skills without pre-deciding the ending",()=>{
 const ep=create(),opening=sophiaOrientation42(ep);
 assert.match(opening,/SOPHIA · BEFORE MONDAY/);
 assert.match(opening,/FACE HARD DECISIONS \(Schnarch\)/);
 assert.match(opening,/GENTLE STARTUP \(Gottman\)/);
 assert.match(opening,/ACCEPT INFLUENCE \(Gottman\)/);
 assert.match(opening,/Jack.*husband/);
 assert.match(opening,/Jill.*wife/);
 assert.match(opening,/no right-answer buttons/i);
 assert.doesNotMatch(opening,/Jill bought|Jack called|agreed to return|they resolved/i);
 assert.deepEqual(JJ42_RESEARCH_SOURCES.map(x=>x.label).some(x=>/Aron/.test(x)),false);
 assert.equal(JJ42_RESEARCH_SOURCES.length,3);
});
test("Saturday skill review explicitly discusses useful and poor actions, never awards unwarranted credit",()=>{
 const ep=create();
 const positive=advance(ep,[
  "Buy it now, but own your decision.",
  "Own those three missed Saturdays, and hold the financial boundary.",
  "Own buying it without calling him first.",
  "Find the model number and get a repair shop to call tomorrow.",
  "Wait and leave the new microwave sealed."
 ]);
 const report=positive.sophia;
 assert.match(report,/SOPHIA · SATURDAY/);
 assert.match(report,/1\. FACE HARD DECISIONS/);
 assert.match(report,/2\. GENTLE STARTUP/);
 assert.match(report,/3\. ACCEPT INFLUENCE/);
 assert.match(report,/What helped: Jack acknowledged three missed repair promises/);
 assert.match(report,/Jill acknowledged her unannounced withdrawal/);
 assert.match(report,/What stayed difficult: Jill spent \$400/);
 assert.match(report,/What may have helped:/);
 assert.match(report,/can't certify a gentle startup|exact words or tone|words weren't recorded/i);
 assert.match(report,/no actual call or completed repair was recorded/i);
 assert.match(report,/not proof of lasting behavior change/i);
 assert.doesNotMatch(report,/Jack fixed|repair was completed|perfectly used the skills|they both agreed/i);
});
test("hostile coaching is named as a missed opportunity rather than a successful gentle startup",()=>{
 const ep=create();
 const p=advance(ep,[
  "Buy the microwave without calling first.",
  "Blame Jill, lecture her and make this entirely about her spending.",
  "Open the new microwave box.",
  "Demand that Jill admit you're right. Don't follow through.",
  "Just open it and use it now."
 ]);
 assert.equal(p.ledger[5].state.box,"opened");
 assert.equal(p.ledger[5].state.jackOwnsDelay,false);
 assert.equal(p.ledger[5].state.repairPlan,false);
 assert.match(p.sophia,/Jack never recorded an explicit acknowledgment/);
 assert.match(p.sophia,/Jack responded defensively/);
 assert.match(p.sophia,/new box was opened/);
 assert.match(p.sophia,/No repair call or completed repair was recorded/);
 assert.doesNotMatch(p.sophia,/Jill kept the box sealed|Jack acknowledged three missed repair promises/);
});
test("consultation on Monday is not falsely graded as an unannounced purchase",()=>{
 const ep=create();
 const p=advance(ep,[
  "Call Jack first and talk about the microwave.",
  "Tell Jill the savings matter and own the missed repair.",
  "Listen to Jack's concern.",
  "Find the model number and repair shop to call tomorrow.",
  "Wait to decide together."
 ]);
 assert.equal(p.ledger[5].state.purchase,"consulted");
 assert.match(p.sophia,/Jill consulted Jack before buying; no purchase was recorded/);
 assert.match(p.sophia,/Jill initiated consultation before a purchase/);
 assert.doesNotMatch(p.sophia,/Jill spent \$400 of emergency savings/);
 assert.doesNotMatch(p.sophia,/The purchased box remained sealed/);
});
test("characters respond promptly to coaching as people, without inventing completed actions",()=>{
 const ep=create(),notes=[
  "Go ahead and buy it.",
  "Own the three Saturdays while protecting savings.",
  "Tell him you should have called before taking the money.",
  "Find a shop to call tomorrow, and check the model number.",
  "Wait and leave the new box sealed."
 ];
 const run=weeklyRehearsal42(ep,notes);
 assert.match(run.orientation,/FACE HARD DECISIONS/);
 assert.equal(run.rounds.length,5);
 for(let i=0;i<5;i++){
  const text=run.rounds[i].reaction;
  assert.ok(text.length>45);
  assert.doesNotMatch(text,/SOPHIA|Gottman|Schnarch/);
  assert.doesNotMatch(text,/I (?:bought|called|repaired|installed) the (?:new |old )?microwave/);
  assert.doesNotMatch(text,/we agreed to return/i);
  assert.equal(text,reactionConversation42(ep,i,notes[i]));
 }
 assert.match(run.rounds[0].reaction,/telling me to go ahead/);
 assert.match(run.rounds[3].reaction,/model number/i);
 assert.match(run.sophia,/WHAT THE SKILLS SHOWED/);
});


test("Sophia's evidence report fits the existing 2,500-character Supabase closure constraint across divergent decisions",()=>{
 const ep=create(),cases=[
  ["buy","Own the missed promises","Own the purchase","Find the model number and shop to call","Wait and leave the box sealed"],
  ["buy","Blame her and lecture","Open the microwave box now","Demand she admit you're right","Open it now"],
  ["Wait","The savings matter","I have no advice","I have no advice","I am undecided"],
  ["Consult Jack before buying","Own the repair delay","Hear his concern","Check the model number and shop tomorrow","Wait and review together"]
 ];
 for(const advice of cases){
  const p=weeklyRehearsal42(ep,advice);
  assert.ok(p.sophia.length<=2500,"DB closure is limited to 2,500 characters, got "+p.sophia.length);
  assert.ok(p.sophia.length>800,"Closing should actually explain each of the three skills");
  assert.ok(p.orientation.length<=2500);
 }
});


test("4.2 AI is never given 4.1's predetermined Thursday purchase as Monday fact",async()=>{
 const ep=create();
 assert.match(ep.authored42.sourcePremise,/Thursday at 7:15/);
 assert.match(ep.authored42.weekFraming,/starts on Monday/);
 assert.match(ep.authored42.weekFraming,/has not yet decided/);
 assert.equal(ep.authored42.weekFraming,JJ42_WEEK_FRAMING);
 // A previously-created 4.2 room without weekFraming must also be safe.
 delete ep.authored42.weekFraming;
 let submitted;
 await renderCharacterMessage42(ep,0,[],{
  apiKey:"fake-test-only",
  fetchImpl:async(_,options)=>{submitted=JSON.parse(options.body);return {ok:false}}
 });
 const ctx=JSON.parse(submitted.input);
 assert.match(ctx.problemStatement,/The story starts on Monday/);
 assert.match(ctx.problemStatement,/Jill has not yet decided/);
 assert.doesNotMatch(ctx.problemStatement,/Thursday at 7:15/);
 assert.doesNotMatch(ctx.problemStatement,/walks into their kitchen carrying a boxed/);
 assert.doesNotMatch(ctx.problemStatement,/one uninterrupted evening/);
 assert.equal(ctx.canonicalFacts.purchase,"not_bought");
 assert.equal(ctx.canonicalFacts.box,"absent");
});
