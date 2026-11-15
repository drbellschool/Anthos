// Anthos JJ4 â€” causal coaching contract between the saved checkpoint and next scene.
// The authored six-phase plan remains fixed; private advice may change how fictional
// characters behave within that stage, even when the advice is poor or rejected.
import {classifyCoachTurn} from "./jj4-response-router.mjs";
import {COACH_TRACE_SCHEMA} from "./jj4-quality-guards.mjs";
export {unsupportedExternalPolicyClaims,checkCoachingTrace,checkSceneLength,asksForHumor} from "./jj4-quality-guards.mjs";
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
 const advice={},responseKinds={};
 for(c¶»§q«^