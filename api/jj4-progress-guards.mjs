// Require visible progression, not a reprise of the prior emotional tableau.
const norm=x=>String(x||"").toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ").trim();
const key=s=>norm(s).replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(w=>w.length>2&&!["the","and","was","his","her","jack","jill","that","this","with","them","for","but","from","their","she","him","have","they","another"].includes(w));
const overlap=(a,b)=>{const x=new Set(key(a)),y=new Set(key(b));return x.size&&y.size?[...x].filter(w=>y.has(w)).length/Math.min(x.size,y.size):0};
const decision=/\b(?:decid(?:e|ed|es)|refus(?:e|ed|es)|reject(?:s|ed)?|agree(?:s|d)?|promised|schedule(?:s|d)?|set(?:s)?\s+(?:an?\s+)?(?:alarm|timer|date|reminder)|write(?:s)?|wrote|mark(?:s|ed)?|text(?:s|ed)?|sent|call(?:s|ed)?|book(?:s|ed)?|research(?:es|ed)?|ask(?:s|ed)?|answer(?:s|ed)?|offer(?:s|ed)?|chose|pack(?:s|ed)?|open(?:s|ed)?|peel(?:s|ed)?|tore|broke|move(?:s|d)?|slid|took|left|returned|postpone(?:s|d)?|cancel(?:s|led)?|paid|check(?:s|ed)?|replace(?:s|d)?|fix(?:es|ed)?|repair(?:s|ed)?)\b/i;
export function checkSceneProgression(history=[],story="",phaseIndex=0){
 const text=String(story||"").trim();
 if(!text)return {ok:false,reason:"The scene is empty."};
 if(phaseIndex<=0||!history.length)return {ok:true};
 const score=overlap(history.at(-1)?.body||"",text);
 if(score>0.91)return {ok:false,reason:"The new scene mostly restages the preceding scene."};
 if(phaseIndex===5){
  const lines=text.match(/[^.!?]+[.!?]?/g)||[];
  const concrete=lines.some(s=>/\b(?:Jack|Jill|he|she)\b/i.test(s)&&decision.test(s)&&
   !/\b(?:neither|not|never|without|still|remains|unopened|unbroken)\b[^.!?]{0,28}\b(?:opened|broken|moved|paid|left)\b/i.test(s)&&
   !/\b(?:box|note|watch|keys)\b[^.!?]{0,85}\b(?:taps?|rests?|looks?|nods?|smiles?|sits?|stays?|remains?)\b/i.test(s));
  if(!concrete)return {ok:false,reason:"Reflection repeats the existing truce without an observable new behavior or consequence. Add one earned after-effect, never a forced agreement."};
 }
 return {ok:true,overlap:score};
}
