// Anthos Deep Dive 4.0 — durable character autonomy and world-state contract.
// Reuses the original 3.x character-evolution design concept, but models
// choices and facts rather than numerical "relationship health" scores.
// State records only fictional behavior, never private real-couple data.
import {DIRECTED_SCENE_SCHEMA} from "./jj4-causality.mjs";
import {initialActorLocations,validateActorLocations} from "./jj4-actor-state.mjs";

export const SIMULATION_VERSION="character-simulation-v1";
export const SIMULATION_SCHEMA={
 type:"object",additionalProperties:false,properties:{
  jack:{type:"object",additionalProperties:false,
   properties:{position:{type:"string",enum:["favor","oppose","conditional","undecided"]},
    emotion:{type:"string"},decisionEvidence:{type:"string"},
    belief:{type:"string"},beliefEvidence:{type:"string"},
    feltCost:{type:"string"},costEvidence:{type:"string"}},
   required:["position","emotion","decisionEvidence","belief","beliefEvidence","feltCost","costEvidence"]},
  jill:{type:"object",additionalProperties:false,
   properties:{position:{type:"string",enum:["favor","oppose","conditional","undecided"]},
    emotion:{type:"string"},decisionEvidence:{type:"string"},
    belief:{type:"string"},beliefEvidence:{type:"string"},
    feltCost:{type:"string"},costEvidence:{type:"string"}},
   required:["position","emotion","decisionEvidence","belief","beliefEvidence","feltCost","costEvidence"]},
  objectChanges:{type:"array",items:{type:"object",additionalProperties:false,
   properties:{id:{type:"string"},condition:{type:"string"},location:{type:"string"},
    actionEvidence:{type:"string"}},
   required:["id","condition","location","actionEvidence"]}},
  actorMoves:{type:"array",items:{type:"object",additionalProperties:false,
   properties:{role:{type:"string",enum:["jack","jill"]},from:{type:"string"},
    to:{type:"string"},evidence:{type:"string"}},
   required:["role","from","to","evidence"]}},
  newEvent:{type:"object",additionalProperties:false,
   properties:{actor:{type:"string"},action:{type:"string"},evidence:{type:"string"}},
   required:["actor","action","evidence"]},
  humor:{type:"object",additionalProperties:false,
   properties:{attempted:{type:"boolean"},actionEvidence:{type:"string"},reactionEvidence:{type:"string"}},
   required:["attempted","actionEvidence","reactionEvidence"]},
  openThreads:{type:"array",items:{type:"string"}}
 },required:["jack","jill","objectChanges","actorMoves","newEvent","humor","openThreads"]
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
   position:position(authored.jackPosition,"undecided"),emotion:"guarded",
   belief:limit(authored.jackBelief||(isMicrowave?
    "Unannounced spending may endanger our shared savings":"My interpretation of this conflict may be incomplete"),220),
   fear:limit(authored.jackFear||(isMicrowave?
    "Losing financial security or a voice in joint decisions":"Not being heard"),180),
   feltCost:""},
  jill:{want:limit(authored.jillWant||episode.jillMotivation||"To be understood",240),
   position:position(authored.jillPosition,isMicrowave?"favor":"undecided"),emotion:"guarded",
   belief:limit(authored.jillBelief||(isMicrowave?
    "Jack's missed repair promises leave me to solve daily problems":"My need may not be understood"),220),
   fear:limit(authored.jillFear||(isMicrowave?
    "Another missed promise or being dismissed":"Having my needs dismissed"),180),
   feltCost:""}
 };
 const initialObjects=isMicrowave?[{id:"replacement_box",condition:"sealed",location:"kitchen counter"}]:
   (Array.isArray(authored.objects)?authored.objects:[]).slice(0,8).map(x=>({
    id:limit(x.id,50),condition:limit(x.condition,100),location:limit(x.location,120)
   }));
 return {version:SIMULATION_VERSION,lastPhase:-1,
  centralChoice:limit(authored.centralChoice||(isMicrowave?
   "Whether to keep the $400 replacement microwave bought from emergency savings":
   episode.learningObjective||episode.premise||"The unresolved choice"),260),
  characters,objects:initialObjects,actorLocations:initialActorLocations(episode),
  events:[],humorBeats:[],openThreads:(Array.isArray(authored.openThreads)?authored.openThreads:
   isMicrowave?["Decide whether to keep the replacement","Address the unconsulted withdrawal and overdue repair"]:
   ["Explore the central conflict"]).slice(0,8).map(x=>limit(x,200)),
  knownFacts:isMicrowave?[
   "Jill made the $400 purchase using shared emergency savings, without Jack's consent.",
   "Jack postponed repairing the original microwave for three weeks.",
   "A store's return policy, exact purchase date and professional repair cost are not yet known."
  ]:Array.isArray(authored.knownFacts)?authored.knownFacts.slice(0,12).map(x=>limit(x,260)).filter(Boolean):[]
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
  // Keep each fictional person's interpretations and interpersonal costs
  // independent. The shared narrator may update a belief only with observable,
  // actor-attributed evidence; the other character's coaching is not evidence.
  const attributed=(excerpt)=>{
   if(!matchesEvidence(story,excerpt))return false;
   const quote=normalize(excerpt),other=role==="jack"?"jill":"jack";
   if(quote.includes(other)&&!quote.includes(role))return false;
   const scene=normalize(story),at=scene.indexOf(quote);
   const prefix=scene.slice(Math.max(0,at-100),at);
   const mentions=[...prefix.matchAll(/\b(jack|jill)\b/g)];
   return quote.includes(role)||mentions.at(-1)?.[1]===role;
  };
  const newBelief=limit(after.belief,220);
  const changedBelief=Boolean(newBelief)&&newBelief!==before.belief;
  const beliefAllowed=changedBelief&&attributed(after.beliefEvidence);
  const newCost=limit(after.feltCost,180);
  const costAllowed=Boolean(newCost)&&attributed(after.costEvidence);
  if(changedBelief&&!beliefAllowed)adjustments.push(role+" belief retained: no visible attribution");
  if(newCost&&!costAllowed)adjustments.push(role+" felt cost retained: no visible attribution");
  next.characters[role]={...before,
   position:acceptedChange?after.position:before.position,
   emotion:limit(after.emotion||before.emotion,100),
   belief:beliefAllowed?newBelief:before.belief,
   fear:before.fear,
   feltCost:costAllowed?newCost:before.feltCost};
 }
 if(proposal.humor?.attempted&&
    matchesEvidence(story,proposal.humor.actionEvidence)&&
    matchesEvidence(story,proposal.humor.reactionEvidence))
  next.humorBeats=[...(previous.humorBeats||[]).slice(-7),{
   phase,action:limit(proposal.humor.actionEvidence,200),
   reaction:limit(proposal.humor.reactionEvidence,200)}];
 // The 'box's return-policy pamphlet' is not the box itself being opened.
 // Peeling a label's tape corner to read it does not break the box's seal.
 // Only clear, completed unsealing actions can transition it to "opened".
 // Only AFFIRMATIVE, completed physical actions may open the box. Bare
 // "open the box" often appears in a suggestion or "let's NOT open the box".
 // It must never silently mutate the world state, even if the model proposes
 // an unsupported physical transition.
 const unsealing=/\b(?:cut open|open(?:ed|s) (?:the )?(?:\w+\s+){0,2}(?:box|packaging|cardboard)(?![’']s)|broke (?:the )?seal|unboxed|pulled out the receipt from the box|removed (?:the )?(?:sealing )?tape (?:and|to) open (?:the )?box|(?:breaks?|broke|peels?|peeled|tears?|tore|cuts?|cut) (?:back )?(?:the )?(?:packing |sealing )?tape (?:on|off|of|sealing) (?:the )?(?:\w+\s+){0,2}box|(?:lifts?|lifted|opens?|opened) (?:the )?(?:box lid|lid of (?:the )?box))\b/gi;
 const didUnseal=(text)=>{
  const source=String(text||"");
  for(const match of source.matchAll(unsealing)){
   const before=source.slice(Math.max(0,match.index-110),match.index)
    .split(/[.!?;:\n“”"]/).at(-1)||"";
   const negated=/\b(?:not|never|without|didn't|don't|won't|wouldn't|couldn't|can't|cannot|avoid(?:ed|ing)?|refus(?:ed|ing)?|should|could|might|may|will|if|unless|whether|consider(?:ed|ing)?|planned? to|intend(?:ed)? to|wanted? to|asked? to)\b[^.!?;:\n]*$/i;
   if(negated.test(before))continue;
   return true;
  }
  return false;
 };
 const explicitlySealed=/\b(?:without (?:breaking|removing) (?:the )?seal|without unsealing|without breaking the seal fully|box (?:stays|remains|is|was) (?:still |firmly |tightly )?sealed|box stayed sealed|sealed box)\b/i;
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
   if(update.condition==="opened"&&!didUnseal(update.actionEvidence)){
    adjustments.push("ignored unproven box opening");continue;
   }
   // Once the original seal is broken, the prior "sealed" state must not
   // reappear. A model cannot erase an irreversible action by proposing a
   // different object state, even if it copies a contradicting phrase.
   if(old.condition==="opened"&&update.condition==="sealed")
    return {ok:false,reason:"An opened box cannot return to sealed without a narrated resealing action."};
  }
  old.condition=limit(update.condition,100);
  old.location=limit(update.location,120);
 }
 const priorBox=previous.objects.find(x=>x.id==="replacement_box");
 const afterBox=next.objects.find(x=>x.id==="replacement_box");
 const resealed=/\b(?:resealed|sealed (?:the )?box (?:again|back)|retaped|taped (?:the )?box shut)\b/i;
 const claimsUnopened=/\b(?:unopened(?:\s+\w+){0,3}\s+box|box\s+(?:is|remains|stays)\s+(?:tightly\s+)?(?:sealed|unopened|closed)|still[- ]sealed(?:\s+\w+){0,3}\s+box|sealed(?:\s+\w+){0,3}\s+box|box stays (?:tightly )?sealed)\b/i;
 if(priorBox&&afterBox){
  if(priorBox.condition==="opened"&&claimsUnopened.test(story)&&!resealed.test(story))
   return {ok:false,reason:"An opened box was described as unopened without being resealed."};
  // An observable physical event outranks model-generated state labels.
  if(didUnseal(story)&&afterBox.condition==="sealed"){
   afterBox.condition="opened";
   adjustments.push("visible box opening reconciled into world state");
  }else if(priorBox.condition==="sealed"&&!didUnseal(story)&&claimsUnopened.test(story)){
   // Explicitly sealed in the visible prose outranks a proposed opening
   // based on a misleading reference to paperwork, a calendar or a receipt.
   afterBox.condition="sealed";
  }
  if(priorBox.condition==="opened"&&resealed.test(story)){
   afterBox.condition="resealed";
   adjustments.push("visible resealing reconciled into world state");
  }
  if(priorBox.condition==="sealed"&&!didUnseal(story)&&explicitlySealed.test(story)){
   // Explicit visible evidence that the box was NOT unsealed overrides
   // a speculative AI objectChange, including a peeled label corner.
   if(afterBox.condition!=="sealed")adjustments.push("restored sealed box: no actual unsealing occurred");
   afterBox.condition="sealed";
  }
 }
 // An authored, structurally complete scene is itself the source of truth.
 // When the model paraphrases a citation, use a literal visible excerpt
 // instead of rejecting a coherent scene three times.
 const eventEvidence=matchesEvidence(story,proposal.newEvent.evidence)?
  limit(proposal.newEvent.evidence,220):
  observedEventExcerpt(story,previous.events)||
   (/\b(?:jack|jill)\b/i.test(story)?
    limit(String(story||"").replace(/\s+/g," ").trim(),180):"");
 if(eventEvidence.length<12)
  return {ok:false,reason:"The generated scene contains no usable visible event."};
 // The event ledger must not credit Jack for Jill's visible actions (or vice versa).
 // Only correct a model's actor tag when the exact observed evidence names ONE
 // fictional actor. A two-name dialogue or pronoun-only excerpt is ambiguous;
 // preserve its actor tag rather than guessing from unrelated narrative.
 const proposedEventActor=limit(proposal.newEvent.actor,50);
 const namedEvidenceActors=[...new Set((eventEvidence.match(/\b(?:Jack|Jill)\b/gi)||[])
  .map(name=>name.toLowerCase()))];
 const observedActor=namedEvidenceActors.length===1?
  (namedEvidenceActors[0]==="jack"?"Jack":"Jill"):proposedEventActor;
 if(observedActor.toLowerCase()!==proposedEventActor.toLowerCase())
  adjustments.push("corrected event actor to match the visible named character");
 // Cross-scene actor location is a committed world fact, not a stylistic
 // detail. Accept only on-stage departures and ground-truth movement evidence.
 // Older v1 rooms lacking actorLocations are still supported as unknown.
 const locations=validateActorLocations(previous,story,phase,proposal.actorMoves||[]);
 if(!locations.ok)return {ok:false,reason:locations.reason};
 next.actorLocations=locations.locations;
 adjustments.push(...locations.adjustments);
 next.lastPhase=phase;
 next.events=[...(previous.events||[]).slice(-17),{
  phase,actor:observedActor,
  action:observedActor.toLowerCase()!==proposedEventActor.toLowerCase()?eventEvidence:
   matchesEvidence(story,proposal.newEvent.evidence)?
    limit(proposal.newEvent.action,300):eventEvidence,
  evidence:eventEvidence}];
 // An unresolved question never disappears merely because the narrator wants a
 // smooth ending. An eventual resolution needs an explicit confirmed choice.
 const allThreads=[...(previous.openThreads||[]),...
  (Array.isArray(proposal.openThreads)?proposal.openThreads:[]).map(x=>limit(x,200))];
 const stop=new Set(["the","a","an","or","and","to","about","for","whether","how","what","when",
  "of","is","are","was","will","with","their","our","this","that","they","jack","jill"]);
 const topic=x=>new Set(limit(x,200).toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/)
  .filter(w=>w.length>2&&!stop.has(w)));
 const overlaps=(a,b)=>{
  const x=topic(a),y=topic(b);
  return x.size&&y.size?[...x].filter(w=>y.has(w)).length/Math.min(x.size,y.size):0;
 };
 next.openThreads=[];
 for(const thread of allThreads){
  const t=limit(thread,200);
  if(!t||next.openThreads.some(old=>overlaps(old,t)>=0.8))continue;
  next.openThreads.push(t);
  if(next.openThreads.length>=8)break;
 }
 return {ok:true,state:next,event:next.events.at(-1),adjustments};
}
export const simulationInstructions=[
 "The simulation state is authoritative. Jack and Jill are independent fictional people with distinct persistent wants, beliefs, preferences and boundaries.",
 "The six-phase storyboard determines pacing, NOT whether their disagreement resolves. A final scene may end unresolved.",
 "The position values describe each character's stance on the centralChoice: favor, oppose, conditional, undecided. Never infer agreement from calmness, budgeting or willingness to listen.",
 "Jack and Jill each have an independent want, fear, interpretation (belief) and most recent felt interpersonal cost. Neither reads the other's internal state or privately received coaching. Only something spoken or acted out in the shared world can change what the other knows.",
 "Propose a new belief only when the same character clearly reveals that interpretation in a narrated act or spoken response; cite the exact excerpt in beliefEvidence. Otherwise repeat their existing belief and return empty beliefEvidence.",
 "Propose feltCost only when the same character visibly experiences a new consequence or names a personal cost, with exact attributable costEvidence; otherwise repeat previous feltCost with empty costEvidence.",
 "Character agency means believable imperfect choices, not automatic alignment. Harsh coaching may be followed, partially followed, or explicitly refused with believable fallout. Never quietly substitute a generic polite response.",

 "If a character's position changes, include a short EXACT excerpt of the visible scene containing an explicit decision; if unchanged use decisionEvidence as an empty string.",
 "objectChanges includes ONLY objects whose physical condition or location visibly changed. Use one exact evidence excerpt per changed object. If none changed, return [].",
 "actorMoves includes ONLY actual on-stage moves by Jack or Jill. Include role, from (the prior committed actorLocations place), to (the new place), and a verbatim excerpt describing movement. When there is no travel, return []. Do not invent a travel step or relocate someone because of a phone conversation.",
 "actorLocations are durable facts. Jack cannot reappear in the kitchen after leaving for work without a visible return. The previous person's location is authoritative, even when the narrative voice is tempted to reset the scene.",
 "Object changes must be earned: if the box is opened, it stays opened unless somebody visibly reseals it. Never say 'unopened' about an already opened box.",
 "newEvent must have an exact verbatim excerpt from the visible scene showing what happened THIS SCENE; do not replay previously completed calls.",
 "No outside pricing, refund deadlines, fees or retailer policies become facts without an actual credible in-story interaction. Unverified claims remain uncertainty.",
 "Characters may follow, resist, misunderstand, or reject coaching; the observable consequence must reflect their agency without silently rewriting the coach's request.",
 "Use character-driven humor when appropriate: a comic attempt must lead to an actual partner reaction, even irritation. If humor is inappropriate in this phase, set humor.attempted false and evidence fields to empty strings.",
 "Write ~75–110 words across opening, jackBeat, jillBeat, fallout. Avoid abstract emotional narration. Include a new tangible event. The narrator must never mention a past event as if it just happened again."
].join(" ");
