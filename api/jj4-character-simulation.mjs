// Anthos Deep Dive 4.0 — durable character autonomy and world-state contract.
// Reuses the original 3.x character-evolution design concept, but models
// choices and facts rather than numerical "relationship health" scores.
// State records only fictional behavior, never private real-couple data.
import {DIRECTED_SCENE_SCHEMA} from "./jj4-causality.mjs";

export const SIMULATION_VERSION="character-simulation-v1";
export const SIMULATION_SCHEMA={
 type:"object",additionalProperties:false,properties:{
  jack:{type:"object",additionalProperties:false,
   properties:{position:{type:"string",enum:["favor","oppose","conditional","undecided"]},
    emotion:{type:"string"},decisionEvidence:{type:"string"}},
   required:["position","emotion","decisionEvidence"]},
  jill:{type:"object",additionalProperties:false,
   properties:{position:{type:"string",enum:["favor","oppose","conditional","undecided"]},
    emotion:{type:"string"},decisionEvidence:{type:"string"}},
   required:["position","emotion","decisionEvidence"]},
  objectChanges:{type:"array",items:{type:"object",additionalProperties:false,
   properties:{id:{type:"string"},condition:{type:"string"},location:{type:"string"},
    actionEvidence:{type:"string"}},
   required:["id","condition","location","actionEvidence"]}},
  newEvent:{type:"object",additionalProperties:false,
   properties:{actor:{type:"string"},action:{type:"string"},evidence:{type:"string"}},
   required:["actor","action","evidence"]},
  humor:{type:"object",additionalProperties:false,
   properties:{attempted:{type:"boolean"},actionEvidence:{type:"string"},reactionEvidence:{type:"string"}},
   required:["attempted","actionEvidence","reactionEvidence"]},
  openThreads:{type:"array",items:{type:"string"}}
 },required:["jack","jill","objectChanges","newEvent","humor","openThreads"]
};
export const SIMULATION_SCENE_SCHEMA={
 type:"object",additionalProperties:false,
 properties:{...DIRECTED_SCENE_SCHEMA.properties,simulation:SIMULATION_SCHEMA},
 required:[...DIRECTED_SCENE_SCHEMA.required,"simulation"]
};

const limit=(x,n=250)=>typeof x==="string"?x.trim().slice(0,n):"";
const normalize=s=>limit(s,3000).toLowerCase().replace(/[‘’]/g,"'").replace(/[“”]/g,'"')
 .replace(/\s+/g," ").trim();
export function matchesEvidence(story,quote){
 const actual=normalize(quote),text=normalize(story);
 return actual.length>=12&&text.includes(actual);
}
// Models sometimes paraphrase the evidence field even when the SCENE itself is
// grounded. Fall back to an actual displayed action sentence, never to an
// invented or invisible event. Do not use this fallback for changed decisions.
export function observedEventExcerpt(story,priorEvents=[]){
 const sentences=String(story||"").replace(/\s+/g," ").match(/[^.!?]+[.!?]?/g)||[];
 const actor=/\b(?:jack|jill)\b/i;
 const verbs=/\b(?:said|says|asked|asks|called|calls|dialed|dials|moved|moves|opened|opens|picked|picks|placed|places|wrote|writes|put|sets|set|pointed|points|replied|replies|handed|hands|insists|refused|refuses|laughed|laughs|shook|pulls|pulled)\b/i;
 const words=x=>new Set(normalize(x).split(/[^a-z0-9]+/).filter(w=>w.length>3));
 const previous=(priorEvents||[]).map(x=>words(x.evidence||x.action||""));
 const shared=(a,b)=>a.size&&b.size?[...a].filter(w=>b.has(w)).length/Math.max(a.size,b.size):0;
 const candidates=sentences.map(x=>x.trim()).filter(x=>x.length>=24&&actor.test(x)&&verbs.test(x));
 const fresh=candidates.find(x=>previous.every(old=>shared(words(x),old)<0.65));
 return limit(fresh||candidates[0]||"",220);
}
export function simulationEnabled(room){
 // Only rooms that BEGIN with a pinned v1 state use the simulator. Previously
 // started V4 pilots must retain their historical engine and transcript.
 return room?.simulation_state?.version===SIMULATION_VERSION;
}
export function initialSimulation(episode={}){
 const isMicrowave=/four.hundred.dollar surprise/i.test(episode.title||"");
 const authored=episode.simulationSeed||{};
 const position=(v,fallback)=>["favor","oppose","conditional","undecided"].includes(v)?v:fallback;
 const characters={
  jack:{want:limit(authored.jackWant||episode.jackMotivation||"To be understood",240),
   position:position(authored.jackPosition,"undecided"),emotion:"guarded"},
  jill:{want:limit(authored.jillWant||episode.jillMotivation||"To be understood",240),
   position:position(authored.jillPosition,isMicrowave?"favor":"undecided"),emotion:"guarded"}
 };
 const initialObjects=isMicrowave?[{id:"replacement_box",condition:"sealed",location:"kitchen counter"}]:
   (Array.isArray(authored.objects)?authored.objects:[]).slice(0,8).map(x=>({
    id:limit(x.id,50),condition:limit(x.condition,100),location:limit(x.location,120)
   }));
 return {version:SIMULATION_VERSION,lastPhase:-1,
  centralChoice:limit(authored.centralChoice||(isMicrowave?
   "Whether to keep the $400 replacement microwave bought from emergency savings":
   episode.learningObjective||episode.premise||"The unresolved choice"),260),
  characters,objects:initialObjects,
  events:[],humorBeats:[],openThreads:(Array.isArray(authored.openThreads)?authored.openThreads:
   isMicrowave?["Decide whether to keep the replacement","Address the unconsulted withdrawal and overdue repair"]:
   ["Explore the central conflict"]).slice(0,8).map(x=>limit(x,200)),
  knownFacts:isMicrowave?[
   "Jill made the $400 purchase using shared emergency savings, without Jack's consent.",
   "Jack postponed repairing the original microwave for three weeks.",
   "A store's return policy, exact purchase date and professional repair cost are not yet known."
  ]:[]
 };
}
export function checkSimulationTransition(previous,proposal,story,phase){
 if(!previous||previous.version!==SIMULATION_VERSION||
    !Number.isInteger(phase)||previous.lastPhase!==phase-1)
  return {ok:false,reason:"The previous committed character-state version or phase is invalid."};
 if(!proposal?.jack||!proposal?.jill||!proposal?.newEvent)
  return {ok:false,reason:"The scene did not include a structured character proposal."};
 const next=structuredClone(previous),adjustments=[];
 const choiceWords=/\b(?:agree|accept|keep|return|won't|will not|refuse|change|decide|choose|want|no longer|still)\b/i;
 for(const role of ["jack","jill"]){
  const before=previous.characters[role],after=proposal[role];
  // The model may PROPOSE a changed position, but cannot declare a new
  // agreement without an evidenced explicit decision in the displayed scene.
  const acceptedChange=["favor","oppose","conditional","undecided"].includes(after.position)&&
   after.position!==before.position&&
   matchesEvidence(story,after.decisionEvidence)&&choiceWords.test(after.decisionEvidence);
  if(after.position!==before.position&&!acceptedChange)
   adjustments.push(role+" retained prior stance; claimed change lacked explicit scene evidence");
  next.characters[role]={...before,
   position:acceptedChange?after.position:before.position,
   emotion:limit(after.emotion||before.emotion,100)};
 }
 if(proposal.humor?.attempted&&
    matchesEvidence(story,proposal.humor.actionEvidence)&&
    matchesEvidence(story,proposal.humor.reactionEvidence))
  next.humorBeats=[...(previous.humorBeats||[]).slice(-7),{
   phase,action:limit(proposal.humor.actionEvidence,200),
   reaction:limit(proposal.humor.reactionEvidence,200)}];
 const updates=Array.isArray(proposal.objectChanges)?proposal.objectChanges.slice(0,8):[];
 for(const update of updates){
  const old=next.objects.find(x=>x.id===update?.id);
  if(!old||!matchesEvidence(story,update.actionEvidence)){
   adjustments.push("ignored unsupported object-state proposal");
   continue;
  }
  if(old.id==="replacement_box"){
   if(!["sealed","opened","resealed"].includes(update.condition)||
     (old.condition==="sealed"&&update.condition==="resealed")){
    adjustments.push("ignored impossible box-state transition");continue;
   }
   if(update.condition==="opened"&&!/\b(?:open(?:s|ed)?|cut|peel(?:s|ed)?|broke|breaks|remove(?:d|s)?|unbox(?:ed|es)?)\b/i.test(update.actionEvidence)){
    adjustments.push("ignored unproven box opening");continue;
   }
  }
  old.condition=limit(update.condition,100);
  old.location=limit(update.location,120);
 }
 const priorBox=previous.objects.find(x=>x.id==="replacement_box");
 const afterBox=next.objects.find(x=>x.id==="replacement_box");
 const opened=/\b(?:cut open|opened? (?:the )?(?:box|packaging|cardboard)|peel(?:ed|s)? (?:back|off) (?:the )?tape|broke (?:the )?seal|unboxed|pulled out the receipt from the box)\b/i;
 const resealed=/\b(?:resealed|sealed (?:the )?box (?:again|back)|retaped|taped (?:the )?box shut)\b/i;
 const claimsUnopened=/\b(?:unopened|still sealed|sealed box|box remains closed)\b/i;
 if(priorBox&&afterBox){
  if(priorBox.condition==="opened"&&claimsUnopened.test(story)&&!resealed.test(story))
   return {ok:false,reason:"An opened object was described as unopened without being resealed."};
  // An observable physical event outranks model-generated state labels.
  if(opened.test(story)&&afterBox.condition==="sealed"){
   afterBox.condition="opened";
   adjustments.push("visible box opening reconciled into world state");
  }
  if(priorBox.condition==="opened"&&resealed.test(story)){
   afterBox.condition="resealed";
   adjustments.push("visible resealing reconciled into world state");
  }
 }
 // An authored, structurally complete scene is itself the source of truth.
 // When the model paraphrases a citation, use a literal visible excerpt
 // instead of rejecting a coherent scene three times.
 const eventEvidence=matchesEvidence(story,proposal.newEvent.evidence)?
  limit(proposal.newEvent.evidence,220):
  observedEventExcerpt(story,previous.events)||
   limit(String(story||"").replace(/\s+/g," ").trim(),180);
 if(eventEvidence.length<12)
  return {ok:false,reason:"The generated scene contains no usable visible event."};
 next.lastPhase=phase;
 next.events=[...(previous.events||[]).slice(-17),{
  phase,actor:limit(proposal.newEvent.actor,50),
  action:matchesEvidence(story,proposal.newEvent.evidence)?
   limit(proposal.newEvent.action,300):eventEvidence,
  evidence:eventEvidence}];
 // An unresolved question never disappears merely because the narrator wants a
 // smooth ending. An eventual resolution needs an explicit confirmed choice.
 next.openThreads=[...new Set([...(previous.openThreads||[]),...
  (Array.isArray(proposal.openThreads)?proposal.openThreads:[]).map(x=>limit(x,200))])].slice(0,12);
 return {ok:true,state:next,event:next.events.at(-1),adjustments};
}
export const simulationInstructions=[
 "The simulation state is authoritative. Jack and Jill are independent fictional people with distinct persistent wants, beliefs, preferences and boundaries.",
 "The six-phase storyboard determines pacing, NOT whether their disagreement resolves. A final scene may end unresolved.",
 "The position values describe each character's stance on the centralChoice: favor, oppose, conditional, undecided. Never infer agreement from calmness, budgeting or willingness to listen.",
 "If a character's position changes, include a short EXACT excerpt of the visible scene containing an explicit decision; if unchanged use decisionEvidence as an empty string.",
 "objectChanges includes ONLY objects whose physical condition or location visibly changed. Use one exact evidence excerpt per changed object. If none changed, return [].",
 "Object changes must be earned: if the box is opened, it stays opened unless somebody visibly reseals it. Never say 'unopened' about an already opened box.",
 "newEvent must have an exact verbatim excerpt from the visible scene showing what happened THIS SCENE; do not replay previously completed calls.",
 "No outside pricing, refund deadlines, fees or retailer policies become facts without an actual credible in-story interaction. Unverified claims remain uncertainty.",
 "Characters may follow, resist, misunderstand, or reject coaching; the observable consequence must reflect their agency without silently rewriting the coach's request.",
 "Use character-driven humor when appropriate: a comic attempt must lead to an actual partner reaction, even irritation. If humor is inappropriate in this phase, set humor.attempted false and evidence fields to empty strings.",
 "Write ~75–110 words across opening, jackBeat, jillBeat, fallout. Avoid abstract emotional narration. Include a new tangible event. The narrator must never mention a past event as if it just happened again."
].join(" ");
