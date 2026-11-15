// Anthos AI Quality Lab: evidence-first offline evaluator, independent of customer APIs.
// Scores are AI/human judgments, NOT deterministic proof. Fail closed on unknown gates.
export const DIMENSIONS=Object.freeze({
 coaching:{weight:0.25,title:"Coaching responsiveness and consequences"},
 agency:{weight:0.20,title:"Character autonomy and emotional realism"},
 continuity:{weight:0.20,title:"Continuity and factual consistency"},
 humor:{weight:0.15,title:"Humor, entertainment and originality"},
 pacing:{weight:0.10,title:"Pacing, brevity and progression"},
 sophia:{weight:0.10,title:"Sophia and educational value"}
});
export const HARD_GATES=Object.freeze([
 "privacy","safety","factual","state","coaching","forcedDecision"
]);
const normalize=s=>String(s||"").replace(/\s+/g," ").trim().toLowerCase();
const hasEvidence=(text,evidence)=>normalize(evidence).length>=12&&normalize(text).includes(normalize(evidence));
export const words=s=>String(s||"").trim().split(/\s+/).filter(Boolean).length;
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const round=(n,p=2)=>n===null?null:Number(n.toFixed(p));
function structuralChecks(run){
 const failures=[],unverified=[],flags=[];
 const scenes=Array.isArray(run.scenes)?run.scenes:[];
 if(scenes.length!==6||scenes.some((s,i)=>s.phase!==i||!String(s.body||"").trim()))
  failures.push("Six consecutive scenes (phases 0–5) are required");
 for(const s of scenes){
  const n=words(s.body);
  if(n<75||n>110)flags.push({type:"pacing",phase:s.phase,words:n,reason:"outside target 75–110 words"});
 }
 const transitions=run.transitions;
 if(!Array.isArray(transitions)||transitions.length!==6)unverified.push("Six simulation transition records are missing");
 else for(let i=0;i<transitions.length;i++){
  const t=transitions[i];
  if(t.phase!==i)failures.push("Out-of-order transition at "+i);
  if(t.afterState?.lastPhase!==i)failures.push("Committed phase mismatch at "+i);
  if(i>0&&JSON.stringify(t.beforeState)!==JSON.stringify(transitions[i-1].afterState))
   failures.push("State continuity mismatch at "+i);
  if(!hasEvidence(scenes[i]?.body,t.eventEvidence))
   failures.push("Transition event lacks literal scene evidence at "+i);
 }
 if(Array.isArray(transitions)&&transitions.length===6){
  const seenEvents=new Set();
  for(const t of transitions){
   const evidence=normalize(t.eventEvidence);
   if(evidence.length<12)continue;
   if(seenEvents.has(evidence))failures.push("Repeated completed event evidence at phase "+t.phase);
   seenEvents.add(evidence);
  }
 }
 const coaching=Array.isArray(run.coaching)?run.coaching:[];
 if(!coaching.length)unverified.push("No coaching lineage entries");
 for(const c of coaching){
  if(!["jack","jill"].includes(c.role)||!Number.isInteger(c.afterPhase)||c.afterPhase<0||c.afterPhase>4){
   failures.push("Malformed coaching lineage entry");continue;
  }
  const following=scenes[c.afterPhase+1]?.body||"";
  if(!["follow","challenge","misinterpret","partly_accept","reject"].includes(c.disposition))
   unverified.push("Unassessed coaching disposition for "+c.role+" after "+c.afterPhase);
  if(!hasEvidence(following,c.evidence))
   failures.push("No visible consequence for "+c.role+" advice after phase "+c.afterPhase);
  const syntheticInput=normalize(c.syntheticInput);
  if(syntheticInput.length>=25&&normalize(scenes.map(s=>s.body).join(" ")).includes(syntheticInput))
   failures.push("Private coaching text leaked verbatim for "+c.role+" at "+c.afterPhase);
 }
 if(!run.closure?.body)unverified.push("Sophia closure not captured");
 if(run.humorBeats===0)flags.push({type:"humor",reason:"No structured humor beats recorded; absence is not proof of zero humor"});
 return {failures,unverified,flags,wordCounts:scenes.map(s=>words(s.body))};
}
export function evaluateRun(run){
 if(!run||typeof run!=="object")throw new TypeError("A run object is required");
 const structure=structuralChecks(run),gates={};
 for(const key of HARD_GATES){
  const evidence=run.gateEvidence?.[key];
  const grounded=typeof evidence==="string"&&evidence.trim().length>=15;
  gates[key]=run.gates?.[key]===false?false:
   run.gates?.[key]===true&&grounded?true:null;
 }
 if(structure.failures.length){
  if(structure.failures.some(x=>!/Private coaching text leaked/.test(x)))gates.state=false;
  if(structure.failures.some(x=>/coaching|visible consequence/.test(x)))gates.coaching=false;
  if(structure.failures.some(x=>/Private coaching text leaked/.test(x)))gates.privacy=false;
 }
 if(structure.unverified.some(x=>x.includes("transition"))&&gates.state===true)gates.state=null;
 if(structure.unverified.some(x=>x.includes("coaching"))&&gates.coaching===true)gates.coaching=null;
 const scores={},missing=[];
 for(const [key,dimension] of Object.entries(DIMENSIONS)){
  const judgment=run.judgments?.[key],rating=judgment?.score;
  if(typeof rating!=="number"||!Number.isFinite(rating)||rating<0||rating>10||
    !Array.isArray(judgment.evidence)||!judgment.evidence.some(x=>String(x).trim().length>=15)){
    missing.push(key);continue;
  }
  scores[key]={...judgment,weight:dimension.weight};
 }
 const weighted=missing.length?null:round(Object.entries(scores).reduce((sum,[key,j])=>sum+j.score*DIMENSIONS[key].weight,0));
 const failed=Object.entries(gates).filter(([,v])=>v===false).map(([k])=>k);
 const unknown=Object.entries(gates).filter(([,v])=>v===null).map(([k])=>k);
 let status="ACCEPTED";
 if(structure.failures.some(x=>x.startsWith("Six consecutive")))status="INCOMPLETE";
 else if(failed.length)status="HARD_FAIL";
 else if(unknown.length||structure.unverified.length||missing.length)status="UNVERIFIED";
 else if(weighted<8)status="BELOW_8";
 return {
  id:run.id||null,episodeId:run.episodeId||null,petal:run.petal||null,mode:run.mode||null,
  profile:run.profile||null,seed:run.seed??null,engineCommit:run.engineCommit||null,
  model:run.model||null,episodeVersion:run.episodeVersion||null,
  weightedScore:weighted,dimensionScores:scores,status,gates,failedGates:failed,
  unknownGates:unknown,missingJudgments:missing,structuralFailures:structure.failures,
  structuralUnverified:structure.unverified,flags:structure.flags,
  wordCounts:structure.wordCounts,averageSceneWords:round(mean(structure.wordCounts)),
  costUsd:typeof run.costUsd==="number"?run.costUsd:null,
  latencyMs:typeof run.latencyMs==="number"?run.latencyMs:null,
  generationUsage:run.generationUsage||null,
  reproducibility:{
   seed:run.seed??null,engineCommit:run.engineCommit||null,model:run.model||null,
   episodeVersion:run.episodeVersion||null,profile:run.profile||null,
   note:"API sampling can be nondeterministic; exact replay requires retained synthetic transcript and output snapshot."
  }
 };
}
export function summarize(reports){
 const a=reports.filter(x=>x.weightedScore!==null).map(x=>x.weightedScore).sort((x,y)=>x-y);
 const completed=reports.filter(x=>x.status!=="INCOMPLETE"),mid=Math.floor(a.length/2);
 const costs=completed.map(x=>x.costUsd).filter(x=>typeof x==="number");
 const statuses=Object.fromEntries(["ACCEPTED","BELOW_8","HARD_FAIL","UNVERIFIED","INCOMPLETE","EDITORIALLY_UNREADY"].map(x=>[x,reports.filter(r=>r.status===x).length]));
 const causes={};for(const r of reports)for(const c of [...r.failedGates,...r.structuralFailures,...r.flags.map(x=>x.type)])causes[c]=(causes[c]||0)+1;
 return {attempted:reports.length,scored:a.length,completed:completed.length,
  accepted:statuses.ACCEPTED,passRate:reports.length?round(statuses.ACCEPTED/reports.length):null,
  hardFailureRate:reports.length?round(statuses.HARD_FAIL/reports.length):null,
  meanScore:round(mean(a)),medianScore:a.length?round(a.length%2?a[mid]:(a[mid-1]+a[mid])/2):null,
  lowestScore:a.length?a[0]:null,meanCostUsd:round(mean(costs),4),
  costCoverage:costs.length,statuses,failures:causes,
  warning:"Uncalibrated AI/human scores are estimates; unscored and unverified runs are never accepted."};
}
