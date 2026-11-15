// Reusable quality guards for simulated Jack & Jill episodes.
// Keep this deterministic: a model cannot certify its own visible evidence.
const normalize=value=>String(value||"").normalize("NFKC").replace(/[â€˜â€™]/g,"'").replace(/[â€œâ€]/g,'"').replace(/\s+/g," ").trim().toLowerCase();

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
  if(!POLICY_TOPIC.test(sentence)||C¶»§q«^