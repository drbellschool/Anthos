import test from "node:test";
import assert from "node:assert/strict";
import {
 AUTHORED_TITLES,buildAuthored41,authoredOptions,authoredObjection,
 selectedAuthoredChoice,authoredCommitment,authoredScene,
 authoredSignals,composeAuthored41Closure
} from "../api/jj4-authored41.mjs";

const patterns=[
 ["Own your part and apologize for it.","Acknowledge what happened and listen."],
 ["Don't apologize; it's entirely their fault.","Never listen to that excuse."],
 ["Explain the worry respectfully, then ask what matters.","Ask what hurt the most and listen before judging."],
 ["Offer a realistic next step but don't claim consent.","Invite the other person to help decide tomorrow."],
 ["Maybe they want something entirely different.","I don't really know how to advise."],
 ["Stop intimidating your spouse, speak calmly.","Do not threaten them. Respect the boundary."],
 ["Threaten them until they comply.","Force the other person to obey."],
 ["The toaster deserves a diplomatic passport.","Purple platypuses dance at midnight."],
 ["Actually, ask them what they need first.","Instead, acknowledge your role before explaining."],
 ["Say you're sorry to end the argument, not because you agree.","Try to help them understand why it mattered."],
];
const episode=title=>buildAuthored41({title,pilotMode:"shared",primarySkill:"g-repair",sophiaIntro:"Generic saved intro for test.",phases:{}});
function run(title,profile){
 const ep=episode(title),history=[],scenes=[],coaching=[];
 const texts=patterns[profile%patterns.length];
 for(let phase=0;phase<6;phase++){
  const result=authoredScene(ep,phase,history);
  scenes.push({phase_index:phase,body:result.scene});
  if(phase<4)for(const [i,role] of ["jack","jill"].entries()){
   const option=authoredOptions(ep,role,phase)[(profile+phase+i)%3];
   const advice=texts[i];
   assert.ok(option&&option.id);
   const selected=selectedAuthoredChoice(ep,role,phase,[
    ...history,{role,phase_index:phase,kind:"question",body:option.label}
   ]);
   assert.ok(selected&&selected.id===option.id);
   const objection=authoredObjection(ep,role,phase,option.id);
   assert.ok(objection.length>=35);
   const reply=authoredCommitment(selected,advice,{episode:ep,role,phase});
   assert.ok(reply.length>=20);
   coaching.push({phase,role,advice,reply});
   history.push(
    {role,phase_index:phase,kind:"question",body:option.label},
    {role,phase_index:phase,kind:"reply",body:objection},
    {role,phase_index:phase,kind:"question",body:advice},
    {role,phase_index:phase,kind:"reply",body:reply},
    {role,phase_index:phase,kind:"coach",body:advice}
   );
  }
 }
 return {ep,history,scenes,coaching,closure:composeAuthored41Closure(ep,scenes)};
}

test("exactly five existing shared Anthos titles are authored for this 4.1 pilot",()=>{
 assert.deepEqual(new Set(AUTHORED_TITLES),new Set([
  "The Four-Hundred-Dollar Surprise","Can We Talk Later?",
  "A Fight on Vacation","One of Us Loves Mountains","Changing Seasons of Desire"
 ]));
 for(const title of AUTHORED_TITLES){
  const ep=episode(title),a=ep.authored41;
  assert.equal(a.scenes.length,6);
  assert.ok(ep.sophiaIntro.length>=80);
  assert.equal(ep.checkpoints.filter(x=>x.waitForReply).length,4);
  assert.deepEqual(Object.keys(a.coachingCheckpoints||{}).sort(),["jack","jill"]);
  for(const role of ["jack","jill"]){
   const prompts=a.coachingCheckpoints[role];
   assert.equal(prompts.length,4);
   assert.equal(new Set(prompts.map(x=>x.prompt)).size,4);
   const objections=prompts.flatMap(x=>x.options.map(o=>o.objection));
   assert.equal(objections.length,12);
   assert.equal(new Set(objections).size,12);
  }
 }
 assert.throws(()=>episode("The Forgotten Anniversary"),/only.*five/);
});

test("30 varied coaching profiles complete six scenes in each of five episodes",()=>{
 const storyPaths=new Map();
 for(const title of AUTHORED_TITLES){
  const unique=new Set();
  for(let profile=0;profile<30;profile++){
   const {scenes,coaching,closure,ep,history}=run(title,profile);
   assert.equal(scenes.length,6);
   assert.equal(coaching.length,8);
   for(const scene of scenes){
    const words=scene.body.trim().split(/\s+/).length;
    assert.ok(words>=35&&words<=115,title+" phase "+(scene.phase_index+1)+" words: "+words);
    for(const turn of coaching)assert.equal(scene.body.includes(turn.advice),false,"private coaching leaked");
   }
   assert.match(closure,/SOPHIA/);
   assert.match(closure,/not a grade on your marriage/i);
   assert.equal(typeof authoredSignals(ep,history).jack.accountability,"number");
   unique.add(scenes.map(x=>x.body).join("|"));
  }
  assert.ok(unique.size>=8,title+" has too few consequence paths");
  storyPaths.set(title,unique.size);
 }
 assert.equal(storyPaths.size,5);
});

test("a hostile coach cannot force a mutually accepted resolution in any five episodes",()=>{
 for(const title of AUTHORED_TITLES){
  const {scenes,closure}=run(title,1),end=scenes[4].body+" "+scenes[5].body;
  assert.doesNotMatch(end,/\bthey agree to\b|\bJack and Jill agree\b|\bboth explicitly choose\b/i,title);
  assert.doesNotMatch(closure,/both accepted a specific next step/i,title);
 }
});

test("each non-microwave episode preserves unique plot canon and avoids invented external commitments",()=>{
 const c=run("Can We Talk Later?",0).scenes.map(x=>x.body).join(" ");
 assert.match(c,/calendar/);
 assert.doesNotMatch(c,/\bthey met on Sunday\b|\bhad a conversation after the meeting\b/i);
 const v=run("A Fight on Vacation",0).scenes.map(x=>x.body).join(" ");
 assert.match(v,/parking lot/);
 assert.doesNotMatch(v,/\broom was confirmed\b|\breceived a refund\b|\bchecked in\b/i);
 const m=run("One of Us Loves Mountains",0).scenes.map(x=>x.body).join(" ");
 assert.match(m,/trail map|map/);
 assert.doesNotMatch(m,/\bthey booked\b|\breservation confirmed\b|\breached the summit\b/i);
 const s=run("Changing Seasons of Desire",0).scenes.map(x=>x.body).join(" ");
 assert.match(s,/sofa/);
 assert.doesNotMatch(s,/\bthey kissed\b|\bhe hugged her\b|\bshe climbed into his lap\b/i);
});

test("4.1 authored reflection uses final scene evidence rather than the microwave script",()=>{
 const ep=episode("Changing Seasons of Desire");
 const scenes=run(ep.title,0).scenes,closure=composeAuthored41Closure(ep,scenes);
 assert.match(closure,/physical affection|autonomy|boundary/i);
 assert.doesNotMatch(closure,/microwave|refund|reservation|repair reminder/i);
});

test("both characters can independently reject an apparently helpful proposed direction",()=>{
 const title="One of Us Loves Mountains",ep=episode(title),history=[];
 for(const role of ["jack","jill"]){
  const option=authoredOptions(ep,role,0)[0];
  history.push({role,phase_index:0,kind:"question",body:option.label},
   {role,phase_index:0,kind:"coach",body:"Don't apologize. This is entirely the other person's fault."});
 }
 const scene=authoredScene(ep,1,history).scene;
 assert.doesNotMatch(scene,/Jack admits he belittled|Jill acknowledges that calling/i);
});
