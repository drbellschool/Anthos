import test from "node:test";
import assert from "node:assert/strict";
import {parseHumanSms43,addHumanSmsReview43,humanSmsReviewStatus43,
 reviewSmsHelp43} from "../api/jj43-sms-human-review.mjs";
import {LIVE43_DIMENSIONS} from "../lib/atlas-live-qa-contract.mjs";
function episode(){
 return {title:"What Makes Us Feel Close",authored43:{openConversation:true,turns:[
  {role:"jack",key:"jack-episode-turn",reply:"I asked about the porch, because I want us both to feel heard.",
   replySource:"model-validated",replyProviderResponseId:"resp_actual_receiptJ"},
  {role:"jill",key:"jill-episode-turn",reply:"I told Jack the porch matters; dinner can remain undecided.",
   replySource:"model-validated",replyProviderResponseId:"resp_actual_receiptF"}
 ]}};
}
test("SMS QA parser is opt-in, bounded and uses all ten independent dimensions",()=>{
 assert.equal(parseHumanSms43("I think QA is interesting"),null);
 assert.equal(parseHumanSms43("QA LIST").kind,"list");
 assert.equal(parseHumanSms43("QA STATUS").kind,"status");
 assert.equal(parseHumanSms43("QA 4 8 Funny but too rehearsed").dimension,"characterVoice");
 assert.equal(parseHumanSms43("QA 10 10").score,10);
 assert.equal(parseHumanSms43("QA 1 11").kind,"invalid");
 assert.equal(parseHumanSms43("QA 0 8").kind,"invalid");
 assert.equal(parseHumanSms43("QA 1 8 <script>").kind,"invalid");
 assert.ok(LIVE43_DIMENSIONS.every((name,i)=>parseHumanSms43("QA "+(i+1)+" 7").dimension===name));
 assert.match(reviewSmsHelp43(),/participant feedback/i);
});
test("Human SMS score attaches actual role-specific provider reply, not spouse coaching",()=>{
 const original=episode(),parsed=parseHumanSms43("QA 4 8 Good character but awkward ending");
 const j=addHumanSmsReview43(original,"jack",parsed,"telnyx-event-0001");
 assert.equal(j.saved,true);
 assert.equal(j.episode.authored43.smsHumanReviews.jack.characterVoice.score,8);
 assert.equal(j.episode.authored43.smsHumanReviews.jack.characterVoice.sourceTurnKey,"jack-episode-turn");
 assert.ok(j.episode.authored43.smsHumanReviews.jack.characterVoice.sourceQuote.includes("porch"));
 assert.equal(j.episode.authored43.smsHumanReviews.jack.characterVoice.provenance,"verified-participant-sms");
 assert.equal(j.episode.authored43.smsHumanReviews.jack.characterVoice.certification,"participant-feedback-only");
 assert.ok(!j.episode.authored43.smsHumanReviews.jack.characterVoice.sourceQuote.includes("dinner"));
 assert.equal(original.authored43.smsHumanReviews,undefined);
 assert.match(humanSmsReviewStatus43(j.episode,"jack"),/1\/10/);
 assert.match(humanSmsReviewStatus43(j.episode,"jill"),/0\/10/);
 const again=addHumanSmsReview43(j.episode,"jack",parsed,"telnyx-event-0001");
 assert.equal(again.saved,false);
 assert.equal(again.duplicate,true);
});
test("No offline or wrong-lane reply can be counted as human-reviewed OpenAI evidence",()=>{
 const e=episode();
 e.authored43.turns[0].replySource="verified-fallback";
 assert.throws(()=>addHumanSmsReview43(e,"jack",parseHumanSms43("QA 2 6"),"provider-0002"),
  /No real character message/);
 assert.throws(()=>addHumanSmsReview43(e,"unknown",parseHumanSms43("QA 2 6"),"provider-0002"),
  /Only verified/);
});
test("Human SMS ratings never mutate story actions or count as release certification",()=>{
 const e=episode(),old=JSON.stringify(e.authored43.turns);
 let next=e;
 for(let i=0;i<10;i++){
  const x=addHumanSmsReview43(next,"jill",parseHumanSms43("QA "+(i+1)+" 8"),
    "provider-score-"+i);
  next=x.episode;
 }
 assert.equal(Object.keys(next.authored43.smsHumanReviews.jill).length,10);
 assert.equal(JSON.stringify(next.authored43.turns),old);
 assert.equal(next.authored43.smsHumanReviews.jill.humorAndPlayfulness.provenance,
  "verified-participant-sms");
 assert.ok(Object.values(next.authored43.smsHumanReviews.jill).every(x=>x.certification!=="human-reviewed-live-transcript"));
});
