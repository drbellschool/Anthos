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
