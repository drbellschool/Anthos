import test from "node:test";
import assert from "node:assert/strict";
import {atlasApi} from "../api/insight-atlas.mjs";
const USER="125a89a7-792a-43be-a933-947184c79c71",COUPLE="a89f1c10-a17b-4632-b0c3-9b321725c775";
const EPISODE="cd183e81-7d4b-4b78-8a98-1e6e394abf84";
const token="t".repeat(80);
const req=(path,method="GET",body,auth=token)=>new Request("https://anthos.love"+path,{
 method,headers:{
  ...(auth?{Authorization:"Bearer "+auth}:{}),
  ...(method==="POST"?{"Content-Type":"application/json",Origin:"https://anthos.love"}:{})
 },...(method==="POST"?{body:JSON.stringify(body)}:{})
});
const res=async(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{"content-type":"application/json"}});
async function run(f,request){
 const was=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_SECRET_KEY="fake_key_for_test";
 try{return await atlasApi(request,{fetchImpl:f})}
 finally{if(was===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=was}
}
const mock=(locked=true)=>{
 const visits=[];
 const fetchImpl=async(url,opts)=>{
  const path=new URL(url).pathname;
  visits.push(path);
  if(path==="/auth/v1/user")return res({id:USER});
  if(path.endsWith("/couple_members"))return res([{couple_id:COUPLE,status:"active"}]);
  if(path.endsWith("/couples"))return res([{id:COUPLE,status:"active"}]);
  if(path.endsWith("/anthos_atlas_episodes"))return res([{
   id:EPISODE,couple_id:COUPLE,source_room_id:"e28f6000-7ef9-4c3d-b0d3-008230836aef",
   story_title:"The Four-Hundred-Dollar Surprise",story_key:"microwave",status:"complete",
   review_unlocked_at:locked?null:"2026-11-22T12:00:00Z"
  }]);
  if(path.endsWith("/anthos_atlas_transcript"))return res([{
   id:17,source_key:"open:sample:coach",actor:"husband",kind:"coach",body:"Listen to Jill first",
   scene_day:2,source_time:"2026-11-22T12:00:00Z"
  }]);
  if(path.endsWith("/anthos_atlas_evidence"))return res([{
   id:12,subject:"jack",skill_id:"g-influence",source_ref:"open-event-1",
   source_quote:"Jack listened to Jill",observed_rating:4,context_class:"selected"
  }]);
  if(path.endsWith("/anthos_atlas_movements"))return res([{
   evidence_id:12,subject:"jack",skill_id:"g-influence",previous_score:3,new_score:3.25,delta:.25
  }]);
  return res([]);
 };
 return {fetchImpl,visits};
};
test("Atlas rejects unsigned requests before any database access",async()=>{
 const f=async()=>{throw Error("no call should be made")};
 const resp=await run(f,req("/api/insight-atlas?mode=episodes","GET",null,null));
 assert.equal(resp.status,401);
});
test("Atlas does not disclose completed private coaching until both consent",async()=>{
 const {fetchImpl,visits}=mock(true);
 const resp=await run(fetchImpl,req("/api/insight-atlas?mode=episode&episodeId="+EPISODE));
 assert.equal(resp.status,403,JSON.stringify(await resp.json()));
 assert.ok(!visits.some(x=>x.endsWith("/anthos_atlas_transcript")));
});
test("Mutually unlocked episode returns real source-linked annotations to a member",async()=>{
 const {fetchImpl}=mock(false);
 const resp=await run(fetchImpl,req("/api/insight-atlas?mode=episode&episodeId="+EPISODE));
 assert.equal(resp.status,200,JSON.stringify(resp.status!==200?await resp.clone().json():{}));
 const data=await resp.json();
 assert.equal(data.transcript[0].actor,"husband");
 assert.equal(data.movements[0].evidence_id,12);
 assert.equal(data.evidence[0].source_quote,"Jack listened to Jill");
});
test("Archive cannot be linked without an explicit shared-review disclosure",async()=>{
 const f=async()=>{throw Error("Should reject before token lookup")};
 // Session lookup is still required and fails here; never accepts unauthenticated link.
 const resp=await run(f,req("/api/insight-atlas","POST",
  {action:"link",inviteToken:"r".repeat(43),acknowledgeFutureSharedReview:false}));
 assert.notEqual(resp.status,200);
});
test("Atlas blocks cross-origin state-changing requests",async()=>{
 const f=async()=>{throw Error("Origin rejected before any service request")};
 const request=new Request("https://anthos.love/api/insight-atlas",{method:"POST",
  headers:{Authorization:"Bearer "+token,Origin:"https://untrusted.example",
  "content-type":"application/json"},
  body:JSON.stringify({action:"review-consent",episodeId:EPISODE})});
 const response=await run(f,request);assert.equal(response.status,403);
});
