/* Anthos Deep Dive Engine v1
 * Deterministic, story-versioned rehearsal engine for fictional lessons.
 * No network calls, scoring AI, couple data, or SMS. Server authority is required
 * before using this as a real authenticated progress ledger.
 */
(function(root, makeEngine) {
  "use strict";
  root.ANTHOS_DEEP_DIVE_ENGINE = Object.freeze(makeEngine());
})(globalThis, function() {
  "use strict";
  const VERSION = 1;
  const MAX_EVENTS = 128;
  const REPAIR_OPTIONS = Object.freeze([
    {id:"own",text:"Own the harm, apologize specifically, and ask to try the conversation again.",
      consequence:"The person who caused the hurt owns their words and invites a new conversation. The original impact still matters, and trust takes follow-through.",
      coach:"A repair names your own behavior, takes responsibility, and invites a fresh start. The original choice is not erased."},
    {id:"deflect",text:"Offer a vague apology, then explain why the other person misunderstood.",
      consequence:"The other person hears a defense instead of an apology. The storyteller acknowledges the harm and models a clearer repair.",
      coach:"A non-apology can make repair harder. Sophia models a better response once; the practice loop ends here."}
  ]);
  const ENDING_FALLBACK = "The characters face an imperfect result. What they choose next matters more than finding perfect words.";

  function storyCheck(story) {
    if (!story || typeof story.id !== "string" || !/^[a-z0-9-]{2,80}$/.test(story.id) ||
        !Array.isArray(story.chapters) || story.chapters.length !== 8)
      throw new Error("A Deep Dive needs a versioned ID and exactly eight story milestones.");
    for (const [i,chapter] of story.chapters.entries()) {
      if (typeof chapter.title !== "string" || typeof chapter.story !== "string")
        throw new Error("Milestone " + (i + 1) + " lacks authored content.");
      if (chapter.options !== undefined &&
          (!Array.isArray(chapter.options) || chapter.options.length !== 6 ||
            chapter.options.some(o => !o || typeof o.text !== "string" ||
              typeof o.impact !== "string" || typeof o.coach !== "string" ||
              ![0,1,2].includes(o.quality))))
        throw new Error("A decision milestone must include six scored, coached choices.");
    }
    if (!story.chapters[6].mastery || !Array.isArray(story.chapters[6].options) ||
        story.chapters[7].options)
      throw new Error("The independent mastery test belongs in chapter 7, before the chapter 8 ending.");
    return story;
  }
  const integer = (n,min,max) => Number.isInteger(n) && n>=min && n<=max;
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const fresh = story => ({
    version:VERSION,storyKey:story.id,storyVersion:story.storyVersion||1,
    chapter:0,completed:0,choices:{},repairs:{},events:[]
  });
  function restore(story,input) {
    storyCheck(story);
    if (!input || typeof input !== "object") return fresh(story);
    if (input.storyKey && (input.storyKey!==story.id ||
        input.storyVersion !== (story.storyVersion||1))) return fresh(story);
    if (input.version!==undefined && input.version!==VERSION) return fresh(story);
    const output=fresh(story);
    const candidates=input.choices && typeof input.choices==="object" && !Array.isArray(input.choices)
      ? input.choices:{};
    const candidateRepairs=input.repairs && typeof input.repairs==="object" && !Array.isArray(input.repairs)
      ? input.repairs:{};
    const desired=integer(input.completed,0,8)?input.completed:
      integer(input.diveCompleted,0,8)?input.diveCompleted:0;
    // Never restore a completed milestone that lacked its required decision or
    // an accountable (or guided) bounded repair. Corrupted demo data is clipped.
    for(let i=0;i<8;i++){
      const chapter=story.chapters[i];
      const choice=candidates[String(i)];
      if(chapter.options && integer(choice,0,5) && i<=desired)
        output.choices[String(i)]=choice;
      const needsRepair=chapter.options && !chapter.mastery &&
        integer(choice,0,5) && chapter.options[choice].quality===0;
      const repair=candidateRepairs[String(i)];
      if(needsRepair && repair && (repair===true ||
          (integer(repair.attempts,1,1) && ["own","deflect"].includes(repair.selected)))){
        output.repairs[String(i)]=repair===true?
          {attempts:1,selected:"own",guided:false}:
          {attempts:1,selected:repair.selected,guided:repair.selected==="deflect"};
      }
      if(i>=desired)break;
      if(chapter.options && !integer(choice,0,5))break;
      if(needsRepair && !output.repairs[String(i)])break;
      output.completed=i+1;
    }
    const proposed=integer(input.chapter,0,7)?input.chapter:
      integer(input.diveChapter,0,7)?input.diveChapter:output.completed;
    output.chapter=Math.min(proposed,Math.min(output.completed,7));
    if(Array.isArray(input.events))output.events=input.events
      .filter(e=>e && typeof e==="object" && ["choose","repair","advance"].includes(e.type) &&
        integer(e.chapter,0,7))
      .slice(-MAX_EVENTS).map((e,i)=>({
        seq:i+1,type:e.type,chapter:e.chapter,
        ...(integer(e.index,0,5)?{index:e.index}:{}),
        ...(typeof e.repair==="string" && ["own","deflect"].includes(e.repair)?{repair:e.repair}:{})
      }));
    return output;
  }
  function event(state,type,details={}) {
    const seq=(state.events.at(-1)?.seq||0)+1;
    state.events=[...state.events,{seq,type,chapter:state.chapter,...details}].slice(-MAX_EVENTS);
  }
  function mastery(story,state) {
    const index=state.choices["6"];
    if(!integer(index,0,5))return null;
    const quality=story.chapters[6].options[index].quality;
    return {
      status:quality===2?"demonstrated":quality===1?"developing":"not-yet-demonstrated",
      quality,independent:true,chapter:7,choiceIndex:index,
      objectives:["Jointly own the decision","Express a respectful boundary","Regulate one's own response"],
      summary:quality===2?
        "The response protected the joint decision without shaming another person.":
        quality===1?"A useful pause; ownership and follow-through still need to be demonstrated.":
        "This choice did not meet the objective. A respectful repair can follow, without rewriting the original independent score."
    };
  }
  function view(story,raw) {
    storyCheck(story);
    const state=restore(story,raw);
    const index=state.chapter,chapter=story.chapters[index];
    const chosen=state.choices[String(index)];
    const choice=integer(chosen,0,5)?chapter.options?.[chosen]:null;
    const repair=state.repairs[String(index)]||null;
    const repairRequired=Boolean(choice && choice.quality===0 && !chapter.mastery);
    const needsRepair=repairRequired && !repair && index===state.completed;
    let storyText=chapter.story;
    if(index===7 && Array.isArray(story.endings)) {
      const selected=state.choices["6"];
      storyText=integer(selected,0,5)?(story.endings[selected]||ENDING_FALLBACK):chapter.story;
    }
    const status=mastery(story,state);
    const active=index===state.completed && state.completed<8;
    return {
      state,chapter,index,storyText,choice,choiceIndex:integer(chosen,0,5)?chosen:null,
      outcome:choice?.impact||null,coaching:choice?.coach||null,
      repair,repairOptions:REPAIR_OPTIONS,needsRepair,
      canChoose:active && Boolean(chapter.options) && !choice,
      canRepair:active && needsRepair,
      canAdvance:active && (!chapter.options || Boolean(choice)) && !needsRepair,
      mastery:status,complete:state.completed===8,
      readOnly:index<state.completed,finishLabel:index===7?"Finish this Deep Dive":"Complete chapter "+(index+1)
    };
  }
  function transition(story,raw,action) {
    const state=restore(story,raw);
    if (!action || typeof action!=="object" || typeof action.type!=="string")
      return {state,changed:false,reason:"invalid-action"};
    const i=state.chapter,chapter=story.chapters[i],key=String(i);
    let changed=false,reason=null;
    if(action.type==="navigate") {
      if(integer(action.chapter,0,Math.min(7,state.completed)) && action.chapter!==state.chapter){
        state.chapter=action.chapter;changed=true;
      }else reason="unavailable-chapter";
    } else if(i!==state.completed || state.completed===8) {
      reason="read-only";
    } else if(action.type==="choose") {
      if(!chapter.options || own(state.choices,key) || !integer(action.index,0,5))
        reason="choice-unavailable";
      else {state.choices[key]=action.index;event(state,"choose",{index:action.index});changed=true;}
    } else if(action.type==="repair") {
      const choice=chapter.options?.[state.choices[key]];
      if(!choice || choice.quality!==0 || chapter.mastery || own(state.repairs,key) ||
         !["own","deflect"].includes(action.repair))reason="repair-unavailable";
      else {
        state.repairs[key]={attempts:1,selected:action.repair,guided:action.repair==="deflect"};
        event(state,"repair",{repair:action.repair});changed=true;
      }
    } else if(action.type==="advance") {
      const choice=chapter.options?.[state.choices[key]];
      if(chapter.options && !choice)reason="choice-required";
      else if(choice && choice.quality===0 && !chapter.mastery && !own(state.repairs,key))
        reason="repair-required";
      else {
        event(state,"advance");
        state.completed=Math.min(8,state.completed+1);
        state.chapter=Math.min(7,state.completed);
        changed=true;
      }
    } else reason="unknown-action";
    return {state,changed,reason};
  }
  return Object.freeze({VERSION,REPAIR_OPTIONS,storyCheck,fresh,restore,view,transition,mastery});
});
