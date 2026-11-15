// Reusable private-coach turn router. Routing happens before scene advancement.
// High-confidence control requests are deterministic: no model may reinterpret a
// request to pause as relationship advice. Ambiguous messages remain advice.
const clean=value=>typeof value==="string"?value.trim().replace(/\s+/g," "):"";
const NEGATIVE_PREFIX=/^(?:tell|ask|have|make|advise|encourage|suggest to|you should tell)\s+(?:jack|jill|him|her|them)\b/i;
const DIRECT_PAUSE=/^(?:please\s+)?(?:pause|stop|hold)(?:\s+(?:this|the|my|our))?\s+(?:episode|story|pilot|session|conversation|deep dive)\b/i;
const FIRST_PERSON_PAUSE=/\b(?:i|we)\s+(?:need|want|would like|have)\s+(?:to\s+)?(?:take\s+(?:a\s+)?break|pause|stop\s+(?:participating|the\s+episode|the\s+story|coaching))\b/i;
const PAUSE_REQUEST=/\bplease\s+(?:pause|stop)\s+(?:this|the|my|our)?\s*(?:episode|story|pilot|session|conversation|deep dive)\b/i;
const NO_ADVICE=/^(?:i\s+(?:have|got)\s+no\s+(?:advice|idea)|i\s+(?:don't|do not|can't|cannot)\s+(?:know\s+what\s+to\s+say|want\s+to\s+advise|have\s+an\s+answer)|(?:no\s+advice|i\s+pass|pass))\b/i;
const CORRECTION=/^(?:(?:no|actually)[,!:.]?\s+)?(?:that(?:'s| is)\s+(?:wrong|not\s+(?:right|what\s+happened))|you\s+(?:got|mixed\s+up|said)\b|(?:jack|jill)\s+(?:didn't|did not|never|wasn't|was not)\b)/i;
const UNSAFE=/(?:cut\s+off\s+(?:her|his|their)\s+(?:bank\s+)?access|force\s+(?:him|her|them)\s+to|threaten\s+(?:him|her|them)|(?:hit|hurt|slap|punch)\s+(?:him|her|them)|(?:coerce|blackmail)\s+(?:him|her|them))/i;
export function classifyCoachTurn(raw){
 const message=clean(raw).slice(0,900);
 if(!message)return {kind:"empty",risk:"none"};
 if(!NEGATIVE_PREFIX.test(message)&&(DIRECT_PAUSE.test(message)||FIRST_PERSON_PAUSE.test(message)||PAUSE_REQUEST.test(message)))
  return {kind:"pause",risk:"none"};
 if(NO_ADVICE.test(message))return {kind:"no_advice",risk:"none"};
 if(CORRECTION.test(message)&&!/(?:tell|say|ask|advise)\s+(?:jack|jill|him|her)/i.test(message))
  return {kind:"correction",risk:"none"};
 if(message.endsWith("?")&&!/\b(?:tell|advise|suggest|make|have)\s+(?:jack|jill|him|her)\b/i.test(message))
  return {kind:"question",risk:"none"};
 return {kind:"advice",risk:UNSAFE.test(message)?"potentially_coercive":"none"};
}
export const PRIVATE_ANSWER_SCHEMA={type:"object",additionalProperties:false,
 properties:{reply:{type:"string"}},required:["reply"]};
export const MAX_PRIVATE_QUESTIONS_PER_PHASE=2;
export function privateQuestionPrompt({character,question,scenes,mine,episode}){
 return {
  character,question,
  lastSharedScenes:(scenes||[]).slice(-3).map(x=>({phase_index:x.phase_index,body:String(x.body||"").slice(0,1400)})),
  ownPrivateConversation:(mine||[]).filter(x=>["prompt","question","reply"].includes(x.kind)).slice(-5).map(x=>({kind:x.kind,body:String(x.body||"").slice(0,700)})),
  editorialGrounding:{premise:episode?.premise,context:episode?.sceneSetting},
  boundaries:[
   "Answer in first person AS "+character+" to your PRIVATE coach, in at most 65 words.",
   "This is a clarification, not a scene. Do not start a new event, action, or coaching checkpoint.",
   "Never reveal, infer, or quote the other coach's private messages.",
   "A coach's correction may be wrong. Preserve facts established by the actual shared story rather than believing an unsupported claim.",
   "Do not give real-life therapy, financial or legal advice, or make promises about the participant's real marriage.",
   "If the coach asks to pause, direct them to the Pause Episode control rather than advancing.",
   "Return JSON with a single reply field."
  ]
 };
}
