// Anthos 4.3: independent release-quality evidence contract.
// Never treat synthetic/offline or mocked character replies as real-model proof.
export const LIVE43_DIMENSIONS=Object.freeze([
 "coachingResponsiveness","characterAgency","emotionalRealism",
 "characterVoice","storyContinuity","storyProgression",
 "humorAndPlayfulness","dialogueNaturalness","relationshipComplexity",
 "memoryAndScoreIntegrity"
]);
export const LIVE43_MIN_COUPLES=10;
export const LIVE43_MIN_MEAN=8;
export const LIVE43_MIN_DIMENSION=7;

const finiteScore=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=10;
export function verifyLivePilot43({couples,reviews=[],expectedCouples=LIVE43_MIN_COUPLES}={}){
 const problems=[],replies=[],ids=new Set();
 if(!Array.isArray(couples)||couples.length!==expectedCouples)
  problems.push("expected-"+expectedCouples+"-completed-couples");
 for(const c of Array.isArray(couples)?couples:[]){
  if(!c||typeof c!=="object"||typeof c.id!=="string"||!c.id||ids.has(c.id)){
   problems.push("invalid-or-duplicate-couple");continue;
  }
  ids.add(c.id);
  if(c.completed!==true||c.days?.length!==5)
   problems.push(c.id+":incomplete-five-day-story");
  if(Array.isArray(c.errors)&&c.errors.length)
   problems.push(c.id+":canonical-violations");
  if(c.focusCoverage?.complete!==true)
   problems.push(c.id+":missing-focus-opportunities");
  for(let d=0;d<5;d++){
   const turns=c.days?.[d]?.turns;
   if(!Array.isArray(turns)||turns.length!==2||
      new Set(turns.map(t=>t.role)).size!==2||
      !turns.some(t=>t.role==="jack")||!turns.some(t=>t.role==="jill")){
    problems.push(c.id+":day-"+d+"-invalid-coaching-pair");continue;
   }
   for(const t of turns){
    replies.push(t);
    if(t.replySource!=="model-validated"||!Number.isInteger(t.replyModelAttempts)||
       t.replyModelAttempts<1||t.replyModelAttempts>2||typeof t.reply!=="string"||t.reply.length<20)
     problems.push(c.id+":day-"+d+"-"+t.role+"-not-validated-live-model");
    if(t.replyValidationIssue)problems.push(c.id+":day-"+d+"-"+t.role+"-outstanding-validation-issue");
    if(t.replyHumorResponse==="attempted"||t.replyHumorResponse==="declined"){
     if(!t.replyHumorEvidence||!t.reply.includes(t.replyHumorEvidence))
      problems.push(c.id+":day-"+d+"-"+t.role+"-unverified-humor-passage");
    }
   }
  }
 }
 const reviewMap=new Map();
 for(const review of Array.isArray(reviews)?reviews:[]){
  if(!review||typeof review.coupleId!=="string"||reviewMap.has(review.coupleId)){
   problems.push("invalid-or-duplicate-human-review");continue;
  }
  reviewMap.set(review.coupleId,review);
 }
 for(const id of ids){
  const r=reviewMap.get(id);
  if(!r||r.provenance!=="human-reviewed-live-transcript"||
     !r.reviewer||String(r.reviewer).trim().length<3||
     !r.reviewedAt||!Number.isFinite(Date.parse(r.reviewedAt))){
   problems.push(id+":missing-authenticated-human-review");continue;
  }
  if(r.criticalFailure===true)problems.push(id+":critical-quality-failure");
  const dimensionScores=LIVE43_DIMENSIONS.map(k=>r.scores?.[k]);
  if(!dimensionScores.every(finiteScore)){
   problems.push(id+":missing-rubric-dimensions");continue;
  }
  if(dimensionScores.some(n=>n<LIVE43_MIN_DIMENSION))
   problems.push(id+":dimension-below-"+LIVE43_MIN_DIMENSION);
  if(dimensionScores.reduce((a,b)=>a+b,0)/dimensionScores.length<LIVE43_MIN_MEAN)
   problems.push(id+":mean-below-"+LIVE43_MIN_MEAN);
  // Reviewer citations must actually occur in this couple's transcript.
  const text=couples.find(x=>x.id===id)?.days?.flatMap(x=>x.turns).map(x=>
   [x.advice||"",x.reply||""].join(" ")).join(" ")||"";
  for(const k of ["coachingResponsiveness","characterVoice","storyContinuity","humorAndPlayfulness"]){
   const quote=r.evidence?.[k];
   if(!quote||String(quote).trim().length<8||!text.includes(quote))
    problems.push(id+":missing-cited-quality-evidence-"+k);
  }
 }
 const unique=new Set(replies.map(t=>t.reply?.trim().toLowerCase())).size;
 const retryCount=replies.filter(t=>t.replyModelAttempts===2).length;
 const liveCount=replies.filter(t=>t.replySource==="model-validated").length;
 return {passed:problems.length===0,problems:[...new Set(problems)],
  metrics:{couples:ids.size,coachingTurns:replies.length,liveValidatedTurns:liveCount,
   fallbackTurns:replies.length-liveCount,repairedTurns:retryCount,
   distinctReplyRatio:replies.length?Number((unique/replies.length).toFixed(2)):0,
   humanReviews:reviewMap.size},
  contract:{requiredCouples:expectedCouples,requiredDays:5,
   requiredTurnsPerCouple:10,minimumMean:LIVE43_MIN_MEAN,
   minimumDimension:LIVE43_MIN_DIMENSION,dimensions:LIVE43_DIMENSIONS}};
}
