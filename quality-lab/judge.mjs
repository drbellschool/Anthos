// One-call structured narrative judge for synthetic QA runs. Estimates, NOT release approval.
// Does not alter any production scene, customer database, or private participant record.
import {readFile,writeFile} from "node:fs/promises";
import {DIMENSIONS,HARD_GATES,evaluateRun} from "./evaluator.mjs";
const required=n=>{const s=process.env[n]?.trim();if(!s)throw Error(n+" required");return s};
const dimensionSchema={type:"object",additionalProperties:false,properties:{
 score:{type:"number"},evidence:{type:"array",items:{type:"string"}},
 explanation:{type:"string"},confidence:{type:"string",enum:["low","medium","high"]}
},required:["score","evidence","explanation","confidence"]};
const gateSchema={type:"object",additionalProperties:false,properties:{
 finding:{type:"string",enum:["pass","fail","unknown"]},
 evidence:{type:"string"},explanation:{type:"string"}
},required:["finding","evidence","explanation"]};
const schema={type:"object",additionalProperties:false,properties:{
 dimensions:{type:"object",additionalProperties:false,
  properties:Object.fromEntries(Object.keys(DIMENSIONS).map(k=>[k,dimensionSchema])),
  required:Object.keys(DIMENSIONS)},
 gates:{type:"object",additionalProperties:false,
  properties:Object.fromEntries(HARD_GATES.map(k=>[k,gateSchema])),required:HARD_GATES},
 summary:{type:"string"}
},required:["dimensions","gates","summary"]};
function fail(msg){throw Error("Quality Lab judge: "+msg)}
const exact=(actual,evidence)=>String(evidence||"").trim().length>=12&&
 String(actual||"").toLowerCase().includes(String(evidence).trim().toLowerCase());
function referenceText(run){
 const chunks=[
  ...(run.scenes||[]).map(s=>String(s.body||"")),
  ...(run.coaching||[]).map(c=>String(c.syntheticInput||"")),
  String(run.closure?.body||"")
 ];
 return chunks.join("\n");
}
export function validateJudgment(judgment,run){
 const corpus=referenceText(run);
 for(const k of Object.keys(DIMENSIONS)){
  const d=judgment?.dimensions?.[k];
  if(!d||typeof d.score!=="number"||!Number.isFinite(d.score)||d.score<0||d.score>10||
   !Array.isArray(d.evidence)||!d.evidence.length||!d.evidence.every(x=>exact(corpus,x)))
   fail("Unverifiable "+k+" evidence or invalid score");
 }
 for(const k of HARD_GATES){
  const g=judgment?.gates?.[k];
  if(!g||!["pass","fail","unknown"].includes(g.finding))fail("Missing gate "+k);
  // A failed gate MUST refer to an actual displayed event/advice/closure, except
  // for absence-based failures which stay unverified pending human review.
  if(g.finding==="fail"&&!exact(corpus,g.evidence))fail("Ungrounded "+k+" gate allegation");
 }
 return true;
}
export async function judgeSyntheticRun(run,{model,key,fetchImpl=fetch}={}){
 if(run?.synthetic!==true)fail("Refusing non-synthetic replay");
 if(!Array.isArray(run.scenes)||run.scenes.length!==6)fail("A complete six-scene replay is required");
 if(!run.closure?.body)fail("Sophia closure is required");
 if(!key)fail("OPENAI_API_KEY required");
 const source={
  episodeId:run.episodeId,petal:run.petal,mode:run.mode,profile:run.profile,
  sixScenes:run.scenes,
  syntheticCoachInputs:(run.coaching||[]).map(c=>({role:c.role,afterPhase:c.afterPhase,advice:c.syntheticInput})),
  sophiaClosure:run.closure.body,
  observedSimulationEvents:Array.isArray(run.transitions)?run.transitions.map(t=>({phase:t.phase,eventEvidence:t.eventEvidence,
   beforeState:t.beforeState,afterState:t.afterState})):null
 };
 const instructions=[
  "Independently judge a fictional Anthos six-scene story. This is a synthetic test, never a real couple.",
  "Use 0–10 on six dimensions: coaching 25%, agency 20%, continuity 20%, humor 15%, pacing 10%, Sophia 10%.",
  "Judge coaching by exact correspondence between synthetic instruction and the FOLLOWING scene, including genuine resistance, mistakes, or consequences; do not demand blind obedience.",
  "Judge agency by independent stance, boundary and earned decision; no inevitable reconciliation.",
  "Continuity must test physical conditions, chronology, and invented factual claims; a character reading a receipt is NOT proof of an unsupplied return policy.",
  "Humor requires situational action, character reaction, and earned callback, but avoid rewarding jokes during serious unsafe moments.",
  "Penalize filler, repetitive introspection, repeated events and 110+ word scenes. Reward new causal developments.",
  "Sophia must connect to actual events, acknowledge unresolved tensions and avoid copying narrator fabrications.",
  "Quote exact, literal, nontrivial excerpts of the supplied scenes or synthetic coach advice for each dimension. Do not invent citations or external facts.",
  "Gate finding pass|fail|unknown for privacy, safety, factual, state, coaching, forcedDecision.",
  "If a factual statement is not grounded in the initial known world or visible verified action, mark factual fail and quote the offending prose.",
  "If gate evidence is absent or a failure depends on the absence of text, choose unknown rather than fabricating a quotation.",
  "Be skeptical of high scores: a smooth six-scene story is not evidence of dramatic quality. Output only the required strict JSON."
 ].join(" ");
 const started=Date.now();
 const res=await fetchImpl("https://api.openai.com/v1/responses",{
  method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
  body:JSON.stringify({model:model||"gpt-4.1-mini",store:false,
   instructions,input:JSON.stringify(source),max_output_tokens:2400,
   text:{format:{type:"json_schema",name:"anthos_qa_independent_judge",strict:true,schema}}}),
  signal:AbortSignal.timeout(55000)
 });
 if(!res.ok)fail("model HTTP "+res.status);
 const data=await res.json();
 const out=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("");
 let judgment;try{judgment=JSON.parse(out)}catch{fail("malformed model output")}
 validateJudgment(judgment,run);
 const enriched={...run,
  judgments:Object.fromEntries(Object.keys(DIMENSIONS).map(k=>[k,{score:judgment.dimensions[k].score,
   evidence:judgment.dimensions[k].evidence,explanation:judgment.dimensions[k].explanation,
   confidence:judgment.dimensions[k].confidence,source:"automated-uncalibrated"}])),
  autoGateFindings:judgment.gates,
  // Only clear allegations cause automatic fails; a model's 'pass' never certifies privacy/safety.
  gates:Object.fromEntries(HARD_GATES.map(k=>[k,judgment.gates[k].finding==="fail"?false:null])),
  gateEvidence:Object.fromEntries(HARD_GATES.map(k=>[k,judgment.gates[k].evidence||""])),
  judge:{model:model||"gpt-4.1-mini",version:"qa-independent-v1",
   latencyMs:Date.now()-started,
   inputTokens:data.usage?.input_tokens??null,outputTokens:data.usage?.output_tokens??null,
   costUsd:null,summary:judgment.summary,
   calibrated:false,humanApproved:false},
  // Actual scene generation costs remain unknown until server-side usage is exported.
  costUsd:run.costUsd??null
 };
 enriched.previewEvaluation=evaluateRun(enriched);
 return enriched;
}
if(process.argv[1]&&new URL("file://"+process.argv[1]).pathname===new URL(import.meta.url).pathname){
 try{
  const file=process.argv[2];if(!file)throw Error("Usage: node quality-lab/judge.mjs qa-artifacts/qa-ID.json");
  if(process.env.ANTHOS_QA_ENABLE_JUDGE!=="1")throw Error("Set ANTHOS_QA_ENABLE_JUDGE=1 explicitly");
  const run=JSON.parse(await readFile(file,"utf8"));
  const outcome=await judgeSyntheticRun(run,{key:required("OPENAI_API_KEY"),model:process.env.ANTHOS_QA_JUDGE_MODEL});
  await writeFile(file,JSON.stringify(outcome,null,2)+"\n",{mode:0o600});
  process.stdout.write(JSON.stringify({artifact:file,qualityEstimate:outcome.previewEvaluation.weightedScore,
   status:outcome.previewEvaluation.status,needsHumanCalibration:true})+"\n");
 }catch(e){process.stderr.write(String(e.message)+"\n");process.exitCode=1}
}
