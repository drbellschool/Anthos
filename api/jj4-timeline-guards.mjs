// Cross-petal factual backstop for a synthetic six-scene QA room.
// This is deliberately conservative: only unambiguous physical replay,
// contradiction and evidence-free consensus trigger a hard rewrite.
const text=x=>String(x||"").replace(/\s+/g," ").trim();
const sceneBodies=history=>(history||[]).map(x=>typeof x==="string"?x:x?.body||"").filter(Boolean);

const watchFastened=s=>/\b(?:tighten(?:s|ed|ing)?|fasten(?:s|ed|ing)?|adjust(?:s|ed|ing)?)\b[^.!?]{0,52}\b(?:his|jack'?s|the)\s+watch(?:\s+strap)?\b/i.test(s);
const watchUnfastened=s=>/\b(?:unfasten(?:s|ed|ing)?|remove(?:s|d)?|take(?:s|n)? off)\b[^.!?]{0,50}\bwatch\b/i.test(s);

function lastPhysicalLocation(history){
 let location="";
 for(const body of sceneBodies(history)){
  const actions=[
   ...body.matchAll(/\b(?:jack|jill|they|both|the couple|he|she)\b[^.!?]{0,65}\b(?:walk(?:s|ed)?|move(?:s|d)?|head(?:s|ed)?|step(?:s|ped)?|go(?:es|ne)?|went|bring(?:s)?|brought|return(?:s|ed)?|follow(?:s|ed)?)\b[^.!?]{0,55}\b(?:to|onto|into|back to|from [a-z -]+ to)\s+(?:the\s+)?(porch|kitchen|motel office|parking lot|beach)\b/gi),
   ...body.matchAll(/\b(?:jack|jill|they|both)\b[^.!?]{0,50}\b(?:sat|sit|settle(?:s|d)?|remain(?:s|ed)?|stay(?:s|ed)?)\b[^.!?]{0,42}\b(?:on|at|in)\s+(?:the\s+)?(porch|kitchen|motel office|parking lot|beach)\b/gi)
  ].map(m=>({index:m.index,dest:m[1].toLowerCase()})).sort((a,b)=>a.index-b.index);
  if(actions.length)location=actions.at(-1).dest;
 }
 return location;
}
export function committedTimelineViolation(priorHistory,currentScene){
 const prior=sceneBodies(priorHistory),now=text(currentScene);
 if(!prior.length||!now)return {ok:true};
 const committed=prior.join(" ");
 // A completed adjustment cannot be performed as new if no reverse action
 // occurred in between. Checking a watch is NOT the same as fastening it.
 if(watchFastened(now)&&watchFastened(committed)&&!watchUnfastened(committed))
  return {ok:false,code:"replayed_completed_action",reason:"Jack already fastened or tightened the watch in an earlier scene. This is not a new action."};
 // A person who already left for a meeting cannot perform that original
 // front-door goodbye again unless the story showed their return. This guard
 // only catches explicit physical restaging, not phone calls from the car.
 const leftForMeeting=/(?:jack[’']?s?\s+(?:car\s+drives?\s+away|(?:quick|brisk|hurried)\s+exit)|jack[^.!?]{0,110}\b(?:heads?\s+out|left\s+(?:quickly|before|for|the\s+house)|walks?\s+out|exits?\s+(?:the\s+)?house|drives?\s+away)|jack[^.!?]{0,55}\b(?:sat|sits|waits|waited)\s+in\s+(?:his|the)\s+car\b)/i;
 const arrivedBack=/(?:jack[^.!?]{0,80}\b(?:came|comes|returned|returns|arrived|arrives|walked|walks)\s+(?:back\s+)?(?:home|inside|into\s+the\s+(?:house|kitchen))\b)/i;
 // Search the sequence, not one giant combined transcript: a return after a
 // departure clears it, a subsequent fresh departure re-establishes it.
 let jackAlreadyAway=false;
 for(const past of prior){
  if(arrivedBack.test(past))jackAlreadyAway=false;
  if(leftForMeeting.test(past))jackAlreadyAway=true;
 }
 const replayedDeparture=/\bjack\b[^.!?]{0,95}\b(?:pauses?\s+at\s+(?:the\s+)?(?:kitchen\s+)?door(?:way)?|(?:stands?|waits?)\s+(?:at|by)\s+(?:the\s+)?(?:kitchen\s+)?door(?:way)?|closes?\s+(?:the\s+)?door|(?:grabs?|reaches?\s+for)\s+(?:his\s+)?keys|(?:hurried|hurries|heads?|walks?)\s+(?:out|to\s+(?:the\s+)?door)|fastens?\s+(?:his\s+)?watch|(?:stands?|sits?)\s+(?:in|at)\s+(?:the\s+)?kitchen)\b/i;
 if(jackAlreadyAway&&replayedDeparture.test(now)&&!arrivedBack.test(now))
  return {ok:false,code:"replayed_departure",reason:"Jack already left for the meeting. A new front-door goodbye requires an actual narrated return; otherwise show him where he is now."};
 // The previous scene already established a porch arrival. Do not put them
 // back in the kitchen to show that exact same arrival, without a return trip.
 const previousLocation=lastPhysicalLocation(priorHistory);
 const fromKitchenToPorch=/\b(?:from\s+(?:the\s+)?kitchen\s+to\s+(?:the\s+)?porch|(?:walk|move|step|go|head|bring|take|return)(?:s|ed|ing)?\s+[^.!?]{0,55}\b(?:out\s+to|to|onto)\s+(?:the\s+)?porch)\b/i;
 const backInside=/(?:back|return(?:s|ed)?|walk(?:s|ed)?|step(?:s|ped)?)\s+(?:into|inside|to)\s+(?:the\s+)?kitchen/i;
 if(previousLocation==="porch"&&fromKitchenToPorch.test(now)&&!backInside.test(now))
  return {ok:false,code:"location_replay",reason:"The characters already reached the porch. Show a new action there or narrate their actual return to the kitchen first."};
 // Keep evidence-free omniscient agreement out of strict QA stories. An
 // explicit acceptance can come from a spoken yes, agreement or clear nod
 // immediately after a proposal. Merely asking 'can we agree' is not consent.
 const consensus=/\b(?:they agreed|both agreed|mutually agreed|they decided together|the couple agreed)\b/i;
 if(consensus.test(now)){
  const accepted=/\b(?:yes|i agree|i accept|all right|alright|okay|ok|i'm in|let's do it|sounds good|deal)\b/i.test(now)||
   /\b(?:jack|jill)\s+(?:nods?|nodded|agrees?|agreed|accepts?|accepted)\b/i.test(now);
  if(!accepted)return {ok:false,code:"unearned_agreement",reason:"A narrator claimed joint agreement without a shown acceptance. Show the actual reply or describe the offer as unresolved."};
 }
 return {ok:true};
}
