// Deterministic Threefold Deep Dive state machine, for later integration with Supabase.
// No database writes, SMS calls or OpenAI calls occur here.
// Store each participant's state server-side under separate permissions when database is available.
export const STORY_ID = "christmas-tug-of-war";
export const STORY_VERSION = "1.0.0";
export const CHAPTER_COUNT = 8;
export const MASTERY_CHAPTER = 7;
export const OBJECTIVES = Object.freeze(["joint-decision","accountability","respectful-boundary","repair"]);
const qualityByChapter=Object.freeze({
  2: Object.freeze([2,0,0,1,2,0]),
  4: Object.freeze([2,0,0,0,2,1]),
  7: Object.freeze([2,0,0,1,0,2])
});
const fresh=()=>({
  storyId:STORY_ID,version:STORY_VERSION,chapter:1,completed:0,
  choices:{},repairs:{},detours:{},paused:false,closed:false,mastery:null
});
function validState(s){
  return s&&s.storyId===STORY_ID&&s.version===STORY_VERSION&&
    Number.isInteger(s.chapter)&&s.chapter>=1&&s.chapter<=8&&
    Number.isInteger(s.completed)&&s.completed>=0&&s.completed<=8&&
    s.choices&&typeof s.choices==="object"&&s.repairs&&typeof s.repairs==="object"&&
    s.detours&&typeof s.detours==="object"&&typeof s.paused==="boolean"&&typeof s.closed==="boolean";
}
const result=(state,status,detail)=>({state,status,detail});
// A new input is one event only; no arbitrary learner-defined chapter objective or score.
export function transition(input,event){
  const state=input?structuredClone(input):fresh();
  if(!validState(state))return result(input,"REJECTED","Invalid or incompatible story state; must be reviewed.");
  if(!event||typeof event!=="object"||typeof event.type!=="string")
    return result(state,"REJECTED","Expected a known event.");
  if(event.type==="START"){
    return input?result(state,"REJECTED","Story already started."):
      result(state,"STARTED","Start at Chapter 1 with no objectives yet demonstrated.");
  }
  if(event.type==="SAFETY"){
    state.paused=true;
    return result(state,"SAFETY_PAUSED","Pause the story. Prioritize immediate safety and real-world help where appropriate.");
  }
  if(state.paused){
    if(event.type!=="RESUME")return result(state,"PAUSED","Story is paused; no scoring or advancement.");
    if(event.safetyCleared!==true)return result(state,"PAUSED","Resume requires an explicit safety-clearance process.");
    state.paused=false;return result(state,"RESUMED","Resume the same milestone; do not grant progress for a pause.");
  }
  if(state.closed)return result(state,"COMPLETE","This story has ended. No further scores are awarded.");
  const chapter=state.chapter;
  if(event.type==="OFF_TOPIC"){
    const count=state.detours[chapter]||0;
    state.detours[chapter]=count+1;
    return count===0?
      result(state,"REDIRECT","Offer one brief relevant acknowledgement; optionally hand off to the correct persona. Keep the same story milestone.") :
      result(state,"RETURN_TO_GOAL","Briefly restate this chapter's goal and invite the participant to continue. Do not grant a crossing.");
  }
  if(event.type==="CHOICE"){
    const scores=qualityByChapter[chapter];
    const option=event.option;
    if(!scores||!Number.isInteger(option)||option<0||option>=scores.length)
      return result(state,"REJECTED","A fixed valid choice is required at the current decision milestone.");
    if(Object.hasOwn(state.choices,String(chapter)))
      return result(state,"REJECTED","Choice already recorded. A new option cannot overwrite the original.");
    const quality=scores[option];
    state.choices[chapter]={option,quality};
    if(chapter===MASTERY_CHAPTER)
      state.mastery=quality===2?"DEMONSTRATED":quality===1?"DEVELOPING":"NOT_YET_DEMONSTRATED";
    return result(state,"CHOICE_RECORDED","Choice "+String.fromCharCode(65+option)+" earns authored story quality "+quality+"/2. This is not a score for a real marriage.");
  }
  if(event.type==="REPAIR"){
    const prior=state.choices[chapter];
    if(!(chapter in qualityByChapter)||chapter===MASTERY_CHAPTER||!prior||
      prior.quality!==0||state.repairs[chapter])
      return result(state,"REJECTED","One bounded repair exercise is available only after a poor guided decision.");
    state.repairs[chapter]=true;
    return result(state,"REPAIR_PRACTICED","Offer specific accountability and return to the story; this does not erase the initial consequence or change the authored grade.");
  }
  if(event.type==="COMPLETE_MILESTONE"){
    if(chapter!==state.completed+1)return result(state,"REJECTED","Cannot skip or replay milestone credit.");
    if(Object.hasOwn(qualityByChapter,chapter)&&!Object.hasOwn(state.choices,String(chapter)))
      return result(state,"NEEDS_CHOICE","Complete the current fixed-choice moment first; no progress has been awarded.");
    state.completed=chapter;
    if(chapter===CHAPTER_COUNT){
      state.closed=true;
      return result(state,"STORY_COMPLETE","All eight crossings completed. Mastery status remains independent of completion.");
    }
    state.chapter=chapter+1;
    return result(state,"CHAPTER_COMPLETE","One crossing recorded. Proceed to the next authored milestone.");
  }
  return result(state,"REJECTED","Unknown event; no story progression or score awarded.");
}
