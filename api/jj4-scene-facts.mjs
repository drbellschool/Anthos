// Internal, evidence-grounded Who/What/Where/When/Why ledger for JJ4.
// Only committed fictional scene facts are stored here. Private coach messages
// and speculative model metadata are never accepted as facts.
const compact=(v,n=180)=>typeof v==="string"?v.replace(/\s+/g," ").trim().slice(0,n):"";
const norm=v=>compact(v,6000).toLowerCase().replace(/[’‘]/g,"'").replace(/[“”]/g,'"');
const quoteExists=(story,quote)=>compact(quote).length>=12&&norm(story).includes(norm(quote));
const timeMarker=/\b(?:morning|afternoon|evening|tonight|night|noon|midnight|today|tomorrow|yesterday|later|earlier|before|after|then|hours?|minutes?|seconds?|next\s+day|following\s+day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b\d{1,2}(?::\d\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/i;
const safeId=x=>/^[a-z][a-z0-9_]{1,55}$/.test(x);
export const SCENE_METADATA_SCHEMA={
 type:"object",additionalProperties:false,properties:{
  when:{type:"object",additionalProperties:false,
   properties:{label:{type:"string"},evidence:{type:"string"},
    kind:{type:"string",enum:["current","future_reference","unspecified"]}},
   required:["label","evidence","kind"]},
  objectsIntroduced:{type:"array",items:{type:"object",additionalProperties:false,
   properties:{id:{type:"string"},label:{type:"string"},condition:{type:"string"},
    location:{type:"string"},evidence:{type:"string"}},
   required:["id","label","condition","location","evidence"]}}
 },required:["when","objectsIntroduced"]
};
// The model proposes labels, but only verbatim story evidence can introduce an
// object or a time anchor; inferred details remain "unknown", never invented.
export function saveSceneFacts(state,proposal={},story="",phase=0,{coachedRoles=[],coachingTrace={}}={}){
 const metadata=proposal&&typeof proposal==="object"?proposal:{};
 const adjustments=[], objects=state.objects||[];
 for(const item of Array.isArray(metadata.objectsIntroduced)?metadata.objectsIntroduced.slice(0,16):[]){
  const id=compact(item?.id,55),label=compact(item?.label,80);
  const evidence=compact(item?.evidence,220);
  if(objects.length>=32)break;
  if(!safeId(id)||label.length<3||!quoteExists(story,evidence)||!norm(evidence).includes(norm(label))){
   adjustments.push("ignored object introduction without visible evidence");
   continue;
  }
  if(objects.some(x=>x.id===id||norm(x.label||"")===norm(label)))continue;
  const suggestedPlace=compact(item.location,120);
  const suggestedCondition=compact(item.condition,100);
  objects.push({id,label,
   location:suggestedPlace&&norm(evidence).includes(norm(suggestedPlace))?suggestedPlace:"unknown",
   condition:suggestedCondition&&norm(evidence).includes(norm(suggestedCondition))?suggestedCondition:"unspecified",
   firstSeenPhase:phase,lastChangedPhase:phase});
 }
 // If the scene model omits metadata, still remember visible physical props.
 // Record identity only; condition/location remain unknown unless witnessed.
 const props=[
  ["receipt",/\breceipt\b/i],
  ["repair_note",/\b(?:repair note|fix it saturday.{0,7}note|note on the broken microwave|taped note)\b/i],
  ["phone",/\bphone\b/i],
  ["calendar",/\bcalendar\b/i],
  ["keys",/\bkeys\b/i],
  ["watch",/\bwatch\b/i],
  ["mug",/\bmug\b/i]
 ];
 for(const [id,pattern] of props){
  if(objects.length>=32)break;
  const mentioned=String(story||"").match(pattern);
  if(!mentioned)continue;
  const label=mentioned[0];
  const aliases={
   receipt:/\breceipt\b/i,repair_note:/\bnote\b/i,phone:/\bphone\b/i,
   calendar:/\bcalendar\b/i,keys:/\bkeys\b/i,watch:/\bwatch\b/i,mug:/\bmug\b/i
  };
  if(objects.some(x=>x.id===id||aliases[id].test(x.label||"")))continue;
  objects.push({id,label,location:"unknown",condition:"unspecified",
   firstSeenPhase:phase,lastChangedPhase:phase});
  adjustments.push("recognized visible physical prop without model metadata");
 }
 const event=state.events?.at(-1)||{};
 const lastWhen=state.sceneFacts?.at(-1)?.when||{anchor:"time not established",asOfPhase:-1,evidence:""};
 const proposedTime=metadata.when||{};
 const timeEvidence=compact(proposedTime.evidence,200);
 const groundedTime=quoteExists(story,timeEvidence)&&timeMarker.test(timeEvidence);
 const kind=proposedTime.kind||"current"; // old manually seeded QA data
 const currentTime=groundedTime&&kind==="current";
 const futureReferences=[...(lastWhen.futureReferences||[]).slice(-3)];
 if(groundedTime&&kind==="future_reference"&&!futureReferences.includes(timeEvidence))
  futureReferences.push(timeEvidence);
 const when={...(currentTime?
   {anchor:timeEvidence,asOfPhase:phase,evidence:timeEvidence}:lastWhen),
   futureReferences:futureReferences.slice(-4)};
 if(proposedTime.label&&!groundedTime)adjustments.push("ignored time claim without visible evidence");
 const roles=["jack","jill"];
 const who=roles.map(role=>({character:role==="jack"?"Jack":"Jill",
  location:compact(state.actorLocations?.[role]?.place||"unknown",80),
  position:compact(state.characters?.[role]?.position||"undecided",30)}));
 const why=Object.fromEntries(roles.map(role=>[role,{
  want:compact(state.characters?.[role]?.want,180),
  belief:compact(state.characters?.[role]?.belief,180),
  feltCost:compact(state.characters?.[role]?.feltCost,160),
  // Only the visible result of a private coaching checkpoint is recorded.
  // The private advice itself is never copied into a shared scene or ledger.
  coachedEffect:coachedRoles.includes(role)&&quoteExists(story,coachingTrace?.[role+"Evidence"])?
   compact(coachingTrace[role+"Evidence"],190):""
 }]));
 const snapshot={
  phase,who,
  what:{actor:compact(event.actor,50),action:compact(event.action,300),
   evidence:compact(event.evidence,200)},
  where:{jack:compact(state.actorLocations?.jack?.place||"unknown",80),
   jill:compact(state.actorLocations?.jill?.place||"unknown",80)},
  when,why,
  objects:objects.slice(0,32).map(x=>({id:compact(x.id,55),
   label:compact(x.label||x.id,80),location:compact(x.location||"unknown",120),
   condition:compact(x.condition||"unspecified",100),
   firstSeenPhase:x.firstSeenPhase??-1,lastChangedPhase:x.lastChangedPhase??-1}))
 };
 state.sceneFacts=[...(state.sceneFacts||[]).slice(-5),snapshot];
 return {state,adjustments};
}
export function sceneFactsForAI(state){
 // Send three concise scene summaries and ONE live object registry;
 // do not repeat 32 full object snapshots on every next AI call.
 return {recentScenes:(state?.sceneFacts||[]).slice(-3).map(({objects,...facts})=>facts),
  trackedObjects:(state?.objects||[]).slice(0,32),
  currentLocations:state?.actorLocations||{},
  openThreads:(state?.openThreads||[]).slice(0,8)};
}
