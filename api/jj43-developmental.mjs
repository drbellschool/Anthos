// 4.3 developmental editorial contract. Phase IDs remain stable for old rooms.
export const DEVELOPMENTAL_PHASES=Object.freeze([
 {id:"hook",title:"Recognize",objective:"Identify the concrete problem and competing legitimate needs.",evidence:"Identifies a need or ignores it; notices the decision before acting."},
 {id:"conflict",title:"Interpret",objective:"Distinguish assumptions, facts and each partner's perspective.",evidence:"Checks an assumption or substitutes blame for understanding."},
 {id:"discovery",title:"Navigate",objective:"Try a meaningful response and encounter its consequence.",evidence:"Listens, proposes, dismisses or acts unilaterally."},
 {id:"reattempt",title:"Regulate",objective:"Respond to emotional pressure without assuming improvement.",evidence:"Remains engaged, takes a practical step, attacks or withdraws."},
 {id:"outcome",title:"Differentiate",objective:"Hold a personal position while staying open to the other person.",evidence:"Owns a choice, respects autonomy or demands surrender."},
 {id:"reflection",title:"Discover",objective:"Reflect on actual successes, failures and unresolved issues.",evidence:"Names a concrete consequence and a voluntary next step."}
]);
export const BEHAVIOR_SCALE=Object.freeze(["Counterproductive","Resistant","Developing","Constructive","Highly constructive"]);
export const MICROWAVE_RUBRICS=Object.freeze({
 "s-decisions":["Controls or evades their own responsibility","Avoids a difficult choice or responsibility","Recognizes the dilemma without concrete responsibility","Owns a decision and maintains a legitimate boundary","Takes responsibility while weighing competing needs without control"],
 "g-start":["Opens with an attack or contempt","Opens with accusation or defensiveness","Raises a concern with mixed blame","Raises a concern directly and respectfully","Expresses a specific concern and invites the other view without blame"],
 "g-influence":["Rejects or excludes the partner's input","Dismisses or only superficially hears input","Acknowledges input without clear consideration","Seriously considers another perspective","Incorporates a partner's legitimate concern while maintaining autonomy"]
});
const DEFAULTS=[[5,3,4],[5,5,4],[5,3,5],[5,4,3],[5,3,5],[5,4,5]];
export function normalizeDevelopmentalFlow(input,selected=[]){
 const ids=[...new Set(selected.filter(id=>typeof id==="string"&&id))].slice(0,3);
 return Object.fromEntries(DEVELOPMENTAL_PHASES.map((p,i)=>{
  const source=input?.[p.id]||{};
  const text=(v,fallback,max)=>typeof v==="string"&&v.trim()?v.trim().slice(0,max):fallback;
  return [p.id,{objective:text(source.objective,p.objective,600),
   evidence:text(source.evidence,p.evidence,600),
   emphasis:Object.fromEntries(ids.map((id,j)=>{
    const v=source.emphasis?.[id];
    return [id,Number.isInteger(v)&&v>=1&&v<=5?v:DEFAULTS[i][j]||3];
   }))}];
 }));
}
export function weightedSkillRating(ratings,emphasis){
 let sum=0,weight=0;
 for(const [id,r] of Object.entries(ratings||{})){
  if(!Number.isInteger(r)||r<1||r>5)continue;
  const w=emphasis?.[id];
  if(!Number.isInteger(w)||w<1||w>5)continue;
  sum+=r*w;weight+=w;
 }
 return weight?sum/weight:null;
}
export const SKILL_IDS43=["s-decisions","g-start","g-influence"];
export const ADVICE_CATALOG43=Object.freeze({
 // Ratings are independent, action-specific evidence anchors, not
 // measurements of customers' marriage or a validated questionnaire.
 buy:{behavior:[2,null,1],impact:-2},
 consult:{behavior:[4,null,4],impact:1},
 wait:{behavior:[3,null,null],impact:0},
 accountable:{behavior:[4,null,3],impact:1},
 firm:{behavior:[3,null,null],impact:0},
 defensive:{behavior:[2,2,2],impact:-2},
 own:{behavior:[4,null,4],impact:1},
 hear:{behavior:[3,null,4],impact:1},
 defend:{behavior:[2,null,2],impact:-1},
 open:{behavior:[2,null,1],impact:-2},
 concrete:{behavior:[4,null,null],impact:1},
 talk:{behavior:[3,null,null],impact:0},
 unsettled:{behavior:[null,null,null],impact:0},
 call:{behavior:[5,null,null],impact:2}
});
export const ratingObject43=values=>Object.fromEntries(SKILL_IDS43.map((id,i)=>[id,values[i]??null]));
export function observedRatings43(action,task){
 const values=[...(ADVICE_CATALOG43[action]?.behavior||[null,null,null])];
 // "wait" with no purchase is not itself evidence that the other person
 // was heard. Friday's seal agreement explicitly considers further input.
 if(action==="wait"&&task===4)return ratingObject43([4,null,4]);
 return ratingObject43(values);
}
// Conservative offline advice rubric. Unlike action scores, this rates
// explicit recommendations, and leaves ambiguous dimensions unobserved.
export function offlineCoaching43(text){
 const s=String(text||"").toLowerCase().replaceAll("’","'");
 const matches=pattern=>pattern.test(s);
 const negHostile=matches(/\b(?:don't|do not|never)\s+(?:blame|attack|lecture|yell|insult|demand|punish)\b/);
 const hostile=!negHostile&&matches(/\b(?:blame|attack|lecture|yell|insult|demand|punish|make (?:him|her))\b/);
 const unilateral=matches(/\b(?:without (?:asking|calling|consulting|talking)|just buy it|open it now)\b/);
 const own=matches(/\b(?:own|admit|acknowledge|take responsibility|follow through|keep your word|call the (?:repair )?shop|model number)\b/);
 const listen=matches(/\b(?:listen|hear|consider|ask why|ask what|talk to|call jack|consult|decide together|compare)\b/);
 const gentle=matches(/\b(?:respectfully|calmly|without (?:blame|attacking|criticism)|don't (?:blame|attack|lecture)|do not (?:blame|attack|lecture)|gentle|explain (?:your|why))\b/);
 return ratingObject43([hostile||unilateral?2:own?4:null,hostile?1:gentle?4:null,unilateral||hostile?1:listen?4:null]);
}
export function validateCoaching43(candidate,text){
 if(!candidate||!Array.isArray(candidate.ratings)||candidate.ratings.length!==3)return null;
 const source=String(text||"").toLowerCase();
 const output={};
 for(const id of SKILL_IDS43){
  const items=candidate.ratings.filter(x=>x?.skill===id);
  if(items.length!==1)return null;
  const x=items[0];
  if(x.score===null){output[id]=null;continue}
  if(!Number.isInteger(x.score)||x.score<1||x.score>5||typeof x.evidence!=="string"||x.evidence.trim().length<4||
   !source.includes(x.evidence.trim().toLowerCase()))return null;
  output[id]=x.score;
 }
 return output;
}
