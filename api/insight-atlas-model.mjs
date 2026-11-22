// Insight Atlas v1: pure, testable, evidence-first scoring and quality rules.
// No network calls or customer data access. Models are educational, not diagnoses.
export const ATLAS_VERSION="atlas-v1";
export const SUBJECTS=Object.freeze(["husband","wife","jack","jill"]);
export const SELECTED_MICROWAVE_SKILLS=Object.freeze(["s-decisions","g-start","g-influence"]);
export const INTIMACY_SKILLS=Object.freeze(["i-sexual-respect","i-consent-boundaries","i-nontransactional"]);
const round2=n=>Math.round((n+Number.EPSILON)*100)/100;
const finite=(v,min,max)=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
const norm=t=>String(t||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
/**
 * Scores are a slow-moving estimate of FICTIONAL character behavior or coach
 * recommendations, separately. No score may move without cited observation.
 * A single observation can move at most 0.35 on the enduring 1–5 scale.
 */
export function skillMovement({oldScore=3,observedRating=null,confidence=1,sourceRef,subject,skillId}){
 if(!finite(oldScore,1,5))throw Error("Invalid previous score.");
 if(!SUBJECTS.includes(subject))throw Error("Invalid subject.");
 if(!skillId||typeof skillId!=="string")throw Error("Skill required.");
 if(observedRating===null)return {previousScore:oldScore,newScore:oldScore,delta:0,recordable:false,reason:"unobserved"};
 if(!Number.isInteger(observedRating)||observedRating<1||observedRating>5)throw Error("Invalid observation.");
 if(!finite(confidence,0,1))throw Error("Invalid confidence.");
 if(!sourceRef||typeof sourceRef!=="string")throw Error("Evidence citation is mandatory.");
 if(confidence<0.6)return {previousScore:oldScore,newScore:oldScore,delta:0,recordable:false,reason:"low-confidence"};
 const change=Math.max(-0.35,Math.min(0.35,0.25*(observedRating-oldScore)*confidence));
 const next=round2(Math.max(1,Math.min(5,oldScore+change)));
 return {previousScore:oldScore,newScore:next,delta:round2(next-oldScore),recordable:true,sourceRef,
  subject,skillId,observedRating,confidence};
}
// Decode wording without penalizing a user who is quoting or condemning bad advice.
// A joke alone is never equivalent to an enacted consent violation.
export function incidentalIntimacyReview(message){
 const t=norm(message);
 const sexual=/\b(sex|sexual|bedroom|sleep with|go down on|oral|intimacy|intimate|affection)\b/.test(t);
 const trade=/\b(earn|payment|pay for|trade|exchange|owe|owes|reward|in return|only if|in exchange|condition)\b/.test(t);
 if(!sexual||!trade)return {observations:[],interpretation:"not-observed",safetyFlag:null};
 const rejects=/\b(don t|do not|never|shouldn t|wouldn t|wrong to|not okay|unacceptable|refuse|reject|bad idea|against)\b/.test(t);
 const demands=/\b(tell|make|force|demand|insist|needs to|have to|has to|must|should|require)\b/.test(t);
 const laughter=/\b(joking|kidding|haha|lol|just a joke)\b/.test(t);
 if(rejects)return {observations:[{skillId:"i-nontransactional",rating:4,confidence:0.8}],interpretation:"rejects-transaction",safetyFlag:null};
 if(laughter&&!demands)return {observations:[],interpretation:"ambiguous-humor",safetyFlag:null};
 if(demands)return {observations:[
   {skillId:"i-nontransactional",rating:1,confidence:laughter?0.65:0.9},
   {skillId:"i-sexual-respect",rating:2,confidence:laughter?0.6:0.8}
  ],interpretation:laughter?"joke-with-instruction":"coercive-recommendation",
  safetyFlag:"sexual-quid-pro-quo-recommendation"};
 return {observations:[],interpretation:"needs-context",safetyFlag:null};
}
export function applyObservationOnce(state,observation,seenSourceRefs=new Set()){
 const ref=String(observation?.sourceRef||"");
 if(!ref)throw Error("Source required.");
 if(seenSourceRefs.has(ref))return {state,applied:false,reason:"source-already-counted"};
 const m=skillMovement({oldScore:state.score,observedRating:observation.rating,
  confidence:observation.confidence??1,sourceRef:ref,
  subject:state.subject,skillId:state.skillId});
 if(!m.recordable)return {state,applied:false,reason:m.reason};
 return {state:{...state,score:m.newScore,evidenceCount:(state.evidenceCount||0)+1},
  movement:m,applied:true};
}
export function memoryContext(memories,skillIds,alreadyMentioned=[]){
 const active=new Set(skillIds),spent=new Set(alreadyMentioned);
 return (memories||[]).filter(m=>!spent.has(m.memoryKey)&&
  (m.skillIds||[]).some(s=>active.has(s)))
  .sort((a,b)=>(b.salience||0)-(a.salience||0))
  .slice(0,3).map(m=>({
   memoryKey:m.memoryKey,summary:m.summary,originatingEvidenceId:m.originatingEvidenceId,
   // Important: REFERENCING memories is not a new skill observation.
   referenceOnly:true
  }));
}
export function repeatedAnnouncement(nextMessage,priorOwnMessages){
 const s=norm(nextMessage);
 const phrases=[
  /jack actually (made|completed) the repair call/,
  /jack (actually )?called the repair shop/,
  /the replacement is still sealed/,
  /i haven t bought a replacement/
 ];
 return phrases.filter(p=>p.test(s)&&priorOwnMessages.some(msg=>p.test(norm(msg)))).map(p=>p.source);
}
export function qualityGate({scores={},criticalFailures=[],evidenceRefs=[],requiredRefs=[]}={}){
 const aspects=["continuity","advancement","coachingImpact","characterAgency","nonrepetition",
 "skills","emotionalRealism","humor","consentSafety","evidenceIntegrity"];
 const missing=aspects.filter(k=>!finite(scores[k],0,10));
 const missingRefs=requiredRefs.filter(x=>!evidenceRefs.includes(x));
 const values=aspects.map(k=>scores[k]).filter(Number.isFinite);
 const overall=values.length?round2(values.reduce((a,b)=>a+b,0)/values.length):null;
 const failures=[...new Set([...criticalFailures,
  ...(missing.length?["unscored-dimensions:"+missing.join(",")]:[]),
  ...(missingRefs.length?["missing-evidence-refs"]:[])
 ])];
 return {overall,pass:failures.length===0&&overall>=8&&aspects.every(k=>scores[k]>=7),
  criticalFailures:failures,belowStandard:aspects.filter(k=>finite(scores[k],0,10)&&scores[k]<7)};
}
