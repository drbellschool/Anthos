// Anthos 4.3 incidental skill coding. The 3 episode skills remain the focus;
// incidental observations never create a new weekly objective or mandatory text.
import {SKILLS} from "./episode-studio.mjs";
import {incidentalIntimacyReview,SELECTED_MICROWAVE_SKILLS} from "./insight-atlas-model.mjs";
const catalog=Object.fromEntries(SKILLS.map(x=>[x.id,x]));
const bounded=s=>String(s||"").slice(0,1000);
function fallback(coaching,event){
 const out=[];
 for(const [lane,text] of [["coaching",coaching],["character",event]]){
  if(!text)return;
  const x=incidentalIntimacyReview(text);
  for(const r of x.observations||[]){
   out.push({lane,skillId:r.skillId,rating:r.rating,confidence:r.confidence,
    quote:text,explanation:lane==="coaching"?
     "Instructional advice about whether intimacy is owed as payment.":
     "Canonical character action mentioning transactional intimacy.",
    interpretation:x.interpretation==="rejects-transaction"?"refused":
     x.interpretation==="joke-with-instruction"?"joke":"observed",
    safetyFlag:x.safetyFlag});
  }
 }
 return out;
}
export function validateIncidental43(items,coaching,event,selected=SELECTED_MICROWAVE_SKILLS){
 const unique=new Set(),out=[];
 for(const v of Array.isArray(items)?items:[]){
  if(!["coaching","character"].includes(v?.lane))continue;
  const source=v.lane==="coaching"?coaching:event;
  if(!source||!catalog[v.skillId]||selected.includes(v.skillId))continue;
  const quote=String(v.quote||"").trim();
  if(quote.length<4||quote.length>900||!source.includes(quote))continue;
  if(!Number.isInteger(v.rating)||v.rating<1||v.rating>5||
   typeof v.confidence!=="number"||v.confidence<0.6||v.confidence>1)continue;
  const id=v.lane+":"+v.skillId;
  if(unique.has(id))continue;unique.add(id);
  out.push({lane:v.lane,skillId:v.skillId,rating:v.rating,
   confidence:v.confidence,quote,
   explanation:bounded(v.explanation||"Observed incidental skill signal.").slice(0,180),
   interpretation:["observed","ambiguous","quoted","joke","negated","refused"].includes(v.interpretation)?
     v.interpretation:"observed",
   safetyFlag:typeof v.safetyFlag==="string"?v.safetyFlag.slice(0,90):null});
  if(out.length>=6)break;
 }
 return out;
}
export async function classifyIncidental43(coaching,event,{
 apiKey,model="gpt-4.1-mini",fetchImpl=fetch,selected=SELECTED_MICROWAVE_SKILLS
}={}){
 const base=validateIncidental43(fallback(coaching,event),coaching,event,selected);
 if(!apiKey)return base;
 const skills=SKILLS.filter(x=>!selected.includes(x.id)).map(({id,title,description})=>({id,title,description}));
 try{
  const res=await fetchImpl("https://api.openai.com/v1/responses",{
   method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
   body:JSON.stringify({model,store:false,max_output_tokens:800,
    instructions:"You annotate a fictional marriage learning story using ONLY the supplied skill codebook. Identify up to 3 incidental skills from the coach's actual advice and up to 3 separately from the VERIFIABLE canonical character event, if and only if text demonstrates the skill. Use 1–5 anchored behavior observations, not a global marriage score. Exact quote must be a verbatim substring of the corresponding source. Never infer a fictional enacted behavior solely from coaching. A crude joke with no literal recommendation is not coercion; a recommendation to make sex a payment is a poor nontransactional-intimacy observation regardless of humor. An actual boundary violation remains a separate safety concern. Do not classify the selected weekly skills as incidental. Do not force observations where none exist. Output concise justifications.",
    input:JSON.stringify({coachingText:bounded(coaching),verifiedCharacterEvent:bounded(event),skills}),
    text:{format:{type:"json_schema",name:"jj43_incidental_skills",strict:true,
     schema:{type:"object",additionalProperties:false,required:["items"],properties:{
      items:{type:"array",maxItems:6,items:{type:"object",additionalProperties:false,
       required:["lane","skillId","rating","confidence","quote","explanation","interpretation","safetyFlag"],
       properties:{lane:{type:"string",enum:["coaching","character"]},
        skillId:{type:"string",enum:skills.map(x=>x.id)},
        rating:{type:"integer",minimum:1,maximum:5},
        confidence:{type:"number",minimum:0,maximum:1},
        quote:{type:"string"},explanation:{type:"string"},
        interpretation:{type:"string",enum:["observed","ambiguous","quoted","joke","negated","refused"]},
        safetyFlag:{type:["string","null"]}}}}}}}}}),
   signal:AbortSignal.timeout(8000)});
  if(!res.ok)return base;
  const json=await res.json();const raw=(json.output||[]).flatMap(x=>x.content||[])
   .filter(x=>x.type==="output_text").map(x=>x.text).join("");
  const returned=validateIncidental43(JSON.parse(raw)?.items,coaching,event,selected);
  // Retain conservative safety-sensitive recognition in case model misses it.
  const have=new Set(returned.map(x=>x.lane+":"+x.skillId));
  return [...returned,...base.filter(x=>!have.has(x.lane+":"+x.skillId))].slice(0,6);
 }catch{return base}
}
