/**
 * Anthos Character Evolution Engine 1.0
 *
 * IMPORTANT: These are FICTIONAL narrative variables, NOT mental health scores,
 * psychological assessments, measurements of a real couple, or mastery gates.
 * The state changes only when an observable fictional action is committed and
 * one canonical story consequence is atomically published.
 */
export const ENGINE_VERSION="3.3.0";
export const EVOLUTION_ENABLED_VERSIONS=["3.1.0","3.2.0",ENGINE_VERSION];
export const usesEvolution=version=>EVOLUTION_ENABLED_VERSIONS.includes(version);
export const EVOLUTION_VERSION="evolution-1";
export const AXES=["connection","agency","trust","energy","friction","curiosity"];
export const LIMIT=4;

const clamp=n=>Math.max(0,Math.min(100,n));
const trim=(v,max=180)=>typeof v==="string"?v.trim().slice(0,max):"";
const object=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const softNorm=x=>trim(x,300).toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const words=x=>new Set(softNorm(x).split(/\s+/).filter(w=>w.length>3));
export function storySimilarity(a,b) {
 const wa=words(a),wb=words(b);
 if(!wa.size||!wb.size)return 0;
 return [...wa].filter(w=>wb.has(w)).length / Math.max(wa.size,wb.size);
}
function person(connection=50,agency=50,trust=50,energy=50,friction=15,curiosity=50) {
 return {meters:{connection,agency,trust,energy,friction,curiosity},
  // These are observable evolving narrative interpretations, not private disclosures.
  currentWant:"To be heard without giving up what matters",
  emergingBeliefs:[],gains:[],costs:[]};
}
export function initialEvolution(scenario={}) {
 return {
  version:EVOLUTION_VERSION,completedBeats:0,
  characters:{jack:person(52,54,52,64,16,62),jill:person(52,54,52,52,16,52)},
  relationship:{connection:52,trust:52,unresolvedThreads:[]},
  arc:{
   openingDilemma:trim(scenario.learning_objective||scenario.title||"Differing hopes",240),
   lastDilemma:trim(scenario.opening_scene||"An unexpected disagreement",300),
   beats:[],
   seenDilemmas:[]
  }
 };
}
function validMeters(m) {
 return object(m)&&AXES.every(k=>Number.isInteger(m[k])&&m[k]>=0&&m[k]<=100);
}
export function validEvolution(state){
 return object(state)&&state.version===EVOLUTION_VERSION&&Number.isInteger(state.completedBeats)&&
  state.completedBeats>=0&&state.completedBeats<=5&&
  ["jack","jill"].every(role=>{
   const p=state.characters?.[role];
   return object(p)&&validMeters(p.meters)&&typeof p.currentWant==="string"&&
    Array.isArray(p.emergingBeliefs)&&Array.isArray(p.gains)&&Array.isArray(p.costs);
  })&&
  object(state.relationship)&&Number.isInteger(state.relationship.connection)&&
  Number.isInteger(state.relationship.trust)&&Array.isArray(state.relationship.unresolvedThreads)&&
  object(state.arc)&&Array.isArray(state.arc.beats)&&Array.isArray(state.arc.seenDilemmas)&&
  typeof state.arc.lastDilemma==="string"&&state.arc.beats.length===state.completedBeats;
}
const impactSchema={
 type:"object",additionalProperties:false,properties:{
  connection:{type:"integer"},agency:{type:"integer"},trust:{type:"integer"},
  energy:{type:"integer"},friction:{type:"integer"},curiosity:{type:"integer"},
  evidence:{type:"string"},immediateGain:{type:"string"},delayedCost:{type:"string"},
  newWant:{type:"string"},beliefShift:{type:"string"}
 },
 required:["connection","agency","trust","energy","friction","curiosity","evidence",
 "immediateGain","delayedCost","newWant","beliefShift"]
};
export const EVOLUTION_STORY_SCHEMA={
 type:"object",additionalProperties:false,properties:{
  outcome:{type:"string"},nextScene:{type:"string"},location:{type:"string"},
  tension:{type:"string"},facts:{type:"array",items:{type:"string"}},
  researchNote:{type:"string"},newDilemma:{type:"string"},
  relationshipConnection:{type:"integer"},relationshipTrust:{type:"integer"},
  unresolvedThread:{type:"string"},
  impacts:{type:"object",additionalProperties:false,properties:{
   jack:impactSchema,jill:impactSchema
  },required:["jack","jill"]}
 },
 required:["outcome","nextScene","location","tension","facts","researchNote",
  "newDilemma","relationshipConnection","relationshipTrust","unresolvedThread","impacts"]
};

/** The final beat is a real ending, not a new story prompt or cliffhanger.
 * These fields describe FICTIONAL character growth from observable events.
 */
export const EVOLUTION_FINAL_SCHEMA={
 ...EVOLUTION_STORY_SCHEMA,
 properties:{...EVOLUTION_STORY_SCHEMA.properties,
  closing:{type:"object",additionalProperties:false,properties:{
   jackChange:{type:"string"},jillChange:{type:"string"},
   relationshipTruth:{type:"string"},sophiaInsight:{type:"string"},
   invitation:{type:"string"}
  },required:["jackChange","jillChange","relationshipTruth","sophiaInsight","invitation"]}
 },
 required:[...EVOLUTION_STORY_SCHEMA.required,"closing"]
};
export function validateEvolutionStory(story,previous,step,confirmedActions) {
 const errors=[];
 if(!validEvolution(previous)){errors.push("invalid_previous_state");return {ok:false,errors}}
 if(step!==previous.completedBeats+1)errors.push("nonsequential_step");
 if(!Array.isArray(confirmedActions)||confirmedActions.length<1||
   confirmedActions.some(a=>!["Jack","Jill"].includes(a.character)||trim(a.action).length<10))
  errors.push("missing_confirmed_action");
 if(!object(story))return {ok:false,errors:[...errors,"missing_story"]};
 if(trim(story.outcome,5000).length<90)errors.push("outcome_too_short");
 if(trim(story.nextScene,3000).length<55)errors.push("next_scene_too_short");
 if(trim(story.location).length<3)errors.push("missing_location");
 if(step<5&&trim(story.newDilemma,600).length<25)errors.push("no_playable_new_dilemma");
 if(step===5){
  if(trim(story.newDilemma).length!==0)errors.push("finale_must_not_open_new_dilemma");
  const c=story.closing;
  if(!object(c))errors.push("missing_final_closure");
  else for(const [field,min] of [["jackChange",25],["jillChange",25],
    ["relationshipTruth",25],["sophiaInsight",35],["invitation",20]]){
   if(trim(c[field],800).length<min)errors.push("missing_closure_"+field);
  }
 }
 if(!Array.isArray(story.facts)||story.facts.length>8)errors.push("invalid_facts");
 if(trim(story.tension).length<8)errors.push("missing_tension");
 if(!Number.isInteger(story.relationshipConnection)||Math.abs(story.relationshipConnection)>LIMIT ||
  !Number.isInteger(story.relationshipTrust)||Math.abs(story.relationshipTrust)>LIMIT)
  errors.push("relationship_impact_out_of_range");
 if(step<5){
  const nextWords=words(story.newDilemma);
  if(nextWords.size<4)errors.push("dilemma_not_concrete");
  for(const old of [previous.arc.lastDilemma,...previous.arc.seenDilemmas]){
   if(storySimilarity(old,story.newDilemma)>.79){errors.push("stale_dilemma");break}
  }
  if(storySimilarity(previous.arc.lastDilemma,story.nextScene)>.88)
   errors.push("scene_repeated");
 }
 for(const role of ["jack","jill"]){
  const effect=story.impacts?.[role];
  if(!object(effect)){errors.push(role+"_impact_missing");continue}
  if(AXES.some(axis=>!Number.isInteger(effect[axis])||Math.abs(effect[axis])>LIMIT))
   errors.push(role+"_impact_out_of_range");
  else if(AXES.every(axis=>effect[axis]===0))
   errors.push(role+"_no_effect");
  const evidence=trim(effect.evidence,300);
  if(evidence.length<12||!String(story.outcome).toLowerCase().includes(evidence.toLowerCase()))
   errors.push(role+"_ungrounded_effect");
  if(trim(effect.immediateGain).length<8&&trim(effect.delayedCost).length<8)
   errors.push(role+"_no_observable_consequence");
  if(trim(effect.newWant).length<10)errors.push(role+"_missing_evolving_desire");
  if(typeof effect.beliefShift!=="string")errors.push(role+"_belief_shift_invalid");
 }
 return {ok:errors.length===0,errors};
}
function recentPush(items,entry,max=5){
 const list=Array.isArray(items)?items.slice():[];
 const value=trim(entry,220);if(value&&!list.includes(value))list.push(value);
 return list.slice(-max);
}
export function evolveState(previous,story,step,confirmedActions){
 const result=validateEvolutionStory(story,previous,step,confirmedActions);
 if(!result.ok)throw new Error("Invalid fictional transition: "+result.errors.join(", "));
 const next=structuredClone(previous);
 for(const role of ["jack","jill"]){
  const old=next.characters[role],effect=story.impacts[role];
  for(const axis of AXES)old.meters[axis]=clamp(old.meters[axis]+effect[axis]);
  old.currentWant=trim(effect.newWant,180);
  old.emergingBeliefs=recentPush(old.emergingBeliefs,effect.beliefShift);
  old.gains=recentPush(old.gains,effect.immediateGain);
  old.costs=recentPush(old.costs,effect.delayedCost);
 }
 next.relationship.connection=clamp(next.relationship.connection+story.relationshipConnection);
 next.relationship.trust=clamp(next.relationship.trust+story.relationshipTrust);
 next.relationship.unresolvedThreads=recentPush(next.relationship.unresolvedThreads,story.unresolvedThread);
 const events={
  beat:step,actions:confirmedActions.map(a=>({character:a.character,action:trim(a.action,900)})),
  outcome:trim(story.outcome,2500),
  newDilemma:trim(story.newDilemma,350),
  gain:{jack:trim(story.impacts.jack.immediateGain),jill:trim(story.impacts.jill.immediateGain)},
  cost:{jack:trim(story.impacts.jack.delayedCost),jill:trim(story.impacts.jill.delayedCost)},
  impacts:{jack:Object.fromEntries(AXES.map(k=>[k,story.impacts.jack[k]])),
   jill:Object.fromEntries(AXES.map(k=>[k,story.impacts.jill[k]]))},
  ...(step===5?{closure:{...story.closing}}:{})
 };
 next.arc.beats.push(events);
 next.arc.seenDilemmas=recentPush(next.arc.seenDilemmas,next.arc.lastDilemma,6);
 next.arc.lastDilemma=trim(story.newDilemma,300);
 if(step===5)next.arc.closure={...story.closing};
 next.completedBeats=step;
 if(!validEvolution(next))throw new Error("Invalid evolved fictional state");
 return next;
}
// Private character prompts see only what is observable or belongs to that fictional
// character. Never share human coaching transcripts, other person's private_memory,
// or private learning reflections across participants.
export function characterEvolutionContext(state,role){
 if(!validEvolution(state)||!["jack","jill"].includes(role))return null;
 const self=state.characters[role];
 return {version:state.version,completedBeats:state.completedBeats,
  ownCurrentWant:self.currentWant,ownBeliefChanges:self.emergingBeliefs.slice(-3),
  ownGains:self.gains.slice(-3),ownCosts:self.costs.slice(-3),
  ownNarrativeSignals:{...self.meters},
  sharedObservableEvents:state.arc.beats.slice(-2).map(b=>({
   actionByCharacters:b.actions,outcome:b.outcome,newDilemma:b.newDilemma
  })),
  relationship:{...state.relationship}};
}
export function evolutionStoryPrompt({mode,scenario,scene,step,actions,evolution,autoplay=false,guided=false}){
 if(!validEvolution(evolution))throw new Error("Missing valid evolving story state");
 const before=evolution.arc.beats.at(-1);
 return {
  instructions:[
   "You are the invisible Anthos Character Evolution Engine, directing one real fictional consequence. Return COMPLETE JSON strictly matching the supplied schema.",
   "Jack and Jill start with distinct personalities, but NEVER freeze their desires or return them to the initial debate. They can embrace adventure, discover a new dislike, grow closer while losing agency, become more resentful while laughing, or change their mind again.",
   "The confirmed character actions are the only participant instructions that may affect the shared world. Follow them even if they are imperfect, selfish, unwise, surprising or generous, provided safe. Do not automatically fix, moralize or fabricate agreement.",
   "One character may choose to wait and see while the other takes an active step. This is a legitimate and already confirmed fictional move, not an empty choice, failed lesson, or invitation for more questions. Make the active step actually HAPPEN and show what the observer discovers and how they respond.",
   "Human spouses may discuss their coaching offline. You have no transcript and cannot assert that Jill heard Adam or that Jack heard Alissa. You CAN see BOTH committed character actions here, and may depict a natural win-win when those choices are compatible. Do not invent hidden cooperation or reveal the private coaching conversations.",
   "The next event must physically progress the story: reveal an actual attempt, response and consequence. Never produce another scene where both just discuss possible plans or agree to review the weather later.",
   "Do not make the couple wait for another intervention by Adam or Alissa if both committed fictional moves already exist. The scene MUST produce an event with consequences, even if the choices are compatible, independent, passive, conflicting, or imperfect.",
   "Game-night and playful scenarios should use situational comedy grounded in what Jack and Jill actually did, without random escalation or humiliating either spouse. The opening scenario is a seed, not an endless repeated argument.",
   "No mind reading. The shared fictional world contains only observable actions; you do not have the human coaches' private messages. Never reveal or infer real spouse disclosures.",
   "For EACH character portray at least one specific consequence: an immediate gain, a cost or strain, OR both. Do NOT force a tidy gain-and-loss formula every beat. Sometimes a choice simply hurts; sometimes it works beautifully, with a delayed cost surfacing later. Both characters may move in different directions.",
   "The two characters can evolve gradually. Do NOT re-open the original debate as the next dilemma. The first four beats must create a DIFFERENT concrete external problem with new stakes. Introduce one funny character-driven consequence, not random slapstick.",
   guided?"This is a GUIDED FICTIONAL ADVENTURE, not an endless chat and not a fully passive movie. Human friends advise the characters on meaningful turning points 1, 3, and 5; Jack and Jill act autonomously on interludes 2 and 4. Do not demand extra messages during a scene or put any human coaching in the public narrative. When the next moment is 3 or 5, give the characters a meaningful NEW relationship problem to bring privately to their own friends; let their advice genuinely shape the outcome.":autoplay?"This is AUTONOMOUS FICTION: after the initial advice, Jack and Jill make their OWN decisions at every later beat. Never ask Adam, Alissa, or any other human friend for permission, advice, a choice, or a reply. Their private conversation has ended for this episode. Every nextScene must pose a concrete playable situation for the CHARACTERS to address without new outside coaching.":"",
   guided&&[2,4].includes(step)?"The next scene is a REAL turning point, not another prop-cleanup task. Create a specific interpersonal stake for EACH character, with different reasons they might need a friend's perspective. Make the relationship consequence of past choices visible and still playable. No quiz or obvious moral answer.":"",
   "For example, agreeing to an exhausting adventure can genuinely create delight and connection BUT cost Jill rest and the chance to speak up. Treat that as a real experience, not a wrong answer. Jack may notice or fail to notice.",
   "Use existing cost, gain, changed wants, unclosed consequences and prior choices to shape the NEW event. Answer every confirmed action through observable results in outcome, and then provide an actionable nextScene.",
   "impacts must have ONE bounded integer delta between -4 and 4 for every axis. These are internal narrative signals, NEVER clinical truth or actual measurements of the human couple. At least one axis per character must change.",
   "For each impact evidence must be a verbatim phrase of at least 12 characters copied from your visible outcome that supports your proposed change. newWant reflects what the character currently wants AFTER this event. beliefShift can be empty unless clearly established.",
   "immediateGain and delayedCost describe observable outcomes where they genuinely occur; either may be empty if not present in this event, but not both. Relationship connection and trust deltas range -4 to 4.",
   step===5?"FINAL BEAT: This is an ENDING, not another chapter. Resolve the current practical issue through the confirmed actions and show its real consequences. If safety or access is involved, show a credible safe resolution rather than ignoring the danger. Do NOT introduce any new dilemma, teaser, cliffhanger, question, or unearned perfect reconciliation. Set newDilemma to EXACTLY an empty string. nextScene is a 55+ character final tableau showing how the day actually ended, not a new decision. tension may name a lingering relationship truth, without reopening the story.":"newDilemma is a concise, specific, actionable NEW conflict rooted in what the couple just did, not the previous one. unresolvedThread holds a real unfinished problem.",
   step===5?"Include closing with five fields: jackChange and jillChange describe separately what each fictional spouse learned or changed FROM OBSERVABLE STORY EVENTS; relationshipTruth acknowledges what is better and what is unfinished without insisting on a happy ending; sophiaInsight is a warm 1-2 sentence research-informed observation grounded in this fictional experience, no clinical evaluation or scoring; invitation is one OPTIONAL small real-world couple action the participants may choose, not a homework requirement. Do not quote or infer either human participant's private coaching text.":"The last beat will provide the reflective ending, not this beat.",
   "Wit comes from Jack and Jill being human. Avoid formulaic resolutions and tidy lessons. Outcome 100-170 words, nextScene 55-100 words, ordinary accessible English.",
   "Eight hidden learning milestones may inform consequences, but NEVER gate progress or appear as visible chapters.",
   step===5?"Close this episode decisively. No line should ask the participants to decide what Jack or Jill will do next. Sophia can name a useful pattern without rating the coaches or prescribing therapy.":""
  ].join(" "),
  input:{scenario:{title:scenario.title,learningObjective:scenario.learning_objective,
    researchLenses:scenario.research_lenses,initialScene:scenario.opening_scene},
   mode,step,scene,autoplay,guided,confirmedActions:actions,
   fictionalState:evolution,
   lastConsequence:before||null}
 };
}
