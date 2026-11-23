// Shared 4.3+ pre-delivery story quality checks.
// This is a reusable floor, not a substitute for human 8/10 scoring.
// Every scenario supplies its own facts and forbidden implications.
export const STORY_QUALITY_VERSION="anthos-story-quality-v1";
const normalize=s=>String(s||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const phraseIn=(message,phrase)=>Boolean(phrase&&(" "+normalize(message)+" ").includes(" "+normalize(phrase)+" "));
const unique=a=>[...new Set(a)];
export function assertStoryQualityContract(contract){
 if(!contract||typeof contract!=="object"||contract.version!==STORY_QUALITY_VERSION)
  throw Error("STORY BLOCKED: approved episode-specific quality contract required.");
 if(typeof contract.episodeId!=="string"||!contract.episodeId.trim())
  throw Error("STORY BLOCKED: episode identity missing.");
 for(const field of ["who","what","where","when","why"]){
  if(typeof contract.world?.[field]!=="string"||!contract.world[field].trim())
   throw Error("STORY BLOCKED: episode "+field+" not established.");
 }
 for(const role of ["jack","jill"]){
  const voice=contract.characterVoices?.[role];
  if(!voice||["voice","coreNeed","flaw","relationship"].some(k=>typeof voice[k]!=="string"||!voice[k].trim()))
   throw Error("STORY BLOCKED: "+role+" voice/agency not defined.");
 }
 if(!Array.isArray(contract.objects)||!Array.isArray(contract.invariants)||!contract.invariants.length)
  throw Error("STORY BLOCKED: objects and canonical invariants must be explicitly inventoried.");
 const ids=new Set();
 for(const rule of contract.invariants){
  if(!rule||typeof rule.id!=="string"||!rule.id.trim()||ids.has(rule.id)||
    typeof rule.fact!=="string"||!rule.fact.trim()||
    !Array.isArray(rule.forbiddenImplications)||
    !rule.forbiddenImplications.every(x=>typeof x==="string"&&x.trim().length>=6))
   throw Error("STORY BLOCKED: invalid or duplicate canonical invariant.");
  ids.add(rule.id);
 }
 return contract;
}
function similarity(a,b){
 const x=normalize(a).split(" ").filter(Boolean),y=normalize(b).split(" ").filter(Boolean);
 if(x.length<20||y.length<20)return 0;
 const grams=arr=>new Set(arr.slice(0,-3).map((_,i)=>arr.slice(i,i+4).join(" ")));
 const xa=grams(x),yb=grams(y),both=[...xa].filter(z=>yb.has(z)).length;
 return both/Math.max(1,Math.min(xa.size,yb.size));
}
/**
 * Independent of the microwave story; validates what a character ACTUALLY said.
 * Impossible claims are explicitly authored per episode, not silently inferred
 * from a prior episode's set of actions. A lexical check cannot establish that
 * ALL implications are true: human and model-based review still required.
 */
export function reviewStoryReply(message,{role,contract,priorReplies=[],verifiedEvent=undefined}={}){
 const source=assertStoryQualityContract(contract),critical=[],advisory=[];
 const m=String(message||"");
 if(!["jack","jill"].includes(role))critical.push("invalid-character-lane");
 if(/\b(?:the|my|your)\s+(?:coach|coaching partner)\b|\b(?:the|my)\s+(?:scoring|rubric|ai model)\b/i.test(m))
  critical.push("fourth-wall-role-leak");
 // Verbatim and implied third-person reactions are not free observations.
 // A model may NOT invent partner emotion or visible reactions merely to
 // make a reply feel human. The canonical action ledger must support them.
 if(verifiedEvent!==undefined){
  const e=normalize(verifiedEvent);
  const observed=[
   {claim:/\b(?:he|she|jack|jill)\s+(?:looked|seemed|appeared)\s+(?:surprised|hurt|angry|upset|relieved|furious|delighted)\b/i,
    event:/\b(?:surprised|surprise|hurt|angry|upset|relieved|furious|delighted)\b/},
   {claim:/\b(?:he|she|jack|jill)\s+(?:laughed|smiled|cried|nodded|scoffed)\b/i,
    event:/\b(?:laughed|smiled|cried|nodded|scoffed)\b/},
   {claim:/\b(?:he|she|jack|jill)\s+(?:said\s+yes|agreed|accepted)\b/i,
    event:/\b(?:said yes|agreed|accepted)\b/}
  ];
  if(observed.some(x=>x.claim.test(m)&&!x.event.test(e)))
   critical.push("unsupported-partner-reaction");
 }
 const same=priorReplies.map(normalize);
 if(same.includes(normalize(m)))critical.push("identical-character-reply");
 else if(priorReplies.some(p=>similarity(p,m)>=0.85))
  advisory.push("high-dialogue-overlap-needs-review");
 for(const rule of source.invariants){
  if(rule.forbiddenImplications.some(phrase=>phraseIn(m,phrase)))
   critical.push("canonical-implication:"+rule.id);
 }
 const filler=/\b(?:baby steps|that's a start though|what do you think\??|feels like a start)\b/i;
 if(filler.test(m)&&priorReplies.some(p=>filler.test(p)))
  advisory.push("recycled-conversational-filler");
 return {ok:critical.length===0,critical:unique(critical),advisory:unique(advisory),
  episodeId:source.episodeId,contractVersion:source.version};
}
// The current 4.3 pilot has one verified canonical scenario. New episodes must
// supply a DIFFERENT approved contract; never inherit this world by default.
export const MICROWAVE_STORY_QUALITY=Object.freeze({
 version:STORY_QUALITY_VERSION,episodeId:"four-hundred-dollar-surprise:post-purchase",
 world:{
  who:"Jack and Jill, fictional spouses with distinct private friends",
  what:"Jill spent $400 on a replacement microwave without consulting Jack",
  where:"Their shared kitchen; the replacement was carried home sealed",
  when:"Purchase happened last Thursday before the Monday-Friday conversations",
  why:"Jack missed three repair promises; Jill needed a working appliance; both are worried about shared money"
 },
 objects:[{id:"old-microwave",state:"broken"},{id:"replacement",state:"purchased, sealed initially"},
  {id:"emergency-savings",state:"$400 already spent"}],
 characterVoices:{
  jack:{voice:"Dry, practical, sometimes sheepish or defensive; understated humor.",
   coreNeed:"Keep promises and protect shared emergency savings",
   flaw:"Overpromises repairs and can become defensive",
   relationship:"Cares about Jill and understands her frustration without surrendering his financial concern"},
  jill:{voice:"Candid, perceptive, independent, warm beneath frustration; pointed noncruel humor.",
   coreNeed:"Working appliance and a meaningful say in household priorities",
   flaw:"Tired of delays and sometimes acts unilaterally",
   relationship:"Cares about Jack and recognizes his savings concern without erasing inconvenience"}
 },
 invariants:[
  {id:"purchase-already-completed",fact:"The single $400 replacement has already been purchased; jokes cannot imply they still need to buy their first replacement.",
   forbiddenImplications:["before we need a new one","before we have to buy a new one",
    "before we buy a new microwave","if we end up buying a replacement","we haven't bought a replacement",
    "we still need to buy a new microwave"]},
  {id:"repair-not-completed",fact:"The old microwave has not been repaired; a phone call is not a repair.",
   forbiddenImplications:["the old microwave is fixed now","the microwave is finally repaired",
    "the repair is finished"]},
  {id:"unknown-external-price",fact:"No repair quote, confirmed service appointment or retailer policy exists in the saved world.",
   forbiddenImplications:["the shop quoted us a price","we have a confirmed repair appointment",
    "the store promised a refund"]}
 ]
});
