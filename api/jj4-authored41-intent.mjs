// Bounded 4.1 semantic coach interpretation. No story or dialogue generation.
// Return only an intent enum; authored dialogue and shared scenes remain local.
const SCHEMA={type:"object",additionalProperties:false,properties:{
 kind:{type:"string",enum:["engage","resist","unsafe","unclear"]},
 focus:{type:"string",enum:["own","explain","ask","none"]},
 motive:{type:"string",enum:["empathy","differentiation","followthrough","avoidance","none"]},
 confidence:{type:"number"}
},required:["kind","focus","motive","confidence"]};
const KINDS=new Set(SCHEMA.properties.kind.enum);
const FOCI=new Set(SCHEMA.properties.focus.enum);
const MOTIVES=new Set(SCHEMA.properties.motive.enum);
export async function classifyAuthoredAdviceWithModel({episode,role,phase,selected,text,fallback}){
 const safeFallback=fallback||{kind:"unclear",focus:null,motive:"none"};
 // Explicit confirmations inherit the selected choice, even when the model is available.
 // Do not let a short "Yep, tell her" create a contradictory semantic pivot.
 if(/^(?:yep|yes|yeah|right|exactly|okay|ok|sure|do it|go ahead)(?:[,.! ]*(?:tell|say|ask) (?:jack|jill|him|her|them))?[,.! ]*$/i.test(String(text||"").trim()))
  return {kind:"engage",focus:null,motive:"none"};
 const key=process.env.OPENAI_API_KEY?.trim();
 if(!key||safeFallback.kind==="unsafe")return safeFallback;
 try{
  const input={title:String(episode?.title||"").slice(0,140),
   stage:Math.max(0,Math.min(3,Number(phase)||0))+1,
   character:role==="jill"?"Jill":"Jack",
   currentQuestion:String(episode?.authored41?.coachingCheckpoints?.[role]?.[phase]?.prompt||
    episode?.authored41?.roles?.[role]?.prompts?.[phase]||"").slice(0,450),
   chosenApproach:String(selected?.label||"").slice(0,110),
   userAdvice:String(text||"").slice(0,900)};
  const response=await fetch("https://api.openai.com/v1/responses",{
   method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
   body:JSON.stringify({
    model:process.env.ANTHOS_JJ4_INTENT_MODEL?.trim()||"gpt-4.1-mini",
    store:false,max_output_tokens:180,
    instructions:[
     "Classify the meaning of a HUMAN coach's private message to one FICTIONAL character.",
     "No dialogue, narrative, facts, advice, personal data, reasoning text or quoted user words in your output.",
     "kind=engage only for sincere, constructive behavior; resist for blame, refusal, or insincere compliance merely to shut down the spouse.",
     "kind=unsafe for promoting violence, intimidation, coercion or threats; a prohibition against threats is constructive, not unsafe.",
     "kind=unclear when there is no reliably actionable direction. Give focus=none unless an explicit direction is understood.",
     "focus=own for an apology, acknowledging responsibility, or taking an accountable action;",
     "focus=explain for respectful disclosure of concerns/boundaries;",
     "focus=ask for active listening, questions, seeking consent, or inviting a genuine joint decision.",
     "motive=empathy for helping the spouse feel heard; differentiation for recognizing a boundary without surrendering individuality;",
     "followthrough for a concrete, credible action; avoidance for superficial compliance to end the conflict; else none.",
     "A message can revise the chosen approach; classify the actual advice, not the button choice.",
     "Return ONLY the strict schema with confidence 0 to 1."
    ].join(" "),
    input:JSON.stringify(input),
    text:{format:{type:"json_schema",name:"anthos_jj41_coaching_intent",strict:true,schema:SCHEMA}}
   }),signal:AbortSignal.timeout(9000)
  });
  if(!response.ok)return safeFallback;
  const parsed=await response.json();
  const raw=(parsed.output||[]).flatMap(x=>x.content||[])
   .filter(x=>x.type==="output_text").map(x=>x.text).join("");
  const value=JSON.parse(raw);
  if(!KINDS.has(value.kind)||!FOCI.has(value.focus)||!MOTIVES.has(value.motive)||
   typeof value.confidence!=="number"||value.confidence<0||value.confidence>1)return safeFallback;
  if(value.confidence<0.70)return {kind:"unclear",focus:null,motive:"none"};
  if(value.kind==="engage"&&value.motive==="avoidance")
   return {kind:"resist",focus:null,motive:"avoidance"};
  return {kind:value.kind,focus:value.focus==="none"?null:value.focus,motive:value.motive};
 }catch{return safeFallback}
}
