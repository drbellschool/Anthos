// Durable physical continuity for fictional JJ4 characters.
// Never derive locations from private coaching or future authored phases.
// The previous committed state is canonical; new moves need visible evidence.
const clean=x=>String(x||"").replace(/\s+/g," ").trim();
const norm=x=>clean(x).toLowerCase().replace(/[’‘]/g,"'").replace(/[“”]/g,'"');
const placeMap=[
 ["motel parking lot",/\b(?:motel\s+)?parking\s+lot\b/i],
 ["motel office",/\bmotel\s+office\b/i],
 ["kitchen",/\b(?:kitchen(?:\s+doorway|\s+door|\s+counter)?|front\s+door|family\s+calendar)\b/i],
 ["porch",/\bporch\b/i],["car",/\b(?:his|her|the)?\s*car\b/i],
 ["living room",/\b(?:living\s+room|couch)\b/i],["beach",/\bbeach\b/i],
 ["lake",/\blakeside\b|\blake\b/i],["yard",/\byard\b/i],
 ["bedroom",/\bbedroom\b/i],["away",/\baway\b/i],["office",/\boffice\b/i],
 ["restaurant",/\brestaurant\b/i]
];
const movement=/(?:\b(?:sit(?:s|ting)?|sat|settle(?:s|d)?|walk(?:s|ed|ing)?|mov(?:es|ed|ing)|step(?:s|ped|ping)?|enter(?:s|ed|ing)?|return(?:s|ed|ing)?|head(?:s|ed|ing)?|go(?:es|ing|ne)?|went|arriv(?:es|ed|ing)|follow(?:s|ed|ing)?|cross(?:es|ed|ing)?|drive(?:s|n)?|drove|exit(?:s|ed|ing)?|leave(?:s|ing)?|left|came|comes|come|got|gets|climb(?:s|ed|ing)?)\b)/i;
const placeOf=fragment=>{
 const t=norm(fragment);
 for(const [p,pattern] of placeMap)if(pattern.test(t))return p;
 return "";
};
export function initialActorLocations(episode={}){
 const seed=episode.simulationSeed?.actorLocations||{};
 const fallback=placeOf(episode.sceneSetting||episode.simulationSeed?.initialLocation||"");
 const valid=s=>{const location=placeOf(s);return location||"unknown"};
 return {jack:{place:valid(seed.jack||fallback),asOfPhase:-1},
  jill:{place:valid(seed.jill||fallback),asOfPhase:-1}};
}
const sentences=text=>clean(text).match(/[^.!?]+[.!?]?/g)||[];
const roleSubjects=(sentence,role)=>{
 const name=role==="jack"?"Jack":"Jill";
 const regex=new RegExp("\\b"+name+"\\b","ig");
 return [...sentence.matchAll(regex)].map(m=>m.index||0);
};
function observeActor(sentence,role){
 const hits=roleSubjects(sentence,role);
 if(!hits.length)return null;
 const locations=[];
 for(const i of hits){
  const frag=sentence.slice(i,Math.min(i+130,sentence.length));
  // Don't assign Jill's location to Jack just because she appears later
  // in the same sentence as the destination.
  const other=role==="jack"?/\bJill\b/:/\bJack\b/;
  const cut=frag.search(other);
  const own=cut>=0?frag.slice(0,cut):frag;
  const placeMatches=[...own.matchAll(/\b(?:in|at|on|onto|into|inside|by|toward|towards|from|to|entered|entering)\s+(?:the|his|her|their|a)?\s*(?:motel\s+)?(?:kitchen(?:\s+doorway)?|front\s+door|porch|car|parking\s+lot|motel\s+office|living\s+room|couch|beach|lake(?:side)?|yard|bedroom|office|restaurant)\b/gi)];
  const anchored=placeMatches.at(-1);
  if(!anchored)continue;
  const place=placeOf(anchored[0]);
  const verb=own.slice(0,own.indexOf(anchored[0])+anchored[0].length);
  locations.push({place,transition:movement.test(verb),evidence:clean(own).slice(0,220)});
 }
 return locations.at(-1)||null;
}
const same=(a,b)=>norm(a)===norm(b);
export function validateActorLocations(previous,story,phase,changes=[]){
 const prev=previous?.actorLocations||{jack:{place:"unknown",asOfPhase:-1},jill:{place:"unknown",asOfPhase:-1}};
 const next=structuredClone(prev),adjustments=[];
 const actual=clean(story);
 if(!actual)return {ok:false,reason:"Missing visible scene for location tracking."};
 for(const role of ["jack","jill"]){
  const state=next[role]||{place:"unknown",asOfPhase:-1};
  let current=placeOf(state.place)||"unknown";
  const proposed=(Array.isArray(changes)?changes:[]).filter(x=>x?.role===role);
  for(const p of proposed){
   const evidence=clean(p.evidence);
   if(evidence.length<16||!norm(actual).includes(norm(evidence))) {
    adjustments.push(role+" location change ignored: no verbatim visible evidence");continue;
   }
   if(!movement.test(evidence)){
    adjustments.push(role+" location change ignored: no narrated travel");continue;
   }
   if(!new RegExp("\\b"+(role==="jack"?"Jack":"Jill")+"\\b|\\b(?:they|both)\\b","i").test(evidence)){
    adjustments.push(role+" location change ignored: movement not attributed");continue;
   }
   if(!norm(evidence).includes(norm(p.to))){
    adjustments.push(role+" location change ignored: destination not shown");continue;
   }
   const destination=placeOf(p.to);
   if(!destination||destination==="unknown"){
    adjustments.push(role+" location change ignored: unknown destination");continue;
   }
   if(current!=="unknown"&&p.from&&placeOf(p.from)!=="unknown"&&!same(placeOf(p.from),current))
    return {ok:false,reason:role+" location proposal began at "+p.from+" while the committed location was "+current+"."};
   current=destination;
  }
  // A direct actor-at-place statement is stronger than ungrounded narration.
  // A location mismatch is unacceptable unless movement is actually shown.
  const observations=sentences(actual).map(s=>observeActor(s,role)).filter(Boolean);
  for(const observation of observations){
   if(!observation.place)continue;
   if(current!=="unknown"&&observation.place!==current&&!observation.transition)
    return {ok:false,reason:role+" appeared at "+observation.place+" without moving from "+current+
      ". Narrate the move or keep the actor at the last committed location."};
   if(observation.transition||current==="unknown")current=observation.place;
  }
  // A departure without a named destination is still a physical change.
  // Persist "away" instead of leaving Jack back in the kitchen on the next
  // turn. An explicitly narrated return is necessary to clear this state.
  const name=role==="jack"?"Jack":"Jill";
  const exit=new RegExp("\\b"+name+"\\b[^.!?]{0,95}\\b(?:left(?:\\s+quickly)?|heads?\\s+out|headed\\s+out|walks?\\s+out|drove\\s+away|drives?\\s+away)\\b","i");
  const returned=new RegExp("\\b"+name+"\\b[^.!?]{0,95}\\b(?:returned|returns|came back|comes back|arrived home|arrives home)\\b","i");
  if(exit.test(actual)&&!returned.test(actual)){
   // An actor who leaves the house for work is not automatically located at
   // the office; the next scene may establish their car, workplace, etc.
   if(current===placeOf(state.place)||current==="kitchen")current="away";
  }
  next[role]={place:current,asOfPhase:current!==state.place?phase:state.asOfPhase??-1};
 }
 return {ok:true,locations:next,adjustments};
}
