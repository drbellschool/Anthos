import test from "node:test";
import {readFileSync,writeFileSync} from "node:fs";
import {verifyLivePilot43} from "../lib/atlas-live-qa-contract.mjs";
import assert from "node:assert/strict";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
import {buildConversation43,renderConversation42,prepareOpenTurn43,parseLedger42,sophiaConversation42} from "../api/jj42-conversations.mjs";
import {atlasTurnObservations} from "../api/atlas-runtime.mjs";
import {skillMovement,repeatedAnnouncement} from "../api/insight-atlas-model.mjs";
import {coverageReport} from "../api/atlas-opportunities.mjs";
import {SKILLS} from "../api/episode-studio.mjs";
const CASES=[
  {
    "id": "01",
    "name": "Collaborative and accountable",
    "description": "Both acknowledge their part and seek a practical shared choice",
    "start": {
      "husband": {
        "g-start": 3.8
      },
      "wife": {
        "g-influence": 3.9
      },
      "jack": {
        "g-start": 3.5
      },
      "jill": {
        "g-influence": 3.7
      }
    },
    "scripts": [
      {
        "jack": "Own the missed Saturday repairs. Apologize for letting Jill carry the inconvenience.",
        "jill": "Own that you spent $400 without consulting Jack. Hear his emergency savings concern."
      },
      {
        "jack": "Find the model number and plan a repair shop call.",
        "jill": "Keep the replacement sealed until you compare a real repair option."
      },
      {
        "jack": "Call a repair shop today without pretending the price is known.",
        "jill": "Hear Jack's concern while also explaining how hard dinners have been."
      },
      {
        "jack": "Ask Jill what would make your apology feel meaningful rather than repeating it.",
        "jill": "Talk to Jack about a concrete spending threshold for future purchases."
      },
      {
        "jack": "Ask Jill which decision deadline feels fair without promising a repair.",
        "jill": "Wait for a verified repair quote and discuss the next decision together."
      }
    ]
  },
  {
    "id": "02",
    "name": "Conflict-avoidant couple",
    "description": "Both want peace but resist direct accountability",
    "start": {
      "jack": {
        "s-decisions": 2.2,
        "g-start": 2.4
      },
      "jill": {
        "g-influence": 2.3
      },
      "husband": {
        "s-decisions": 2.4
      },
      "wife": {
        "s-decisions": 2.5
      }
    },
    "scripts": [
      {
        "jack": "Maybe just wait. I don't know what to say yet.",
        "jill": "Keep it sealed. No confrontation today."
      },
      {
        "jack": "I guess you could plan a call tomorrow instead of arguing.",
        "jill": "Stay quiet and avoid the argument."
      },
      {
        "jack": "What if you asked a question instead of making another promise?",
        "jill": "Listen to Jack's savings worry, but don't force a decision right now."
      },
      {
        "jack": "Don't call her out. Maybe say nothing until things calm down.",
        "jill": "Wait until he brings it up."
      },
      {
        "jack": "You could take responsibility for not fixing it, but only if you're ready.",
        "jill": "Maybe talk to him tomorrow; I'm not sure."
      }
    ]
  },
  {
    "id": "03",
    "name": "Defensive high-conflict couple",
    "description": "Both coaches recommend blame and control",
    "start": {
      "jack": {
        "g-start": 1.9,
        "g-influence": 1.9
      },
      "jill": {
        "g-influence": 2.1
      },
      "husband": {
        "g-start": 2.1
      },
      "wife": {
        "g-influence": 2.1
      }
    },
    "scripts": [
      {
        "jack": "Blame Jill for blowing emergency savings. Demand she admit she's wrong.",
        "jill": "Blame Jack for three Saturdays of excuses and demand he back off."
      },
      {
        "jack": "Lecture her. Tell her you're the one who decides about savings.",
        "jill": "Open the box and refuse any negotiation."
      },
      {
        "jack": "Keep blaming Jill and refuse to hear her concerns.",
        "jill": "Demand an apology and dismiss Jack's worries."
      },
      {
        "jack": "Call the repair shop today so you can prove you were right all along.",
        "jill": "Tell him the box stays open and the issue is settled."
      },
      {
        "jack": "Apologize for the harsh language if you can.",
        "jill": "Hear his money concern without promising you agree."
      }
    ]
  },
  {
    "id": "04",
    "name": "Financially anxious couple",
    "description": "Protecting savings conflicts with daily household needs",
    "start": {
      "jack": {
        "s-decisions": 4.1,
        "g-influence": 2.3
      },
      "jill": {
        "g-influence": 3.2
      },
      "husband": {
        "s-decisions": 4.2
      },
      "wife": {
        "s-decisions": 3.5
      }
    },
    "scripts": [
      {
        "jack": "Explain the emergency fund matters; avoid accusing Jill of bad motives.",
        "jill": "Tell Jack the microwave is broken and ask him to hear the practical burden."
      },
      {
        "jack": "Make a plan to call a repair shop and find the model number.",
        "jill": "Keep the sealed replacement while you get facts."
      },
      {
        "jack": "Call the repair shop today, not another vague Saturday.",
        "jill": "Listen to his savings fears even if you still disagree."
      },
      {
        "jack": "Tell Jill you regret the delays and own those Saturdays.",
        "jill": "Talk to Jack about what a major purchase threshold should be."
      },
      {
        "jack": "Ask for a joint deadline without inventing a repair quote.",
        "jill": "Wait for a real quote before making any more choices."
      }
    ]
  },
  {
    "id": "05",
    "name": "Exhausted practical couple",
    "description": "Short direct messages due to parenting and work pressure",
    "start": {
      "jack": {
        "s-decisions": 3.7
      },
      "jill": {
        "s-decisions": 3.5
      }
    },
    "scripts": [
      {
        "jack": "Own it. Apologize. Three missed Saturdays.",
        "jill": "Tell Jack it's not about winning. Hear his concern."
      },
      {
        "jack": "Get the model number. Plan the call.",
        "jill": "Keep it sealed for now."
      },
      {
        "jack": "Call the repair shop today.",
        "jill": "Hear him. Need microwave. Both matter."
      },
      {
        "jack": "Ask about a fair budget threshold.",
        "jill": "Talk to Jack about the cost and deadline."
      },
      {
        "jack": "No new promises. Ask Jill what she needs next.",
        "jill": "Wait for a price. Decide together."
      }
    ]
  },
  {
    "id": "06",
    "name": "Humor as avoidance",
    "description": "Jokes are used to dodge accountability, including one inappropriate suggestion",
    "start": {
      "jack": {
        "i-nontransactional": 2.4,
        "g-start": 2.5
      },
      "jill": {
        "g-influence": 3.4
      }
    },
    "scripts": [
      {
        "jack": "Make a joke about declaring Saturday a national microwave repair holiday.",
        "jill": "Tell him the Saturday note belongs in a museum. Also ask him to listen."
      },
      {
        "jack": "Tell Jill she has to earn the microwave with a sexual favor. LOL.",
        "jill": "Open the box and tell him the joke wasn't funny."
      },
      {
        "jack": "Apologize for the terrible joke and admit you delayed the repair.",
        "jill": "Hear his money concerns without pretending the joke was okay."
      },
      {
        "jack": "Call a repair shop today and stop using jokes as an escape.",
        "jill": "Talk about a fair next step and a boundary around jokes."
      },
      {
        "jack": "Ask Jill how to repair the hurt from that joke.",
        "jill": "Keep the issue about the shared decision, not punishment."
      }
    ]
  },
  {
    "id": "07",
    "name": "Constructive Jack, dismissive Jill",
    "description": "The husband coaches accountability but the wife pushes unilateral action",
    "start": {
      "jack": {
        "g-start": 4,
        "s-decisions": 3.6
      },
      "jill": {
        "g-influence": 1.9
      },
      "husband": {
        "g-start": 4
      },
      "wife": {
        "g-influence": 2
      }
    },
    "scripts": [
      {
        "jack": "Own the delays and apologize without justifying them.",
        "jill": "Demand Jack accept your purchase; blame him for everything."
      },
      {
        "jack": "Find the model number and plan a repair call.",
        "jill": "Open the microwave box regardless of his feelings."
      },
      {
        "jack": "Call the repair shop and do not make claims about the price.",
        "jill": "Refuse to hear anything about savings."
      },
      {
        "jack": "Ask Jill about what matters to her now and listen.",
        "jill": "Blame him for everything and dismiss the money concern."
      },
      {
        "jack": "Ask about a fair joint decision without controlling Jill.",
        "jill": "Hear his concern at least once, but don't pretend all is resolved."
      }
    ]
  },
  {
    "id": "08",
    "name": "Defensive Jack, constructive Jill",
    "description": "The wife coaches accountability while the husband resists",
    "start": {
      "jack": {
        "g-start": 1.8,
        "g-influence": 2.1
      },
      "jill": {
        "g-influence": 4
      },
      "husband": {
        "g-start": 1.9
      },
      "wife": {
        "g-influence": 4
      }
    },
    "scripts": [
      {
        "jack": "Blame Jill and lecture her about the money.",
        "jill": "Own that you spent savings without asking, and apologize."
      },
      {
        "jack": "Demand she admit she was wrong.",
        "jill": "Keep the box sealed while you talk."
      },
      {
        "jack": "Dismiss her concerns and defend your failed Saturday promises.",
        "jill": "Hear why he needs the emergency fund and ask his perspective."
      },
      {
        "jack": "Get the model number and plan a call without admitting anything.",
        "jill": "Discuss a future purchase threshold together."
      },
      {
        "jack": "Call the repair shop today.",
        "jill": "Ask what a fair next step looks like without surrendering your own need."
      }
    ]
  },
  {
    "id": "09",
    "name": "Contradictory and rumor-prone",
    "description": "Coaches use reports, negations, questions and mixed advice",
    "start": {
      "jack": {
        "g-influence": 3.3
      },
      "jill": {
        "s-decisions": 3.1
      }
    },
    "scripts": [
      {
        "jack": "My wife told me Jill said you already repaired it. Is that actually true?",
        "jill": "Don't open the box. Ask Jack what he knows about repair prices."
      },
      {
        "jack": "Don't call a repair shop today. Plan it for later.",
        "jill": "Did Jack really get a quote or is that just something he said?"
      },
      {
        "jack": "Our wives were talking. My wife says Jill wants you to call a shop now, but I don't know if that's accurate.",
        "jill": "Do not buy another one. Leave the box sealed."
      },
      {
        "jack": "Apologize for making promises you didn't keep, but don't pretend the repair is complete.",
        "jill": "Talk to Jack about the purchase without claiming he already agreed."
      },
      {
        "jack": "Call the repair shop now and ask for information.",
        "jill": "Hear his concerns without accepting a fictional refund policy."
      }
    ]
  },
  {
    "id": "10",
    "name": "Conflict then change of heart",
    "description": "Both initially make things worse, then coaches actively recover",
    "start": {
      "jack": {
        "g-start": 2.4,
        "g-influence": 2.5
      },
      "jill": {
        "g-influence": 2.4
      }
    },
    "scripts": [
      {
        "jack": "Blame Jill for spending money without consulting you.",
        "jill": "Demand Jack back off and blame him for the broken microwave."
      },
      {
        "jack": "Lecture her and defend your repair delays.",
        "jill": "Open the replacement box without talking."
      },
      {
        "jack": "Own your missed promises and apologize for being cruel.",
        "jill": "Acknowledge what you did with savings and apologize."
      },
      {
        "jack": "Get the model number and plan a repair shop call.",
        "jill": "Hear his savings concerns without erasing your frustration."
      },
      {
        "jack": "Call the repair shop today and ask for the actual price.",
        "jill": "Talk with him about a shared decision deadline and what still feels unresolved."
      }
    ]
  }
];

const LIVE_QA=process.env.ANTHOS_QA_LIVE==="1";
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday"];
const focus=["s-decisions","g-start","g-influence"];
const codes=[...new Set(SKILLS.map(s=>s.id).concat(focus))];
const subjects=["husband","wife","jack","jill"];
function freshState(config){
 const scores=Object.fromEntries(subjects.map(s=>[s,Object.fromEntries(codes.map(id=>[id,3]))]));
 for(const [subject,skills] of Object.entries(config.start||{}))
  for(const [skill,score] of Object.entries(skills))scores[subject][skill]=score;
 return scores;
}
function context(scores,memories,role){
 const character=role==="jack"?"jack":"jill",coach=role==="jack"?"husband":"wife";
 return {character:role,characterSkills:{...scores[character]},coachSkills:{...scores[coach]},
  rememberedEvents:memories.slice(-4).map(m=>({key:m.id,summary:m.event,
   originatingEvidenceId:m.turn,referenceOnly:true}))};
}
function refKey(config,day,role){
 return "00000000-0000-4000-8000-"+config.id+String(day).padStart(2,"0")+
  (role==="jack"?"1":"2")+"0000000";
}
async function simulate(config){
 const errors=[],flags=[],history=[],observations=[],movements=[],memories=[],days=[],seenSource=new Set(),
  seenEvents=new Set(),seenCodes=new Set(),seenReplies=new Set();
 const scores=freshState(config),initial=structuredClone(scores);
 const episode=buildConversation43({...structuredClone(savedMicrowaveStudio),pilotMode:"shared"},
  {fastForward:true,openConversation:true});
 let stage="not started",previousState=null;
 try{
 for(let day=0;day<5;day++){
  stage="opening "+DAYS[day];
  const opened=renderConversation42(episode,day,history);
  const ledger=parseLedger42(opened.scene);
  if(!ledger)throw Error("Unparseable canonical day");
  if(day===0&&(ledger.state.purchase!=="bought_unannounced"||ledger.state.box!=="sealed"))
   errors.push("Started with wrong purchase or box facts.");
  if(day>0&&/Jack called a repair shop/i.test(ledger.event))
   errors.push("Repair call occurred without verified coach-turn action.");
  history.push({role:"shared",kind:"scene",phase_index:day,body:opened.scene});
  if(opened.recipient)history.push({role:opened.recipient,kind:"prompt",phase_index:day,
   body:opened.recipient==="jack"?opened.jackPrompt:opened.jillPrompt});
  const texts=[];
  for(const role of day%2===0?["jack","jill"]:["jill","jack"]){
   stage=DAYS[day]+" "+role+" coaching";
   const advice=config.scripts[day][role];
   if(!advice)throw Error("Missing "+stage);
   const key=refKey(config,day,role);
   const turn=await prepareOpenTurn43(episode,role,day,history,advice,key,
    {atlasContext:context(scores,memories,role),
     requireModelVoice:LIVE_QA,
     apiKey:LIVE_QA?process.env.OPENAI_API_KEY:undefined,
     model:process.env.ANTHOS_JJ4_MODEL||process.env.OPENAI_MODEL||"gpt-4.1-mini"});
   episode.authored43.turns.push(turn);
   const eventIdentity=role+"|"+String(turn.event||"").toLowerCase().replace(/[^a-z0-9]/g,"");
   const replyIdentity=role+"|"+String(turn.reply||"").toLowerCase().replace(/[^a-z0-9]/g,"");
   if(turn.event&&!turn.eventCode)errors.push("No eventCode: "+turn.event);
   if(turn.event&&seenCodes.has(turn.eventCode))errors.push("Duplicate eventCode: "+turn.eventCode);
   if(turn.event)seenCodes.add(turn.eventCode);
   if(turn.event&&seenEvents.has(eventIdentity))errors.push("Duplicate event text: "+turn.event);
   if(turn.event)seenEvents.add(eventIdentity);
   if(seenReplies.has(replyIdentity))errors.push("Duplicate character reply: "+turn.reply);
   seenReplies.add(replyIdentity);
   const previous=previousState||ledger.state;
   const state=turn.stateAfter;
   if(state.purchase!=="bought_unannounced")errors.push("Purchase changed from original.");
   if(state.box!=="sealed"&&state.box!=="opened")errors.push("Illegal box state: "+state.box);
   if(previous.box==="opened"&&state.box!=="opened")errors.push("Box resealed.");
   if(previous.repairCalled&&!state.repairCalled)errors.push("Repair call undone.");
   if(state.repair!=="broken")errors.push("Microwave magically repaired.");
   if(previous.jackOwnsDelay&&!state.jackOwnsDelay)errors.push("Jack forgot apology.");
   if(previous.jillOwnsPurchase&&!state.jillOwnsPurchase)errors.push("Jill forgot purchase admission.");
   if(!turn.event&&turn.assessment?.behavior&&
     Object.values(turn.assessment.behavior).some(x=>Number.isInteger(x)))
    errors.push("Character behavior rating without enacted action.");
   previousState=structuredClone(state);
   const annotations=atlasTurnObservations(turn),changes=[];
   for(const obs of annotations){
    if(!scores[obs.subject])errors.push("Unknown scored subject: "+obs.subject);
    if(!turn.body.includes(obs.quote)&&!turn.event.includes(obs.quote))
     errors.push("Evidence quote missing from source: "+obs.quote);
    const ref=[obs.subject,obs.skillId,obs.sourceKind,obs.sourceRef].join("|");
    if(seenSource.has(ref))errors.push("Duplicate evidence reference: "+ref);
    seenSource.add(ref);
    if(!Number.isFinite(scores[obs.subject]?.[obs.skillId]))scores[obs.subject][obs.skillId]=3;
    const result=skillMovement({oldScore:scores[obs.subject][obs.skillId],
     observedRating:obs.observedRating,confidence:obs.confidence,sourceRef:ref,
     subject:obs.subject,skillId:obs.skillId});
    if(result.recordable&&result.delta!==0){
     scores[obs.subject][obs.skillId]=result.newScore;
     const change={subject:obs.subject,skill:obs.skillId,from:result.previousScore,
      to:result.newScore,delta:result.delta,context:obs.contextClass,
      evidence:obs.quote.slice(0,140),sourceRef:ref};
     movements.push(change);changes.push(change);
    }
    observations.push({subject:obs.subject,skill:obs.skillId,context:obs.contextClass,
     quote:obs.quote,sourceRef:ref});
   }
   if(turn.event)memories.push({id:config.id+"-"+day+"-"+role,turn:key,event:turn.event});
   texts.push({role,advice,replySource:turn.replySource,
    replyModelAttempts:turn.replyModelAttempts,
    replyValidationIssue:turn.replyValidationIssue,
    replyHumorResponse:turn.replyHumorResponse,
    replyHumorEvidence:turn.replyHumorEvidence,
    prompt:opened.recipient===role?
    role==="jack"?opened.jackPrompt:opened.jillPrompt:"",
    proposed:turn.assessment?.recommended||null,enacted:turn.assessment?.enacted||null,
    eventCode:turn.eventCode||null,event:turn.event||"",reply:turn.reply,
    moves:changes,
    state:{purchase:state.purchase,box:state.box,repairPlan:state.repairPlan,
     repairCalled:state.repairCalled,strain:state.strain}});
  }
  days.push({day:DAYS[day],dayOpening:ledger.event,
   opportunities:ledger.opportunitySkills||[],turns:texts});
 }
 const end=renderConversation42(episode,5,history);
 const finalLedger=parseLedger42(end.scene);
 const coverage=coverageReport(days.map(d=>({opportunitySkills:d.opportunities})));
 if(!coverage.complete)errors.push("Three-skill weekly coverage incomplete.");
 const final=finalLedger.state;
 for(const role of ["jack","jill"]){
  const own=days.flatMap(d=>d.turns).filter(t=>t.role===role).map(t=>t.reply);
  for(let i=1;i<own.length;i++){
   const repeated=repeatedAnnouncement(own[i],own.slice(0,i));
   if(repeated.length)errors.push("Reannounced completed action "+role+" "+repeated.join(","));
  }
 }
 const emptyTurns=days.flatMap(d=>d.turns).filter(t=>!t.event).length;
 const actions=days.flatMap(d=>d.turns).filter(t=>t.event);
 const phrases=days.flatMap(d=>d.turns).filter(t=>/what (do you think|are you thinking)\?/i.test(t.reply)).length;
 if(emptyTurns>=7)flags.push("Low new-event development ("+actions.length+"/10)");
 if(phrases>=4)flags.push("High generic-question repetition ("+phrases+"/10)");
 const original=Object.fromEntries(subjects.map(s=>[s,Object.fromEntries(
  Object.entries(scores[s]).filter(([id,v])=>v!==initial[s][id]).map(([id,v])=>[id,[initial[s][id],v]])
 )]));
 return {id:config.id,name:config.name,description:config.description,completed:days.length===5,
  days,final:{purchase:final.purchase,box:final.box,repairPlan:final.repairPlan,
    repairCalled:final.repairCalled,strain:final.strain},
  focusCoverage:coverage,novelActionCount:actions.length,
  emptyTurnCount:emptyTurns,genericQuestionCount:phrases,
  observations:observations.length,movements:movements.length,
  incidentalMovements:movements.filter(m=>m.context==="incidental"),
  perSubjectMovement:original,memories:memories.length,errors,flags,
  closing:sophiaConversation42(episode,[...history,{role:"shared",kind:"scene",
   phase_index:5,body:end.scene}])};
 }catch(e){
  errors.push(stage+": "+String(e?.message||e));
  return {id:config.id,name:config.name,description:config.description,
   completed:false,days,observations:observations.length,movements:movements.length,
   memories:memories.length,errors,flags,perSubjectMovement:{},incidentals:[],
   final:previousState&&{purchase:previousState.purchase,box:previousState.box,
    repairCalled:previousState.repairCalled,strain:previousState.strain}};
 }
}
test("DIVERSE PILOT: 10 independent couple dynamics and 100 total coaching turns",async()=>{
 // Mandatory live QA is not allowed to silently become a fallback simulation.
 if(LIVE_QA&&!process.env.OPENAI_API_KEY?.trim())
  throw Error("ANTHOS LIVE QA BLOCKED: existing OpenAI key unavailable in protected test environment.");
 const reports=await Promise.all(CASES.map(c=>simulate(c)));
 const incomplete=reports.filter(x=>!x.completed);
 const critical=reports.filter(x=>x.errors.length);
 const rows=reports.map(x=>({id:x.id,type:x.name,completed:x.completed,
  days:x.days.length,actions:x.novelActionCount??null,
  observations:x.observations,scoreMoves:x.movements,
  incidental:x.incidentalMovements?.length||0,
  strain:x.final?.strain??null,box:x.final?.box??null,
  errors:x.errors.length,flags:x.flags}));
 // Consistency is not story quality. Prevent green tests from hiding reused
 // character lines across unrelated couples or silently ignored harmless humor.
 const allReplies=reports.flatMap(r=>r.days.flatMap(d=>d.turns.map(t=>t.reply)));
 const uniqueReplies=new Set(allReplies.map(x=>x.trim().toLowerCase())).size;
 const funny=reports.find(r=>r.id==="06")?.days[0]?.turns.find(t=>t.role==="jack");
 const humorAddressed=/\b(?:holiday|joke|joking|comedian|not going to joke|won't joke)\b/i
  .test([funny?.event,funny?.reply].join(" "));
 const qualityAudit={
  totalReplies:allReplies.length,uniqueReplies,
  uniqueRatio:Number((uniqueReplies/allReplies.length).toFixed(2)),
  targetUniqueRatio:0.60,
  benignHumorAddressed:humorAddressed,
  qualityPass:uniqueReplies/allReplies.length>=0.60&&humorAddressed,
  note:"Canned offline fallback lines may satisfy state invariants while failing humanlike voices. These measures are a minimum smoke gate, not an 8/10 model-content certification."
 };
 const liveReviews=LIVE_QA&&process.env.ANTHOS_QA_HUMAN_REVIEWS_PATH?
  JSON.parse(readFileSync(process.env.ANTHOS_QA_HUMAN_REVIEWS_PATH,"utf8")):[];
 const liveVerification=LIVE_QA?verifyLivePilot43({couples:reports,reviews:liveReviews}):null;
 if(LIVE_QA&&process.env.ANTHOS_QA_OUTPUT_PATH)
  writeFileSync(process.env.ANTHOS_QA_OUTPUT_PATH,
   JSON.stringify({runKind:"real-model-required",couples:reports,reviews:liveReviews,
    verification:liveVerification},null,2));
 console.log("ANTHOS_DIVERSE_COUPLES_BEGIN");
 console.log(JSON.stringify({method:"Existing offline Anthos 4.3 open-conversation engine, no new API, no database writes; fixed saved microwave opening.",count:reports.length,
  turnsExpected:CASES.length*10,runKind:LIVE_QA?"real-model-required":"offline-deterministic",
  liveVerification,summary:rows,qualityAudit,couples:reports},null,2));
 console.log("ANTHOS_DIVERSE_COUPLES_END");
 assert.equal(CASES.length,10);
 assert.deepEqual(incomplete.map(x=>({type:x.name,errors:x.errors})),[],
  "Every archetype must complete five days with both coaching streams.");
 assert.deepEqual(critical.map(x=>({type:x.name,errors:x.errors})),[],
  "No world-state, source-evidence, or dialogue duplication may pass.");
 assert.ok(reports.some(r=>r.incidentalMovements?.some(x=>x.delta<0)),
  "At least one incidental consequence should be evidenced.");
 assert.ok(new Set(reports.map(r=>r.final.strain)).size>=2,
  "Different couple dynamics should not all have the same relationship pressure.");
 if(LIVE_QA){
  assert.equal(liveVerification.passed,true,
   "LIVE AI + HUMAN 8/10 QUALITY GATE FAILED: "+JSON.stringify(liveVerification));
 }else{
  assert.equal(qualityAudit.qualityPass,true,
   "OFFLINE FALLBACK QUALITY GATE FAILED (does not certify AI): "+JSON.stringify(qualityAudit));
 }
});
