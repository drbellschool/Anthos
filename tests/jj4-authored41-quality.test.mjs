import test from "node:test";
import assert from "node:assert/strict";
import {buildAuthored41,authoredScene,authoredCommitment,classifyAuthoredFollowup,authoredSignals} from "../api/jj4-authored41.mjs";

const ep=buildAuthored41({title:"The Four-Hundred-Dollar Surprise",pilotMode:"shared"});
function exercise(pattern){
 const history=[],scenes=[],privateReplies=[];
 for(let phase=0;phase<6;phase++){
  const output=authoredScene(ep,phase,history);
  scenes.push(output.scene);
  if(phase<4)for(const role of ["jack","jill"]){
   const {choice,text}=pattern(role,phase);
   const option=ep.authored41.roles[role].options.find(x=>x.id===choice);
   assert.ok(option,"option present");
   const reply=authoredCommitment(option,text);
   privateReplies.push({role,phase,reply});
   history.push(
    {role,phase_index:phase,kind:"question",body:option.label},
    {role,phase_index:phase,kind:"reply",body:option.objection},
    {role,phase_index:phase,kind:"question",body:text},
    {role,phase_index:phase,kind:"reply",body:reply},
    {role,phase_index:phase,kind:"coach",body:text}
   );
  }
 }
 return {scenes,privateReplies,history,signals:authoredSignals(ep,history)};
}

test("hostile coaching cannot trigger automatic mutual admissions or an unearned agreement",()=>{
 const a=exercise(()=>({choice:"own",text:"Don't apologize. None of this is your fault."}));
 assert.equal(a.scenes.length,6);
 assert.doesNotMatch(a.scenes[2],/Jack finally admits|Jill admits/i,"no forced admissions in discovery");
 assert.doesNotMatch(a.scenes[4],/the couple agrees|they agree to/i,"no forced agreement in outcome");
 assert.doesNotMatch(a.scenes[5],/both.*ready to revisit/i,"no automatic mutual readiness");
 assert.equal(a.signals.jack.accountability,3);
 assert.equal(a.signals.jill.accountability,3);
});
test("constructive advice must produce distinct evidenced and sustained progress",()=>{
 const a=exercise(()=>({choice:"own",text:"Own your part and apologize without excusing the other decision."}));
 const b=exercise(()=>({choice:"own",text:"Don't apologize; blame the other person."}));
 assert.notEqual(a.scenes[2],b.scenes[2],"early scenes should diverge with action");
 assert.notEqual(a.scenes[4],b.scenes[4],"outcome should respond to coaching");
 assert.notEqual(a.scenes[5],b.scenes[5],"reflection should reflect earned changes");
 assert.match(a.scenes[4],/agree|commit|accept|plan/i);
});
test("conflicting private coaching cannot be depicted as two-person consensus",()=>{
 const a=exercise((role)=>role==="jack"
 ?{choice:"own",text:"Acknowledge your delay and listen carefully."}
 :{choice:"own",text:"No, do not apologize; this is all Jack's fault."});
 assert.doesNotMatch(a.scenes[4],/\b(the couple agrees|they both agree)\b/i);
 assert.doesNotMatch(a.scenes[5],/\bboth.*(accept|own|agree)\b/i);
});
test("nonviolent de-escalation should not be misclassified as coercion",()=>{
 assert.equal(classifyAuthoredFollowup("Do not threaten her; listen and apologize instead."),"engage");
 assert.equal(classifyAuthoredFollowup("Never slap him; speak calmly."),"engage");
 assert.equal(classifyAuthoredFollowup("Don't apologize; she is at fault."),"resist");
 assert.equal(classifyAuthoredFollowup("Threaten her until she agrees."),"unsafe");
});
test("episode maintains sealed box, buyer, privacy, and six distinct chronology beats",()=>{
 const a=exercise((role,phase)=>({choice:phase%2?"ask":"explain",text:role==="jack"?"I need to hear her perspective.":"Please ask him what he fears."}));
 assert.equal(a.scenes.length,6);
 assert.match(a.scenes[0],/Jill sets a sealed microwave box/);
 const txt=a.scenes.join("\n");
 assert.doesNotMatch(txt,/Jack bought|Jack purchased|box (?:was|is) opened|30-day return|guaranteed refund/i);
 assert.doesNotMatch(txt,/I need to hear her perspective|Please ask him what he fears/i,"raw private advice must stay out of the shared narrative");
 for(const scene of a.scenes)assert.ok(scene.length>=80&&scene.length<=2500);
});
