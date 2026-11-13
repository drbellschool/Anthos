// Anthos pilot-specific continuity contract. Can be generalized after the
// Four-Hundred-Dollar Surprise passes the adversarial pilot evaluation.
export const TARGET_SCENARIO_ID="67588dbf-b108-460d-87aa-c3a10d326d35";
export const isContinuityPilot=room=>room?.scenario_id===TARGET_SCENARIO_ID;
export const SCENE_REVIEW_SCHEMA={
 type:"object",additionalProperties:false,
 properties:{
  approved:{type:"boolean"},
  distinctNewEvent:{type:"string"},
  continuityError:{type:"string"},
  repetitionError:{type:"string"},
  responsibilityError:{type:"string"},
  coachingError:{type:"string"}
 },
 required:["approved","distinctNewEvent","continuityError","repetitionError","responsibilityError","coachingError"]
};
export const CONTINUITY_FACTS=Object.freeze([
 "Jill bought the $400 replacement microwave using the couple's shared emergency savings without checking with Jack.",
 "Jack did NOT spend the $400. He delayed repairing the old microwave for three weeks.",
 "There was only ONE arrival with the new boxed microwave. It now sits in the kitchen.",
 "Never repeat the moment the debit was discovered, repeat the arrival, or reverse buyer and saver accountability.",
 "Prior dialogue, completed calls, confirmed appointments, promises and receipt checks cannot be portrayed as new actions.",
 "A proposed action and a completed action are different. Preserve this distinction.",
 "The original microwave must never be opened or repaired by amateur electrical DIY; licensed help is appropriate.",
 "The characters can disagree or remain unresolved. Their emotional reactions must be consistent with what they already said."
]);
export function continuityInput(phaseIndex,sharedHistory,impact){
 return {
  phase:phaseIndex,canonicalFacts:CONTINUITY_FACTS,
  lastScene:sharedHistory.at(-1)||null,
  allCompletedScenes:sharedHistory,
  coachingImpact:impact||null,
  nextSceneRule:"Only events happening AFTER the last scene. At least one NEW observable action, new information, or consequence. No synopsis of past dialogue.",
  sceneLength:"75 to 110 words total, four short cohesive beats; avoid background recaps."
 };
}
export function reviewPass(review){
 if(!review||review.approved!==true||typeof review.distinctNewEvent!=="string"||review.distinctNewEvent.trim().length<10)return false;
 return ["continuityError","repetitionError","responsibilityError","coachingError"].every(k=>!review[k]?.trim());
}
export function wordCount(value){return String(value||"").trim().split(/\s+/).filter(Boolean).length}
