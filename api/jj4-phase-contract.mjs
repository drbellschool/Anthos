// Enforce only explicit author-controlled opening conditions, not an
// invented ideal relationship outcome. This is a deterministic strict-QA gate.
const clean=x=>String(x||"").toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ");
export function enforcePhaseContract(episode,phaseIndex,scene){
 if(phaseIndex!==0)return {ok:true};
 const hook=clean(episode?.phases?.hook||"");
 const stress=clean(episode?.sceneStress||"");
 const story=clean(scene);
 // A Hook that specifically begins with the vague "later" deferral must
 // demonstrate that unsettled bid, not skip directly to an agreed appointment.
 const explicitlyVague=/\b(?:says? ['"]?later|we'll talk later|vague ['"]?later|no return time|no time has (?:been )?mutually agreed|no time has (?:yet )?been agreed)\b/.test(hook+" "+stress);
 if(!explicitlyVague)return {ok:true};
 const actualDeferral=/\b(?:later|postpon(?:e|ed|ing)|not now|after my meeting|can't (?:talk|do this) now|will talk (?:another time|soon))\b/.test(story);
 const firmTime=/\b(?:at )?(?:[1-9]|1[0-2])(?::[0-5][0-9])?\s*(?:a\.?m\.?|p\.?m\.?)\b|\b(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+(?:evening|morning|night|afternoon)\b/.test(story);
 const accepted=/\b(?:yes[,!]?|i agree|i accept|that works|works for me|let's do it|we agreed|they agreed|we'll both|settling on|settled on|we have a plan|i'll be ready)\b/.test(story);
 if(!actualDeferral)
  return {ok:false,code:"missing_authored_hook",reason:"The authored Hook requires an initial open-ended 'later' deferral. Do not replace it with an early negotiated solution."};
 if(firmTime&&accepted)
  return {ok:false,code:"premature_hook_resolution",reason:"The authored Hook leaves the scheduling conflict unresolved. A mutually accepted specific time must be earned after the private coaching checkpoint."};
 return {ok:true};
}
