// Anthos JJ4 — causal coaching contract between the saved checkpoint and next scene.
// The authored six-phase plan remains fixed; private advice may change how fictional
// characters behave within that stage, even when the advice is poor or rejected.
export const ROLE_NAMES=Object.freeze({jack:"Jack",jill:"Jill"});
const PHASES=Object.freeze(["hook","conflict","discovery","reattempt","outcome","reflection"]);
const TARGET_ROLES=Object.freeze(["jack","jill"]);
const clean=value=>typeof value==="string"?value.trim():"";

/** Extract ONLY advice given to the explicitly assigned previous checkpoint.
 * Advice is isolated by room upstream and by phase/role here; it cannot spill
 * into the next intervention or be mistaken for the author's scene direction. */
export function adviceForNextScene(phaseIndex,episode,history){
 if(!Number.isInteger(phaseIndex)||phaseIndex<1||phaseIndex>5)return null;
 const afterPhase=PHASES[phaseIndex-1];
 const cp=Array.isArray(episode?.checkpoints)?
  episode.checkpoints.find(x=>x?.afterPhase===afterPhase):null;
 if(!cp||!cp.waitForReply||cp.audience==="none")return null;
 const roles=cp.audience==="both"?TARGET_ROLES:TARGET_ROLES.filter(role=>role===cp.audience);
 const advice={};
 for(const item of history||[]){
  if(item.kind!=="coach"||item.phase_index!==phaseIndex-1||!roles.includes(item.role))continue;
  const body=clean(item.body).slice(0,900);
  if(body)advice[item.role]=body; // last recorded message for the role wins
 }
 if(!Object.keys(advice).length)return null;
 return {
  afterPhase,upcomingPhase:PHASES[phaseIndex],
  checkpointPurpose:clean(cp.purpose).slice(0,600),
  activeRoles:roles,advice
 };
}

const BEHAVIOR=["follow","challenge","misinterpret","partly_accept","reject"];
export const IMPACT_SCHEMA={
 type:"object",additionalProperties:false,
 properties:{
  jack:{type:"object",additionalProperties:false,properties:{
   stance:{type:"string",enum:BEHAVIOR},
   concreteAction:{type:"string"},
   personalConsequence:{type:"string"}
  },required:["stance","concreteAction","personalConsequence"]},
  jill:{type:"object",additionalProperties:false,properties:{
   stance:{type:"string",enum:BEHAVIOR},
   concreteAction:{type:"string"},
   personalConsequence:{type:"string"}
  },required:["stance","concreteAction","personalConsequence"]},
  sharedFallout:{type:"string"},
  tensionToCarry:{type:"string"}
 },
 required:["jack","jill","sharedFallout","tensionToCarry"]
};
const count=value=>clean(value).length;
export function validateImpactPlan(plan){
 if(!plan||typeof plan!=="object")return false;
 for(const role of TARGET_ROLES){
  if(!BEHAVIOR.includes(plan[role]?.stance))return false;
  if(count(plan[role].concreteAction)<22||count(plan[role].personalConsequence)<22)return false;
 }
 return count(plan.sharedFallout)>=30&&count(plan.tensionToCarry)>=20;
}

/** Only fictional behavior is fed to the final narrator, never raw private advice. */
export function publicBehaviorPlan(plan){
 if(!validateImpactPlan(plan))throw new Error("Missing concrete consequence from coaching.");
 return {
  jack:{stance:plan.jack.stance,action:clean(plan.jack.concreteAction),
   consequence:clean(plan.jack.personalConsequence)},
  jill:{stance:plan.jill.stance,action:clean(plan.jill.concreteAction),
   consequence:clean(plan.jill.personalConsequence)},
  sharedFallout:clean(plan.sharedFallout),
  tensionToCarry:clean(plan.tensionToCarry)
 };
}

export const DIRECTED_SCENE_SCHEMA={
 type:"object",additionalProperties:false,properties:{
  opening:{type:"string"},jackBeat:{type:"string"},jillBeat:{type:"string"},
  fallout:{type:"string"},jackPrompt:{type:"string"},jillPrompt:{type:"string"}
 },required:["opening","jackBeat","jillBeat","fallout","jackPrompt","jillPrompt"]
};

/** Enforces that the resulting story includes both characters' actions and their
 * consequence instead of letting the model write a generic scene and claim success. */
export function assembleDirectedScene(result,hasCoaching){
 const parts=["opening","jackBeat","jillBeat","fallout"].map(key=>clean(result?.[key]));
 const mins=hasCoaching?[25,35,35,40]:[20,25,25,30];
 if(parts.some((part,i)=>part.length<mins[i]))throw new Error(
  "Scene lacked a concrete character action or consequence. Retry generation.");
 const story=parts.join(" ");
 if(story.length>2500)throw new Error("The scene exceeded its story limit.");
 return story;
}
