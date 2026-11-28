// SMS pilot participant feedback, NOT independent 8/10 release certification.
// Ratings are bound to the person's own real, persisted character response.
// The canonical JJ4 event ledger and coach texts are never modified here.
import {LIVE43_DIMENSIONS} from "../lib/atlas-live-qa-contract.mjs";

const headings=Object.freeze([
 "Coaching response","Character choice","Emotional realism","Character voice",
 "Story continuity","Story progress","Humor","Natural dialogue",
 "Relationship complexity","Memory and scores"
]);
export const reviewSmsHelp43=()=>[
 "Anthos 4.3 human QA (optional): Reply QA <1-10> <score 0-10> [brief note].",
 ...headings.map((s,i)=>(i+1)+". "+s),
 "QA STATUS to review your saved ratings. This is participant feedback, not final release certification."
].join("\n");
export function parseHumanSms43(input){
 const text=String(input||"").trim();
 if(!/^QA(?:\s|$)/i.test(text))return null;
 if(/^QA\s+(?:LIST|HELP)$/i.test(text)||/^QA$/i.test(text))return {kind:"list"};
 if(/^QA\s+STATUS$/i.test(text))return {kind:"status"};
 const x=/^QA\s+(10|[1-9])\s+(10|[0-9])(?:\s+([\s\S]{1,240}))?$/i.exec(text);
 if(!x)return {kind:"invalid"};
 const index=Number(x[1])-1,score=Number(x[2]),note=String(x[3]||"").trim();
 if(note.length>240||/[<>\u0000-\u001f]/.test(note))return {kind:"invalid"};
 return {kind:"rating",dimension:LIVE43_DIMENSIONS[index],dimensionNumber:index+1,
  score,note};
}
export function addHumanSmsReview43(episode,role,parsed,providerEventId,now=new Date().toISOString()){
 if(!episode?.authored43?.openConversation||!["jack","jill"].includes(role)||
    parsed?.kind!=="rating"||typeof parsed?.dimension!=="string"||
    !LIVE43_DIMENSIONS.includes(parsed.dimension))
  throw Error("Only verified 4.3 participant ratings may be recorded.");
 const turns=(episode.authored43.turns||[]).filter(t=>t.role===role&&
  t.replySource==="model-validated"&&
  typeof t.replyProviderResponseId==="string"&&
  /^resp_[A-Za-z0-9_-]{6,}$/.test(t.replyProviderResponseId));
 if(!turns.length)throw Error("No real character message to review yet.");
 const last=turns.at(-1),id=String(providerEventId||"");
 if(id.length<5||id.length>160)throw Error("Invalid review source event.");
 const existing=episode.authored43.smsHumanReviews||{};
 const actor=existing[role]||{};
 if(Object.values(actor).some(x=>x?.providerEventId===id))
  return {episode,saved:false,duplicate:true,dimension:parsed.dimension};
 const record={
  role,dimension:parsed.dimension,score:parsed.score,
  comment:parsed.note,sourceTurnKey:last.key,
  sourceProviderResponseId:last.replyProviderResponseId,
  sourceQuote:String(last.reply||"").slice(0,160),
  reviewedAt:now,providerEventId:id,
  provenance:"verified-participant-sms",
  certification:"participant-feedback-only"
 };
 const changed={...episode,authored43:{...episode.authored43,
  smsHumanReviews:{...existing,[role]:{...actor,[parsed.dimension]:record}}}};
 return {episode:changed,saved:true,duplicate:false,dimension:parsed.dimension};
}
export function humanSmsReviewStatus43(episode,role){
 const notes=episode?.authored43?.smsHumanReviews?.[role]||{};
 const lines=LIVE43_DIMENSIONS.map((name,i)=>notes[name]?[(i+1),notes[name].score].join(":"):"");
 const completed=lines.filter(Boolean);
 return "Anthos human QA: "+completed.length+"/10 categories rated."+
  (completed.length?" Saved "+completed.join(", ")+".":"")+
  " These are participant observations, not the independent 8/10 release gate.";
}
