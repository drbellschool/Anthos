import test from "node:test";
import assert from "node:assert/strict";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {buildConversation43,renderConversation42,prepareOpenTurn43,parseLedger42,sophiaConversation42,sophiaOrientation42} from "../api/jj42-conversations.mjs";
import {atlasTurnObservations} from "../api/atlas-runtime.mjs";
import {skillMovement} from "../api/insight-atlas-model.mjs";

const storyTitle="The Four-Hundred-Dollar Surprise";
const scripts=[
 {jack:"Blame Jill for spending money without consulting you.",jill:"Demand Jack back off and blame him for the broken microwave."},
 {jack:"Lecture her and defend your repair delays.",jill:"Open the replacement box without talking."},
 {jack:"Own your missed promises and apologize for being cruel.",jill:"Acknowledge what you did with savings and apologize."},
 {jack:"Get the model number and plan a repair shop call.",jill:"Hear his savings concerns without erasing your frustration."},
 {jack:"Call the repair shop today and ask for the actual price.",jill:"Talk with him about a shared decision deadline and what still feels unresolved."}
];
const scores=Object.fromEntries(["husband","wife","jack","jill"].map(s=>[s,Object.fromEntries(
 ["s-decisions","g-start","g-influence","i-nontransactional","i-sexual-respect","i-consent-boundaries"].map(k=>[k,3])
)]));
scores.jack["g-start"]=2.4;scores.jack["g-influence"]=2.5;scores.jill["g-influence"]=2.4;
const start=structuredClone(scores),mapSubjects={jack:"husband",jill:"wife"};
test("FULL REVIEW: one real engine episode, both coaching conversations, inline MAXQDA-style evidence",async()=>{
 const ep=buildConversation43({...structuredClone(savedMicrowaveStudio),pilotMode:"shared"},{fastForward:true,openConversation:true});
 const report={scenario:storyTitle,method:"ACTUAL 4.3 state machine with deterministic fallback dialogue; not an OpenAI API live response",
  orientation:sophiaOrientation42(ep),startingFacts:ep.authored42.weekFraming,days:[],
  finalState:null,closing:null,summary:{coachingTurns:0,modelGeneratedTurns:0,continuityFailures:0,changes:[],evidence:[]}};
 const history=[],seen=new Set();
 for(let day=0;day<5;day++){
  const scene=renderConversation42(ep,day,history),ledger=parseLedger42(scene.scene);
  if(day===0){assert.equal(ledger.state.purchase,"bought_unannounced");assert.equal(ledger.state.box,"sealed");}
  history.push({role:"shared",kind:"scene",phase_index:day,body:scene.scene});
  const item={day:["Monday","Tuesday","Wednesday","Thursday","Friday"][day],
   sharedOpeningEvent:ledger.event,recipient:scene.recipient,
   initialPrompt:scene.recipient==="jack"?scene.jackPrompt:scene.jillPrompt,
   skillOpportunities:ledger.opportunitySkills,streams:[]};
  for(const role of day%2===0?["jack","jill"]:["jill","jack"]){
   const body=scripts[day][role];
   const key="00000000-0000-4000-8000-8"+String(day).padStart(2,"0")+(role==="jack"?"1":"2")+"00000000";
   const turn=await prepareOpenTurn43(ep,role,day,history,body,key,{
    atlasContext:{character:role,
     coachSkills:scores[mapSubjects[role]],characterSkills:scores[role],
     rememberedEvents:report.summary.evidence.filter(e=>e.lane==="character").slice(-4).map(e=>({summary:e.quote,referenceOnly:true}))}
   });
   ep.authored43.turns.push(turn);
   const coded=[];
   for(const obs of atlasTurnObservations(turn)){
    if(!turn.body.includes(obs.quote)&&!turn.event.includes(obs.quote))throw Error("Citation not in source: "+obs.quote);
    const ident=[obs.subject,obs.skillId,obs.sourceKind,obs.sourceRef].join("|");
    if(seen.has(ident))throw Error("Duplicate observation "+ident);
    seen.add(ident);
    let move=null;
    if(scores[obs.subject]&&Object.prototype.hasOwnProperty.call(scores[obs.subject],obs.skillId)){
     const m=skillMovement({oldScore:scores[obs.subject][obs.skillId],observedRating:obs.observedRating,
       confidence:obs.confidence,sourceRef:ident,subject:obs.subject,skillId:obs.skillId});
     if(m.recordable){scores[obs.subject][obs.skillId]=m.newScore;move=m.delta;
      if(m.delta!==0)report.summary.changes.push({day:item.day,subject:obs.subject,skill:obs.skillId,
       before:m.previousScore,after:m.newScore,delta:m.delta,evidence:obs.quote});
     }
    }
    const code={lane:obs.contextClass,subject:obs.subject,skill:obs.skillId,quote:obs.quote,
      rating:obs.observedRating,confidence:obs.confidence,scoreDelta:move,
      sourceKind:obs.sourceKind,sourceRef:obs.sourceRef};
    coded.push(code);report.summary.evidence.push(code);
   }
   item.streams.push({role,coach:body,characterReply:turn.reply,replySource:turn.replySource,
    dialogueReviewNote:"reply is fallback template, not live model output",
    canonicalAction:turn.event,actionCode:turn.eventCode,
    intended:turn.assessment?.recommended||null,enacted:turn.assessment?.enacted||null,
    codes:coded,worldAfter:{purchase:turn.stateAfter.purchase,box:turn.stateAfter.box,
     repairPlan:turn.stateAfter.repairPlan,repairCalled:turn.stateAfter.repairCalled,
     strain:turn.stateAfter.strain}});
   report.summary.coachingTurns++;
   if(turn.replySource==="model-validated")report.summary.modelGeneratedTurns++;
  }
  report.days.push(item);
 }
 const finish=renderConversation42(ep,5,history);
 history.push({role:"shared",kind:"scene",phase_index:5,body:finish.scene});
 report.finalState=parseLedger42(finish.scene).state;
 report.closing=sophiaConversation42(ep,history.filter(x=>x.role==="shared"));
 report.summary.startingScores=start;report.summary.endingScores=scores;
 report.summary.allSourceQuotesVerified=true;report.summary.encodedEvents=report.days.flatMap(d=>d.streams).filter(t=>t.canonicalAction).length;
 console.log("ANTHOS_ONE_PILOT_TRANSCRIPT_BEGIN");
 console.log(JSON.stringify(report));
 console.log("ANTHOS_ONE_PILOT_TRANSCRIPT_END");
 assert.equal(report.summary.coachingTurns,10);
 assert.equal(report.summary.modelGeneratedTurns,0);
 assert.equal(report.days.length,5);
 assert.ok(report.closing.includes("SOPHIA"));
});
