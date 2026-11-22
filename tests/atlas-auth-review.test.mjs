import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {atlasApi} from "../api/insight-atlas.mjs";

const USER="125a89a7-792a-43be-a933-947184c79c71";
const COUPLE="a89f1c10-a17b-4632-b0c3-9b321725c775";
const OTHER="d89f1c10-a17b-4632-b0c3-9b321725c775";
const EPISODE="cd183e81-7d4b-4b78-8a98-1e6e394abf84";
const token="t".repeat(80);
const req=(path,method="GET",body,auth=token)=>new Request("https://anthos.love"+path,{
 method,headers:{
  ...(auth?{Authorization:"Bearer "+auth}:{}),
  ...(method==="POST"?{"Content-Type":"application/json",Origin:"https://anthos.love"}:{})
 },...(method==="POST"?{body:JSON.stringify(body)}:{})
});
const res=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{"content-type":"application/json"}});
async function run(f,request){
 const was=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_SECRET_KEY="fake_key_for_test";
 try{return await atlasApi(request,{fetchImpl:f})}
 finally{if(was===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=was}
}
const mock=(status="in_progress",owner=COUPLE)=>{
 const visits=[];
 const fetchImpl=async(url)=>{
  const u=new URL(url),path=u.pathname;visits.push(path);
  if(path==="/auth/v1/user")return res({id:USER});
  if(path.endsWith("/couple_members"))return res([{couple_id:COUPLE,status:"active"}]);
  if(path.endsWith("/couples"))return res([{id:COUPLE,status:"active"}]);
  if(path.endsWith("/anthos_atlas_episodes")){
   if(owner!==COUPLE)return res([]);
   return res([{id:EPISODE,couple_id:COUPLE,
    source_room_id:"e28f6000-7ef9-4c3d-b0d3-008230836aef",
    story_title:"The Four-Hundred-Dollar Surprise",story_key:"microwave",status}]);
  }
  if(path.endsWith("/anthos_jj4_rooms"))return res([]);
  if(path.endsWith("/anthos_jj4_messages"))return res([]);
  if(path.endsWith("/anthos_atlas_transcript"))return res([{
   id:17,source_key:"open:sample:coach",actor:"husband",kind:"coach",
   body:"Listen to Jill first",scene_day:2,source_time:"2026-11-22T12:00:00Z"
  },{
   id:18,source_key:"open:sample:wife",actor:"wife",kind:"coach",
   body:"Ask Jack what he needs",scene_day:2,source_time:"2026-11-22T12:01:00Z"
  }]);
  if(path.endsWith("/anthos_atlas_evidence"))return res([{
   id:12,subject:"jack",skill_id:"g-influence",source_ref:"open-event-1",
   source_quote:"Jack listened to Jill",observed_rating:4,context_class:"selected"
  }]);
  if(path.endsWith("/anthos_atlas_movements"))return res([{
   evidence_id:12,subject:"jack",skill_id:"g-influence",
   previous_score:3,new_score:3.25,delta:.25
  }]);
  return res([]);
 };
 return {fetchImpl,visits};
};
test("Atlas rejects unsigned requests before database access",async()=>{
 const f=async()=>{throw Error("Unexpected server access")};
 const response=await run(f,req("/api/insight-atlas?mode=episodes","GET",null,null));
 assert.equal(response.status,401);
});
test("Either verified spouse can see both coaching streams during an ongoing Deep Dive",async()=>{
 const {fetchImpl,visits}=mock("in_progress");
 const response=await run(fetchImpl,req("/api/insight-atlas?mode=episode&episodeId="+EPISODE));
 assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
 const data=await response.json();
 assert.equal(data.episode.status,"in_progress");
 assert.deepEqual(data.transcript.map(x=>x.actor),["husband","wife"]);
 assert.equal(data.evidence[0].source_quote,"Jack listened to Jill");
 assert.ok(visits.some(x=>x.endsWith("/anthos_atlas_transcript")));
});
test("Completed episode stays shared with no mutual approval or opt-in",async()=>{
 const {fetchImpl}=mock("complete");
 const response=await run(fetchImpl,req("/api/insight-atlas?mode=episode&episodeId="+EPISODE));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.movements[0].evidence_id,12);
 assert.equal(data.transcript.length,2);
});
test("Cross-couple episode access returns 404 before reading coaching",async()=>{
 const {fetchImpl,visits}=mock("complete",OTHER);
 const response=await run(fetchImpl,req("/api/insight-atlas?mode=episode&episodeId="+EPISODE));
 assert.equal(response.status,404);
 assert.ok(!visits.some(x=>x.endsWith("/anthos_atlas_transcript")));
});
test("Review-approval action and consent checkbox do not exist",()=>{
 const api=readFileSync(new URL("../api/insight-atlas.mjs",import.meta.url),"utf8");
 const html=readFileSync(new URL("../insight-atlas/index.html",import.meta.url),"utf8");
 const client=readFileSync(new URL("../insight-atlas/live.js",import.meta.url),"utf8");
 assert.doesNotMatch(api,/review-consent|review_unlocked_at|p_ack_shared_future_review/);
 assert.doesNotMatch(html,/atlasAcknowledge|both spouses have agreed to sharing/);
 assert.doesNotMatch(client,/review-consent|atlasAcknowledge|acknowledgeFutureSharedReview/);
});
test("Cross-origin modifications are rejected",async()=>{
 const request=new Request("https://anthos.love/api/insight-atlas",{method:"POST",
  headers:{Authorization:"Bearer "+token,Origin:"https://untrusted.example",
   "content-type":"application/json"},
  body:JSON.stringify({action:"link",inviteToken:"r".repeat(43)})});
 const response=await run(async()=>{throw Error("Should reject origin first")},request);
 assert.equal(response.status,403);
});
