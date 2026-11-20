import test from "node:test";
import assert from "node:assert/strict";
import {
 buildAuthored41,authoredOptions,selectedAuthoredChoice,
 authoredObjection,authoredCommitment,authoredScene,authoredSignals
} from "../api/jj4-authored41.mjs";

const ep=()=>buildAuthored41({title:"The Four-Hundred-Dollar Surprise",pilotMode:"shared"});
const event=(role,phase,kind,body)=>({role,phase_index:phase,kind,body});

test("each of eight check-ins has a distinct dilemma and different authored objections",()=>{
 const e=ep(),prompts=new Set(),reactions=new Set(),labels=new Set();
 for(const role of ["jack","jill"])for(let phase=0;phase<4;phase++){
  const prompt=e.authored41.coachingCheckpoints[role][phase].prompt;
  assert.ok(prompt.length>=85);
  assert.ok(!prompts.has(prompt));prompts.add(prompt);
  const choices=authoredOptions(e,role,phase);
  assert.equal(choices.length,3);
  for(const choice of choices){
   const obstruction=authoredObjection(e,role,phase,choice.id);
   assert.ok(obstruction.length>=65);
   assert.ok(!reactions.has(obstruction),"Repeated objection for "+role+" scene "+phase+": "+choice.id);
   reactions.add(obstruction);
   assert.ok(!labels.has(role+":"+choice.label),"Repeated selection label across phase");
   labels.add(role+":"+choice.label);
  }
 }
 assert.equal(prompts.size,8);
 assert.equal(reactions.size,24);
});

test("free-text follow-up overrides the original multiple-choice direction when specific",()=>{
 const e=ep(),history=[];
 const first=authoredOptions(e,"jack",0).find(x=>x.id==="explain");
 history.push(event("jack",0,"question",first.label));
 const choice=selectedAuthoredChoice(e,"jack",0,history);
 const line="Actually, first apologize for missing the repair. Explain the savings concern after she feels heard.";
 const reaction=authoredCommitment(choice,line,{episode:e,role:"jack",phase:0});
 assert.match(reaction,/apolog|admit|own|Saturday|promis|delay|sorry/i);
 history.push(event("jack",0,"coach",line));
 const other=authoredOptions(e,"jill",0).find(x=>x.id==="own");
 history.push(event("jill",0,"question",other.label));
 history.push(event("jill",0,"coach","Acknowledge the purchase and listen."));
 const scene=authoredScene(e,1,history).scene;
 assert.match(scene,/Jack admits he promised|Jack admits he/i);
 assert.doesNotMatch(scene,/Jack says that dipping into the emergency savings frightened him/i);
 assert.ok(authoredSignals(e,history).jack.accountability>=5);
});

test("follow-up targeting questions can redirect from apologizing to asking",()=>{
 const e=ep(),history=[];
 const first=authoredOptions(e,"jill",0).find(x=>x.id==="own");
 history.push(event("jill",0,"question",first.label));
 history.push(event("jill",0,"coach","Instead, ask what he fears about emergency savings. Listen before you respond."));
 const second=authoredOptions(e,"jack",0).find(x=>x.id==="own");
 history.push(event("jack",0,"question",second.label));
 history.push(event("jack",0,"coach","Apologize for the delay, no excuses."));
 const scene=authoredScene(e,1,history).scene;
 assert.match(scene,/Jill asks why the emergency savings matter/i);
 assert.doesNotMatch(scene,/Jill acknowledges she made the purchase without asking/i);
});

test("same coaching words create distinct in-character responses at four separate checkpoints",()=>{
 const e=ep(),replies=new Set();
 for(let phase=0;phase<4;phase++){
  const choice=authoredOptions(e,"jack",phase).find(x=>x.id==="own");
  const selected=selectedAuthoredChoice(e,"jack",phase,[event("jack",phase,"question",choice.label)]);
  const response=authoredCommitment(selected,"Own your part and talk with her honestly.",{episode:e,role:"jack",phase});
  assert.ok(!replies.has(response));
  replies.add(response);
 }
 assert.equal(replies.size,4);
});

test("resistance and unclear text do not fabricate compliance despite an initial positive selection",()=>{
 const e=ep();
 const make=(message)=>{
  const history=[];
  for(const role of ["jack","jill"]){
   const opt=authoredOptions(e,role,0).find(x=>x.id==="own");
   history.push(event(role,0,"question",opt.label),event(role,0,"coach",message));
  }
  return authoredScene(e,1,history).scene;
 };
 assert.doesNotMatch(make("Don't apologize; it's their fault."),/Jack admits he promised|Jill acknowledges she made the purchase/);
 assert.doesNotMatch(make("Purple platypuses invented microwave court."),/Jack admits he promised|Jill acknowledges she made the purchase/);
});
