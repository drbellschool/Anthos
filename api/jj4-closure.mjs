// Version 4.0 Sophia epilogue — independent of the six authored story phases.
// Summarizes only FICTIONAL shared story beats. Credible research annotations
// are controlled by this module rather than invented by the language model.
export const RESEARCH_SOURCES=Object.freeze([
 {label:"Gottman Institute · Emotional bids and turning toward",url:"https://www.gottman.com/blog/an-introduction-to-emotional-bids-and-trust/"},
 {label:"Schnarch · Differentiation framework (author interview)",url:"https://www.soundstrue.com/a/resources/transcript/emotional-commitment-and-great-sex/"},
 {label:"Aron et al. (2000) · Shared novel activities",url:"https://pubmed.ncbi.nlm.nih.gov/10707334/"}
]);
const clean=(value,max)=>typeof value==="string"?value.trim().slice(0,max):"";
const EPILOGUE_SCHEMA={type:"object",additionalProperties:false,
 properties:{observation:{type:"string"},practice:{type:"string"},evidence:{type:"string"}},
 required:["observation","practice","evidence"]};
const targetedEpisode=episode=>episode?.title==="The Four-Hundred-Dollar Surprise";

const norm=s=>String(s||"").normalize("NFKC").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g," ").trim().toLowerCase();
export function validateClosureEvidence(generated,sharedScenes=[]){
 const evidence=norm(generated?.evidence);
 if(evidence.length<18)return {ok:false,reason:"missing ending evidence"};
 // Evidence from Outcome / Reflection is essential: an earlier proposed compromise
 // may have been reversed and is not a valid description of the actual ending.
 const finalScenes=sharedScenes.filter(s=>s.phase_index>=4).slice(-2);
 if(!finalScenes.some(s=>norm(s.body).includes(evidence)))
  return {ok:false,reason:"closing evidence not in actual ending"};
 const ending=norm(finalScenes.map(s=>s.body).join(" "));
 const claim=norm(generated?.observation);
 if(!claim)return {ok:false,reason:"empty observation"};
 // The narrator may describe an offer or unilateral decision, but cannot
 // upgrade it to mutual consent without a visible two-person acceptance.
 const consensus=/\b(?:they agreed|both agreed|mutually agreed|jointly decided|they decided together)\b/;
 const groundedAgreement=/\b(?:they agreed|both agreed|jack agreed and jill agreed|jill agreed and jack agreed|both said yes)\b/;
 if(consensus.test(claim)&&!groundedAgreement.test(ending))
  return {ok:false,reason:"unearned mutual agreement in closure"};
 if(/\b(?:unopened|still sealed|remains sealed|sealed box)\b/.test(claim)&&
  /\b(?:opened the box|broke the seal|lifted the lid|snapped the tape|unboxed)\b/.test(ending)&&
  !/\b(?:resealed|taped the box shut)\b/.test(ending))
  return {ok:false,reason:"closure reverses the opened box state"};
 return {ok:true};
}

/**
 * Conservative factual fallback when the AI closure cannot be verified.
 * Copy short, COMPLETE observable sentences from the actual outcome and
 * reflection; never substitute generic intimacy content for another petal.
 */
export function groundedClosureFallback(episode,sharedScenes=[]){
 const final=Array.isArray(sharedScenes)?sharedScenes
  .filter(x=>typeof x?.body==="string"&&x.body.trim()&&Number(x.phase_index)>=4)
  .sort((a,b)=>a.phase_index-b.phase_index).slice(-2):[];
 const excerpts=[];
 for(const scene of final){
  const sentences=String(scene.body).replace(/\s+/g," ").trim()
   .match(/[^.!?]+(?:[.!?]+(?:[”"']|$)?|$)/g)||[];
  // Extract narration or a fully closed quoted line. A quotation mark
  // left hanging by sentence segmentation is not a usable Sophia sentence.
  const candidate=sentences.map(x=>x.trim()).find(x=>{
   if(x.length<28||x.length>220||!/\b(?:Jack|Jill)\b/i.test(x))return false;
   const asciiQuotes=(x.match(/"/g)||[]).length;
   const typographicOpen=(x.match(/“/g)||[]).length;
   const typographicClose=(x.match(/”/g)||[]).length;
   return asciiQuotes%2===0&&typographicOpen===typographicClose;
  });
  if(candidate)excerpts.push(candidate);
 }
 if(excerpts.length){
  // Use a colon so actor names keep correct capitalization.
  const grounded=excerpts.slice(-2).join(" ");
  return "The ending showed these moments: "+grounded;
 }
 // Without evidence, do NOT guess at a particular character decision.
 const topic=clean(episode?.title,110)||"this disagreement";
 return "Jack and Jill faced the unresolved choices in "+topic+
  ". Their next steps must depend on what they actually say and do, not an assumed agreement.";
}

function completeSentence(text,max,fallback){
 const source=String(text||"").trim();
 if(!source)return fallback;
 const clipped=source.slice(0,max);
 if(source.length<=max&&/[.!?][”"']?$/.test(source))return source;
 const matches=[...clipped.matchAll(/[.!?](?=\s|$)/g)];
 const last=matches.at(-1);
 return last&&last.index>30?clipped.slice(0,last.index+1):fallback;
}
function specificClosing(episode,generated,sharedScenes=[]){
 const observation=completeSentence(generated.observation,430,
  sharedScenes.length?groundedClosureFallback(episode,sharedScenes):
  "Jill bought a $400 microwave from shared savings after Jack repeatedly delayed a repair. Their choices exposed a disagreement about urgency and shared decisions; any resolution must come from what they actually did.");
 const practice=completeSentence(generated.practice,250,
  "Ask what both of you need after a significant shared purchase, then identify one concrete next step without presuming consent.");
 return "SOPHIA · A CLOSING THOUGHT\n\n"+
  "What happened: "+observation+"\n\n"+
  "The skill connection: Facing a hard decision means owning your part without controlling the other person. A gentle startup raises a concern without blame; accepting influence means considering a partner's actual reasons.\n\n"+
  "One thing to try: "+practice+"\n\n"+
  "The story is fictional and its ending is not a grade on your marriage.";
}
export function composeSophiaClosure(episode,generated={},sharedScenes=[]){
 if(targetedEpisode(episode))return specificClosing(episode,generated,sharedScenes);
 const observation=clean(generated.observation,460)||
  groundedClosureFallback(episode,sharedScenes);
 const lens=String(episode?.primarySkill||"");
 const practice=clean(generated.practice,320)||
  (lens.startsWith("a-")?
   "Ask what each of you would enjoy about an optional new shared experience, including what you would rather not do.":
   lens==="g-repair"||lens==="g-start"?
   "Name one repair that was actually attempted, and ask what small concrete step each person could voluntarily try next.":
   "Ask what changed in each person's interpretation, then invite one specific next action without assuming agreement.");
 const science=lens.startsWith("a-")?
  "Aron and colleagues studied how mutually welcome novel shared activities can influence short-term reports of relationship quality [3].":
  lens.startsWith("s-")?
  "Schnarch's differentiation framework describes staying connected while expressing distinct needs; this is a theoretical clinical framework, not a score [2].":
  "Gottman's observational work discusses bids for connection and the importance of how partners respond to them [1].";
 const result="SOPHIA · A CLOSING THOUGHT\n\n"+
  "What I noticed: "+observation+"\n\n"+
  "The research connection: "+science+"\n\n"+
  "One small thing to try: "+practice+"\n\n"+
  "Jack and Jill are fictional. Their ending isn't a grade or a prediction about your marriage. The references below are there if you'd like to explore the ideas.";
 return result.slice(0,2400);
}
export async function draftSophiaClosure(episode,sharedScenes){
 const key=process.env.OPENAI_API_KEY?.trim();
 if(!key)return composeSophiaClosure(episode,{},sharedScenes);
 const input={
  title:episode.title,
  learningObjective:episode.learningObjective,
  researchNotes:episode.researchNotes,
  closureCriteria:episode.closureCriteria,
  reflectionPrompt:episode.reflectionPrompt,
  scenes:sharedScenes.map(s=>({phase:s.phase_index,story:s.body})).slice(-6)
 };
 const instructions=[
  "You write Sophia's warm, human closing reflection for an Anthos marriage-enrichment FICTIONAL episode.",
  "The six authored stages are over. You are not another narrator, not Jack, not Jill, and not a therapist.",
  "Summarize one specific observable learning moment from the supplied fictional shared scenes. Do not invent additional events, achievements, coaching messages, motives or a perfect relationship outcome.",
  "Choose one short verbatim excerpt from the last two scenes (Outcome or Reflection) that proves the consequence you describe. Return it as evidence. If they reversed an earlier plan, describe the final action, not the earlier plan. Never infer agreement from calm words or claim a closed box after it was opened.",
  "Only Jack and Jill are story characters; never describe the real husband or wife as if they were characters.",
  "Offer one realistic, consent-respecting, low-pressure practice for two people to discuss in real life. Respect autonomy and the ability to say no. No quizzes or relationship scores.",
  "Do not write research claims or bibliographies; the application adds accurately attributed educational research context itself.",
  targetedEpisode(episode)?"Return two complete concise fields: observation 30–55 words about the NEW consequences and the actual ending, and practice one practical invitation of 15–30 words. Do not recap all six scenes or promise a happy resolution.":"Return two short fields: observation (45–80 words grounded in the story) and practice (one concrete invitation, 20–45 words).",
  "Avoid empty praise, glib humor, cheesy metaphors, shaming, overpromises, and diagnosing a couple."
 ].join(" ");
 const model=process.env.ANTHOS_JJ4_MODEL?.trim()||process.env.OPENAI_MODEL?.trim()||"gpt-4.1-mini";
 let failedReason="",failedDraft=null;
 // At most one targeted evidence repair. Never accept invented closure facts
 // simply to avoid a second provider call; the final fallback is grounded.
 for(let attempt=0;attempt<2;attempt++){
  try{
   const nextInput=attempt===0?input:{
    ...input,priorRejectedDraft:failedDraft,reasonRejected:failedReason,
    realFinalActions:sharedScenes.filter(x=>x.phase_index>=4).slice(-2)
     .map(x=>({phase:x.phase_index,body:x.body}))
   };
   const res=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({model,store:false,
     instructions:instructions+(attempt===0?"":" EVIDENCE REPAIR: Your previous observation was rejected. This time anchor the central claim to a VERBATIM 18+ character excerpt from Outcome or Reflection and make that exact excerpt the evidence field. Do not paraphrase the evidence, invent a new event, or imply mutual agreement not visibly accepted."),
     input:JSON.stringify(nextInput),max_output_tokens:650,
     text:{format:{type:"json_schema",name:"jj4_sophia_closure",strict:true,schema:EPILOGUE_SCHEMA}}}),
    signal:AbortSignal.timeout(30000)
   });
   if(!res.ok)break;
   const data=await res.json();
   const raw=(data.output||[]).flatMap(x=>x.content||[])
    .filter(x=>x.type==="output_text").map(x=>x.text).join("");
   const parsed=JSON.parse(raw);
   const verdict=validateClosureEvidence(parsed,sharedScenes);
   if(verdict.ok)return composeSophiaClosure(episode,parsed,sharedScenes);
   failedDraft=parsed;failedReason=verdict.reason;
  }catch{break}
 }
 return composeSophiaClosure(episode,{},sharedScenes);
}
