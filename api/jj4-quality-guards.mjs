// Reusable quality guards for simulated Jack & Jill episodes.
// Keep this deterministic: a model cannot certify its own visible evidence.
const normalize=value=>String(value||"").normalize("NFKC").replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g," ").trim().toLowerCase();

function appears(haystack,excerpt){
 const a=normalize(excerpt);
 return a.length>=18&&normalize(haystack).includes(a);
}
const POLICY_TOPIC=/\b(return|returns|refund|refunded|exchange|warranty|restocking|cancellation|cancelation)\b/i;
const POLICY_TIME=/\b(?:\d{1,3}|one|two|seven|fourteen|thirty|sixty|ninety)\s*[- ]?(?:business\s*)?(?:day|week|month|year)s?\b/i;
const POLICY_RULE=/\b(?:policy|must|require[sd]?|only|eligible|allows?|guarantees?|no refund|nonrefundable|restocking fee|fee of)\b/i;
const ASSERTIVE_TIME=/\b(?:we|they|store|policy|receipt|warranty|customer|you|it)\s+(?:have|has|had|gives?|states?|says?|allows?|permits?|requires?|is|was|will)\b/i;
const CONDITIONAL=/\b(?:what if|maybe|perhaps|might|could|should|wonder|whether|don't know|do not know|not sure|we need to check|check if|check whether|ask if|ask whether|assume|hypothetical)\b/i;

export function unsupportedExternalPolicyClaims(scene,approvedFacts=[]){
 const sentences=String(scene||"").replace(/\n/g," ").match(/[^.!?]+[.!?]?/g)||[];
 const factText=normalize((approvedFacts||[]).join(" "));
 const rejected=[];
 for(const original of sentences){
  const sentence=normalize(original);
  if(!POLICY_TOPIC.test(sentence)||CONDITIONAL.test(sentence))continue;
  const timed=POLICY_TIME.test(sentence)&&(ASSERTIVE_TIME.test(sentence)||POLICY_RULE.test(sentence));
  const rule=POLICY_RULE.test(sentence)&&/\b(?:store|policy|return|refund|receipt|warranty)\b/.test(sentence)&&
   /\b(?:must|requires?|required|only|no refund|nonrefundable|restocking fee)\b/.test(sentence);
  if(!timed&&!rule)continue;
  const window=sentence.match(POLICY_TIME)?.[0]||"";
  const concept=sentence.match(POLICY_TOPIC)?.[0]||"";
  // The only permitted sources are immutable authored/seeded facts, never
  // a hallucinated claim that happened to appear in an earlier generated scene.
  const authorized=Boolean(window&&factText.includes(window)&&POLICY_TOPIC.test(factText))||
   Boolean(!window&&concept&&factText.includes(concept)&&
      /(policy|require|must|no refund|nonrefundable|fee)/.test(factText));
  if(!authorized)rejected.push(original.trim());
 }
 return rejected;
}

export const COACH_TRACE_SCHEMA={
 type:"object",additionalProperties:false,
 properties:{jackEvidence:{type:"string"},jillEvidence:{type:"string"},falloutEvidence:{type:"string"}},
 required:["jackEvidence","jillEvidence","falloutEvidence"]
};
export function checkCoachingTrace(story,trace,coachedRoles=[]){
 if(!coachedRoles?.length)return {ok:true};
 if(!trace||typeof trace!=="object")return {ok:false,reason:"No visible coaching evidence was supplied."};
 for(const role of coachedRoles){
  const field=role==="jack"?"jackEvidence":"jillEvidence";
  const evidence=trace[field]||"";
  if(!appears(story,evidence))return {ok:false,reason:"The coached "+role+" response is missing from the visible scene."};
  const context=normalize(evidence);
  if(!new RegExp("\\b"+role+"\\b").test(context)&&!/\\b(?:i|my|me)\\b/.test(context))
   return {ok:false,reason:"The coached "+role+" behavior has no identifiable speaker."};
 }
 if(!appears(story,trace.falloutEvidence))return {ok:false,reason:"The next scene did not visibly show consequences of coaching."};
 return {ok:true};
}
export function checkSceneLength(scene,min=70,max=125){
 const count=normalize(scene).split(/\s+/).filter(Boolean).length;
 return {ok:count>=min&&count<=max,words:count,range:[min,max]};
}
export function asksForHumor(text){
 return /\b(?:joke|joking|funny|humou?r|laugh|laughing|museum|sarcastic|tease|teasing|quip|punchline|comedy|dryly)\b/i.test(String(text||""));
}


/**
 * A newly boxed microwave cannot audibly run until the story has shown a
 * power connection and setup. Previous scenes may supply that evidence.
 * This narrow guard avoids turning generic appliance metaphors into false
 * physical facts, and it does not imply any retailer or product policy.
 */
export function unearnedMicrowaveActivation(scene,previousScenes=[]){
 const now=String(scene||"");
 if(!/\bmicrowave\b/i.test(now)||!/\b(?:hums?|humming|beeps?|beeping|starts? running|heats?|heating)\b/i.test(now))
  return false;
 const completed=[...(previousScenes||[]).map(s=>typeof s==="string"?s:s?.body||""),now].join(" ");
 const connected=/\b(?:plug(?:ged|s|ging)?(?:\s+\w+){0,3}\s+in|connect(?:ed|s)?\s+(?:it\s+)?to\s+(?:the\s+)?(?:outlet|power)|install(?:ed|ation)?(?:\s+\w+){0,4}\s+completed|wired?\s+(?:it\s+)?(?:up|in))\b/i.test(completed);
 const asserted=/\b(?:microwave\s+(?:hums?|humming|beeps?|beeping|starts? running|heats?|heating)|(?:hums?|humming|beeps?|beeping)\s+(?:from\s+)?(?:the\s+)?(?:new\s+)?microwave)\b/i.test(now);
 return asserted&&!connected;
}


/**
 * Test-only physical-continuity check. A character can change locations,
 * but a scene must narrate the movement rather than quietly teleporting.
 * Restrict this to strong locators so ordinary dialogue about destinations
 * never becomes an impossible world-state assertion.
 */
export function abruptLocationJump(previousScene,currentScene){
 const last=String(previousScene||"").slice(-320);
 const first=String(currentScene||"").slice(0,240);
 const places=/\b(?:on|onto|at|in)\s+(?:(?:the|their|a)\s+)?(?:(?:front|back|small|old|worn|family|living-room)\s+)?(porch|couch|sofa|kitchen|bedroom|hallway|driveway|car)\b/gi;
 const from=[...last.matchAll(places)].at(-1)?.[1]?.toLowerCase();
 const to=[...first.matchAll(places)][0]?.[1]?.toLowerCase();
 const same=(a,b)=>a===b||["couch","sofa"].includes(a)&&["couch","sofa"].includes(b);
 if(!from||!to||same(from,to))return {ok:true};
 if(/\b(?:walk(?:s|ed|ing)?|step(?:s|ped|ping)?|move(?:s|d|ing)?|head(?:s|ed|ing)?|return(?:s|ed|ing)?|enter(?:s|ed|ing)?|come|came|go(?:es|ing)?|went|leave|left|cross(?:es|ed|ing)?|follow(?:s|ed|ing)?)\b/i.test(first))
  return {ok:true};
 return {ok:false,reason:"Characters moved from "+from+" to "+to+" without an on-stage transition."};
}

/**
 * The privately coached speaker owns an explicitly quoted line. A renderer
 * may paraphrase advice freely; when it uses that precise quote, however,
 * another actor must not deliver it before the coached actor does.
 * Returns only evidence-based violations (not generic dialogue judgments).
 */
export function wrongSpeakerForQuotedCoaching(story,privateAdvice={}){
 const original=String(story||"");
 for(const [role,advice] of Object.entries(privateAdvice||{})){
  if(!["jack","jill"].includes(role))continue;
  const phrases=[...String(advice||"").matchAll(/[“"]([^”"]{22,140})[”"]/g)]
   .map(m=>m[1].replace(/\s+/g," ").trim()).filter(x=>x.split(/\s+/).length>=4);
  for(const phrase of phrases){
   const canonical=phrase.replace(/[‘’]/g,"'").toLowerCase();
   const quotes=[...original.matchAll(/[“"]([^”"]{12,180})[”"]/g)];
   for(const quote of quotes){
    const spoken=quote[1].replace(/[‘’]/g,"'").toLowerCase().replace(/\s+/g," ");
    if(!spoken.includes(canonical))continue;
    // Prefer the actor whose speech verb introduces this quotation.
    const intro=original.slice(Math.max(0,quote.index-170),quote.index);
    const named=[...intro.matchAll(/\b(Jack|Jill)\b[^.!?]{0,135}?\b(?:says?|said|snaps?|snapped|quips?|quipped|jokes?|joked|mutters?|murmured?|asks?|asked|replies|replied|responds?|answered|adds?|added|blurts?|blurted|fires? back)\b/gi)].at(-1);
    const attributed=named?.[1]?.toLowerCase()||
      [...intro.slice(-95).matchAll(/\b(Jack|Jill)\b/g)].at(-1)?.[1]?.toLowerCase();
    if(attributed&&attributed!==role)
     return {ok:false,reason:"Quoted coaching intended for "+role+" was spoken by "+attributed+"."};
   }
  }
 }
 return {ok:true};
}


/**
 * Validate model-supplied coaching anchors against the visible shared scene.
 *
 * Never manufacture an anchor from a generic Jack/Jill sentence or reaction:
 * doing so lets the story ignore coaching while the gate reports success.
 * A missing or paraphrased anchor must be corrected by the scene generation
 * retry, which can provide an accurate literal excerpt or dramatize the
 * missing decision and fallout. A character may still refuse the advice.
 */
export function groundCoachingEvidence(story,trace={},coachedRoles=[]){
 const source=String(story||"");
 const next={jackEvidence:trace?.jackEvidence||"",jillEvidence:trace?.jillEvidence||"",
  falloutEvidence:trace?.falloutEvidence||""};
 for(const role of coachedRoles||[]){
  if(!["jack","jill"].includes(role))continue;
  const field=role+"Evidence";
  if(!appears(source,next[field]))next[field]="";
 }
 if(!appears(source,next.falloutEvidence))next.falloutEvidence="";
 return next;
}


// Recover evidence lost when a copy-edit rephrases the AI's metadata.
// Use only actual, character-attributed on-stage actions in the final
// structured beats. Never invent a quotation or treat a generic narrator
// claim of "understanding" as proof that coaching had consequences.
const OBSERVABLE_COACH_ACTION=/\b(?:ask(?:s|ed)?|said|says|tell(?:s)?|told|admit(?:s|ted)?|acknowledg(?:es|ed)?|offer(?:s|ed)?|refus(?:es|ed)?|reject(?:s|ed)?|agree(?:s|d)?|promis(?:es|ed)?|propos(?:es|ed)?|insist(?:s|ed)?|challen(?:ges|ged)|request(?:s|ed)?|demand(?:s|ed)?|explain(?:s|ed)?|clarif(?:ies|ied)|decid(?:es|ed)?|choos(?:es|e)|chose|apologiz(?:es|ed)?|open(?:s|ed)?|peel(?:s|ed)?|mov(?:es|ed)?|fold(?:s|ed)?|plac(?:es|ed)?|writ(?:es|ten)?|wrote|pick(?:s|ed)?|pull(?:s|ed)?|hand(?:s|ed)?|set(?:s)?|put(?:s)?|text(?:s|ed)?|call(?:s|ed)?|reach(?:es|ed)?|step(?:s|ped)?|leav(?:es|ing)|left|walk(?:s|ed)?|take(?:s)?|took)\b/i;
const OBSERVABLE_FALLOUT=/\b(?:refus(?:es|ed)?|reject(?:s|ed)?|agree(?:s|d)?|respond(?:s|ed)?|answer(?:s|ed)?|say(?:s)?|said|ask(?:s|ed)?|laugh(?:s|ed)?|smil(?:es|ed)?|win(?:ces|ced)|frown(?:s|ed)?|flinch(?:es|ed)?|withdraw(?:s|n)?|turn(?:s|ed)?|walk(?:s|ed)?|leave(?:s)?|left|mov(?:es|ed)?|pick(?:s|ed)?|open(?:s|ed)?|stop(?:s|ped)?|hold(?:s)?|held|nod(?:s|ded)?|shake(?:s)?|shook|exhal(?:es|ed)?|sigh(?:s|ed)?|fold(?:s|ed)?|reach(?:es|ed)?|tap(?:s|ped)?|step(?:s|ped)?|look(?:s|ed)?)\b/i;
function witnessedSentence(beat,character,verbs){
 const lines=String(beat||"").split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
 const named=character==="both"?/\b(?:Jack|Jill)\b/i:new RegExp("\\b"+character+"\\b","i");
 const s=lines.find(x=>x.length>=20&&named.test(x)&&verbs.test(x));
 return s?s.slice(0,400):"";
}
function roleBeatEvidence(story,beat,role){
 // Never manufacture evidence from a model's claim. Quote the final
 // scene verbatim, and require the coached character to own an action.
 const lines=String(beat||"").split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
 const named=new RegExp("\\b"+role+"\\b","i");
 return lines.find(x=>x.length>=20&&named.test(x)&&
  OBSERVABLE_COACH_ACTION.test(x)&&appears(story,x))||"";
}
export function recoverCoachingEvidence(story,structured,trace,coachedRoles=[]){
 const grounded=groundCoachingEvidence(story,trace,coachedRoles);
 if(checkCoachingTrace(story,grounded,coachedRoles).ok)return grounded;
 const next={...grounded};
 for(const role of coachedRoles){
  if(!["jack","jill"].includes(role))continue;
  const field=role+"Evidence";
  if(appears(story,next[field])&&
    new RegExp("\\b"+role+"\\b","i").test(next[field]))continue;
  const fromBeat=roleBeatEvidence(story,structured?.[role+"Beat"],role);
  if(fromBeat)next[field]=fromBeat;
 }
 if(!appears(story,next.falloutEvidence)){
  // A reaction by the OTHER character is valid fallout. It need not be
  // repeated in the dedicated fallout paragraph.
  const reactions=[
   witnessedSentence(structured?.fallout,"both",OBSERVABLE_FALLOUT),
   ...coachedRoles.map(role=>witnessedSentence(
    structured?.[role==="jack"?"jillBeat":"jackBeat"],
    role==="jack"?"jill":"jack",OBSERVABLE_FALLOUT))
  ];
  next.falloutEvidence=reactions.find(x=>appears(story,x))||"";
 }
 return next;
}
