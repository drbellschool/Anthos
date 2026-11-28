// Storybook Director: private planning, evidence-grounded review, and compact committed world state.
const str={type:"string"},arr=items=>({type:"array",items}),obj=properties=>({type:"object",properties,required:Object.keys(properties),additionalProperties:false});
const intent=obj({id:str,intention:str,action:str});
export const DIRECTOR_SCHEMA=obj({jack:arr(intent),jill:arr(intent),time:str,location:str,newEvent:str,consequence:str,ending:str});
const evidence=obj({id:str,disposition:{type:"string",enum:["incorporated","adapted","resisted","ignored"]},quote:str});
export const DIRECTOR_REVIEW_SCHEMA=obj({pass:{type:"boolean"},issues:arr(str),jack:arr(evidence),jill:arr(evidence),newEventQuote:str,world:obj({time:str,location:str,change:str,commitments:str}),endingQuote:str});
export const CHARACTER_BIBLE44={
 jack:"Adult married man; capable, practical, loyal, sometimes overconfident or defensive; dry humor and self-deprecation. Takes responsibility or faces consequences; never a caricature.",
 jill:"Adult married woman; resourceful, perceptive, warm, independent, sometimes impatient or defensive; quick wit and affectionate teasing. Has her own agency, motives and flaws.",
 sophia:"Warm, witty, observant storyteller; notices specific actions and their effects, not a clinical evaluator.",
 shared:"Both adults can initiate, disagree, repair, express desire and change their minds. Neither owes affection or intimacy. Use episode-specific motivations to add nuance."
};
export function scopeOpening44(editorial){
 // Old one-scene instructions were designed to prevent repeated arrivals, not to forbid future developments.
 const out={...editorial};
 for(const key of ["premise","setting","creativeDirection"]){
  if(typeof out[key]!=="string")continue;
  out[key]=out[key].replace(/This is one uninterrupted evening with one purchase, not a recurring arrival\./gi,"The purchase and arrival occur once. The opening takes place that evening; later scenes may progress in time and place.").replace(/Stage six continuous developments in one kitchen\./gi,"Start in the kitchen; later scenes may move naturally in time and location.");
 }
 return out;
}
const short=(v,n)=>typeof v==="string"&&v.trim().length>0&&v.length<=n;
export function planIssues44(plan,day){
 const issues=[];
 if(!plan)return ["Missing story direction."];
 for(const role of ["jack","jill"]){
  const a=plan[role];
  if(!Array.isArray(a)||a.length>(day?6:0)||(day&&a.length===0)){issues.push("Director must account for "+role+" contribution.");continue}
  if(a.some((x,i)=>x.id!==role+"-"+(i+1)||!short(x.intention,200)||!short(x.action,240)))issues.push("Invalid "+role+" intent plan.");
 }
 for(const k of ["time","location","newEvent","consequence","ending"])if(!short(plan[k],600))issues.push("Invalid director field "+k+".");
 return issues;
}
const normalize=s=>String(s||"").normalize("NFKC").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g," ").trim().toLowerCase();
const inStory=(quote,story)=>short(quote,160)&&normalize(quote).length>=12&&normalize(story).includes(normalize(quote));
export function directorReviewIssues44(review,plan,page,day){
 const problems=[];
 if(!review||review.pass!==true||!Array.isArray(review.issues)||review.issues.length)problems.push(...(Array.isArray(review?.issues)&&review.issues.length?review.issues:["Director review did not approve the scene."]));
 for(const role of ["jack","jill"]){
  const expected=plan[role],actual=day===0?[]:review?.[role];
  if(!Array.isArray(actual)||actual.length!==expected.length){problems.push("Missing "+role+" intent evidence.");continue}
  for(const intent of expected){
   const matches=actual.filter(x=>x.id===intent.id);
   if(matches.length!==1||!["incorporated","adapted","resisted"].includes(matches[0].disposition)||!inStory(matches[0].quote,page.story))problems.push("Show a concrete consequence for "+intent.id+"; provide a literal quote from the story.");
  }
 }
 if(!inStory(review?.newEventQuote,page.story))problems.push("Prove the new event with an exact story quote.");
 if(day===5&&!inStory(review?.endingQuote,page.story))problems.push("Prove the central outcome with an exact story quote.");
 for(const [key,max] of Object.entries({time:48,location:48,change:100,commitments:100}))if(!short(review?.world?.[key],max))problems.push("Missing or overlong committed world field: "+key);
 return problems;
}
export function compactDirector44(review){
 const codes={incorporated:"I",adapted:"A",resisted:"R"};
 return {w:[review.world.time,review.world.location,review.world.change,review.world.commitments],j:review.jack.map(x=>codes[x.disposition]).join(""),l:review.jill.map(x=>codes[x.disposition]).join("")};
}
export function normalizePlan44(plan,day){
 if(!plan||typeof plan!=="object")return plan;
 const out={...plan};
 for(const role of ["jack","jill"]){
  if(day===0){out[role]=[];continue}
  if(Array.isArray(out[role]))out[role]=out[role].map((x,i)=>({...x,id:role+"-"+(i+1)}));
 }
 return out;
}
export async function directStory44(input,day,generate){
 let feedback=[],previousPlan;
 for(let i=0;i<2;i++){
  const plan=await generate({name:"jj44_director",schema:DIRECTOR_SCHEMA,input:{...input,dayIndex:day,hasContributions:day>0,characterBible:CHARACTER_BIBLE44,feedback,previousPlan},instructions:(day===0?"OPENING ONLY. There are no author contributions. Return jack:[] and jill:[]; do not invent coaching. ":"CONTINUATION. Each author has a real contribution; return 1–6 intentions for each. Intention <=200 characters, action <=240. " )+"Every time, location, newEvent, consequence and ending field must be a nonempty string of at most 600 characters. Aim under 160. You are the story director, not a therapist or prose writer. Treat old premise/setting/phase notes as opening guidance unless a genuine story fact or safety boundary; never repeat the initial purchase. Allow new times, places, plausible supporting characters, surprises and consequences. Preserve committed facts and knowledge. For each author, identify each material requested action separately (maximum six combined related intentions per role), resolve brief answers against previousPrompts, and assign IDs jack-1, jack-2 or jill-1 etc. Every intention needs an observable action, adaptation or credible resistance in the next scene. Never silently omit romance or harmless creative ideas. Respect consent; do not make intimacy payment for chores or portray coercion as desirable. Non-explicit romance and conversations about sexuality are welcome. If the suggestion is harmful, dramatize a safe response or consequence. Do not invent an obligation to fix dangerous appliances; use a qualified professional if needed. Monday arrays empty. Specify the fictional time/location, one genuinely NEW event, its concrete consequence, and the scene ending. Saturday must close the central dramatic question with action or a specific mutually agreed plan, not another vague promise. Keep fields concise."});
  const normalized=normalizePlan44(plan,day);
  feedback=planIssues44(normalized,day);if(!feedback.length)return normalized;
  previousPlan=normalized;
  // Only validator-generated field names, never model content or private advice.
  console.warn("[jj44-director] "+JSON.stringify({day,attempt:i+1,issues:feedback}));
 }
 if(day===0){
  // No author input exists yet. Use opening guidance rather than making mechanical planning a launch gate.
  console.warn("[jj44-director] "+JSON.stringify({day,code:"OPENING_GUIDANCE_FALLBACK"}));
  return {jack:[],jill:[],time:"Opening time established by the premise",location:"Opening setting established by the premise",newEvent:"Dramatize the initial dilemma once, from both characters’ perspectives.",consequence:"Reveal the stakes through concrete action or dialogue.",ending:"Leave each author a distinct consequential choice."};
 }
 throw Error("Story director could not produce a valid plan. Retry the same page.");
}
