// Require visible progression, not a reprise of the prior emotional tableau.
const norm=x=>String(x||"").toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ").trim();
const key=s=>norm(s).replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(w=>w.length>2&&!["the","and","was","his","her","jack","jill","that","this","with","them","for","but","from","their","she","him","have","they","another"].includes(w));
const overlap=(a,b)=>{const x=new Set(key(a)),y=new Set(key(b));return x.size&&y.size?[...x].filter(w=>y.has(w)).length/Math.min(x.size,y.size):0};
const decision=/\b(?:decid(?:e|ed|es)|refus(?:e|ed|es)|reject(?:s|ed)?|agree(?:s|d)?|promised|schedule(?:s|d)?|set(?:s)?\s+(?:an?\s+)?(?:alarm|timer|date|reminder)|write(?:s)?|wrote|mark(?:s|ed)?|text(?:s|ed)?|sent|call(?:s|ed)?|book(?:s|ed)?|research(?:es|ed)?|ask(?:s|ed)?|answer(?:s|ed)?|offer(?:s|ed)?|chose|pack(?:s|ed)?|open(?:s|ed)?|peel(?:s|ed)?|tore|broke|move(?:s|d)?|slid|took|left|returned|postpone(?:s|d)?|cancel(?:s|led)?|paid|check(?:s|ed)?|replace(?:s|d)?|fix(?:es|ed)?|repair(?:s|ed)?)\b/i;
// Detect stale rhetorical images without confusing a persistent physical
// object (or a character's catchphrase) with a repeated joke.
const rhetorical=/\b(?:museum|monument|symboliz(?:es|ed|ing)?|symbol|signali[sz](?:es|ed|ing)?|signal(?:s|ing)?|wedge|testament|metaphor|shadow|ghost|truce|fragile trust|silence thickens|unfinished business|stand(?:s|ing) between them)\b/i;
const common=new Set(["the","and","was","his","her","jack","jill","their","them","than","that","this","with","but","for","from","into","about","onto","under","while","over","our","your","their","they","have","could","would","should","between","them","box","microwave","counter","scene","same","unopened","still","sealed"]);
const topicWords=x=>norm(x).replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(w=>w.length>2&&!common.has(w));
const rhetoricalPassages=scene=>String(scene||"").split(/[.!?](?:\s+|$)/).map(x=>x.trim()).filter(x=>rhetorical.test(x));
export function repeatedRhetoricalImage(history=[],story=""){
 const previous=history.flatMap(h=>rhetoricalPassages(h.body||""));
 const fresh=rhetoricalPassages(story);
 for(const now of fresh){
  const a=new Set(topicWords(now));
  for(const old of previous){
   const b=new Set(topicWords(old));
   const shared=[...a].filter(x=>b.has(x));
   // A repeated distinctive image uses the same 3+ content words;
   // simply mentioning the same prop or tension is not a new gag.
   if(shared.length>=3&&shared.length/Math.max(3,Math.min(a.size,b.size))>=0.45)
    return {old,now};
  }
 }
 return null;
}
const symbolicEnding=/\b(?:symboliz(?:es|ed|ing)?|signal(?:s|ed|ing)?|testament|unresolved tension|fragile trust|unspoken agreement|silent wedge|silent testament|marks? (?:an?|the) (?:impasse|stalemate)|their (?:ongoing|unsettled) (?:tension|trust)|unfinished business|stands? (?:between|as) (?:them|a symbol))\b/i;
const consequentialChoice=/\b(?:writ(?:es|ten|ing)|wrote|mark(?:s|ed)?|send(?:s|ing)?|sent|call(?:s|ed)?|book(?:s|ed)?|schedule(?:s|d)?|set(?:s)?\s+(?:a\s+)?(?:reminder|timer|date|deadline|appointment)|refus(?:es|ed)?|declin(?:es|ed)?|reject(?:s|ed)?|decid(?:es|ed)?|choos(?:es|en)?|chose|leav(?:es|ing)|left|return(?:s|ed)?|chang(?:es|ed)?|postpon(?:es|ed)?|cancel(?:s|ed)?|promis(?:es|ed)?\s+to|agree(?:s|d)?\s+to|committ?(?:s|ed)?\s+to|pay(?:s|ing)?|paid|sign(?:s|ed)?|open(?:s|ed)?\s+(?:the\s+)?(?:door|box|letter|envelope)|tear(?:s|ing)?\s+up|tore\s+up|reveal(?:s|ed)?|discover(?:s|ed)?|shows?\s+(?:the\s+)?(?:receipt|message|estimate)|hand(?:s|ed)?\s+over\s+(?:the\s+)?(?:receipt|keys|phone|document))\b/i;
const negated=/\b(?:never|not|won't|don't|without|wouldn't|can't|couldn't|didn't|refused to)\b/i;
export function hasNewConsequence(history=[],story=""){
 const lines=String(story||"").split(/(?<=[.!?])\s+/);
 return lines.some(line=>{
  if(!/\b(?:Jack|Jill|he|she)\b/i.test(line)||!consequentialChoice.test(line))return false;
  const before=line.slice(0,Math.max(0,line.search(consequentialChoice)));
  if(negated.test(before.slice(-38)))return false;
  // A line that only summarizes how the object represents the dispute
  // is not a new causal development.
  if(symbolicEnding.test(line)&&!/\b(?:writes?|wrote|sends?|sent|calls?|called|refuses?|decides?|left|opens?|opened)\b/i.test(line))
   return false;
  return true;
 });
}
export function sceneProgressionHints(history=[]){
 const images=history.flatMap(h=>rhetoricalPassages(h.body||"")).slice(-4);
 return {
  rhetoricalImagesAlreadySpent:images.map(s=>s.slice(0,180)),
  previouslyShownSceneCount:history.length,
  requiredNextBeat:"Open on a new, visible event. Each person responds independently; make one choice matter through a consequence or obstacle. Do not repeat prior apologies, jokes, metaphors, or the same decision. End on the actual changed situation, never an abstract description of fragile trust."
 };
}
export function checkSceneProgression(history=[],story="",phaseIndex=0){
 const text=String(story||"").trim();
 if(!text)return {ok:false,reason:"The scene is empty."};
 if(phaseIndex<=0||!history.length)return {ok:true};
 const score=overlap(history.at(-1)?.body||"",text);
 if(score>0.91)return {ok:false,code:"duplicate_scene",severity:"hard",reason:"The new scene mostly restages the preceding scene."};
 const staleImage=repeatedRhetoricalImage(history,text);
 if(staleImage)return {ok:false,code:"repeated_image",severity:"soft",
  reason:"This scene repeats a previous rhetorical image or joke. Retire that image. Show a new choice or obstacle instead of revisiting the same metaphor."};
 // A final reflection is earned by an after-effect, not an object's symbolic
 // presence or one more abstract remark about their relationship.
 if(phaseIndex===5&&!hasNewConsequence(history,text))
  return {ok:false,code:"no_after_effect",severity:"soft",
   reason:"The ending needs an observable new boundary, decision, discovery, practical follow-through or meaningful cost. Another apology, nod, removed note, or object-as-symbol does not count."};
 const ending=String(text).trim().split(/(?<=[.!?])\s+/).slice(-1)[0]||"";
 if(phaseIndex>=2&&symbolicEnding.test(ending)&&!hasNewConsequence(history,text))
  return {ok:false,code:"abstract_ending",severity:"soft",
   reason:"Remove the abstract final sentence and show the visible after-effect of the latest choice."};
 if(phaseIndex===5){
  const lines=text.match(/[^.!?]+[.!?]?/g)||[];
  const concrete=lines.some(s=>/\b(?:Jack|Jill|he|she)\b/i.test(s)&&decision.test(s)&&
   !/\b(?:neither|not|never|without|still|remains|unopened|unbroken)\b[^.!?]{0,28}\b(?:opened|broken|moved|paid|left)\b/i.test(s)&&
   !/\b(?:box|note|watch|keys)\b[^.!?]{0,85}\b(?:taps?|rests?|looks?|nods?|smiles?|sits?|stays?|remains?)\b/i.test(s));
  if(!concrete)return {ok:false,reason:"Reflection repeats the existing truce without an observable new behavior or consequence. Add one earned after-effect, never a forced agreement."};
 }
 return {ok:true,overlap:score};
}
