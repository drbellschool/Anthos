import test from "node:test";
import assert from "node:assert/strict";
import {createRoom} from "../api/jj4-core.mjs";
import {normalizeStudio} from "../api/episode-studio.mjs";
import {validateScenarioGraph43,scenarioWorld43} from "../api/jj43-scenario-graph.mjs";
import {renderConversation42,prepareOpenTurn43} from "../api/jj42-conversations.mjs";
import {scenarioGraph} from "./fixtures/jj43-what-makes-us-feel-close-graph.mjs";
import {episode} from "./fixtures/jj43-what-makes-us-feel-close.mjs";

const SOURCE_ID=episode.id;
const savedSource={id:SOURCE_ID,title:episode.title,opening_scene:episode.premise,
 learning_objective:episode.learningObjective,mode:"shared"};
const studio=normalizeStudio({
 title:episode.title,premise:episode.premise,learningObjective:episode.learningObjective,
 primarySkill:episode.primarySkill,supportingSkills:episode.supportingSkills,scenarioGraph
},savedSource);
const scenario={...savedSource,content_version:5,status:"draft",episode_studio:studio};

test("PRODUCTION regression: server 4.3 createRoom pins saved scenario ID into graph-based room and later turns",async()=>{
 const beforeFetch=globalThis.fetch,beforeKey=process.env.SUPABASE_SECRET_KEY;
 const beforeUrl=process.env.SUPABASE_URL,beforeStrict=process.env.ANTHOS_QA_STRICT_ISOLATION;
 const beforeProd=process.env.VERCEL_ENV;
 const requests=[],rooms=[];
 process.env.SUPABASE_SECRET_KEY="synthetic-test-only";
 process.env.SUPABASE_URL="https://kstluxwgrrgdbjyloscb.supabase.co";
 delete process.env.ANTHOS_QA_STRICT_ISOLATION;
 delete process.env.VERCEL_ENV;
 globalThis.fetch=async(uri,init={})=>{
  const url=new URL(uri),name=url.pathname.split("/").at(-1);
  requests.push({name,method:init.method||"GET"});
  const response=(body)=>({ok:true,status:200,json:async()=>body});
  if(name==="anthos_jj2_scenarios"&&(!init.method||init.method==="GET")){
   assert.equal(url.searchParams.get("id"),"eq."+SOURCE_ID);
   return response([structuredClone(scenario)]);
  }
  if(name==="anthos_jj4_rooms"&&init.method==="POST"){
   const body=JSON.parse(init.body);
   rooms.push(body);
   return response([{id:"11111111-1111-4111-8111-111111111111",
    expires_at:"2027-03-20T00:00:00.000Z"}]);
  }
  if(name==="anthos_jj4_participants"&&init.method==="POST"){
   return response([{id:"22222222-2222-4222-8222-222222222222"}]);
  }
  throw Error("Unexpected REST call during isolated room test "+name+" "+(init.method||"GET"));
 };
 try{
  assert.equal(studio.id,undefined,
   "Editorial normalizer does not include identity; this is the reported root cause.");
  for(const timed of [true,false]){
   const result=await createRoom("https://anthos.love",SOURCE_ID,null,"4.3.0",
    {timedPilot:timed,fastForward:!timed});
   assert.equal(result.ok,true);
   assert.equal(result.engine,"4.3.0");
   assert.equal(result.timedPilot,timed);
   assert.ok(result.invitations.jack.startsWith("https://anthos.love/pilot-v4/?invite="));
   assert.ok(result.invitations.jill.startsWith("https://anthos.love/pilot-v4/?invite="));
   const persisted=rooms.at(-1).episode;
   assert.equal(persisted.id,SOURCE_ID,
    "The actual saved room snapshot MUST carry its server-fetched episode ID.");
   assert.equal(persisted.authored43.scenarioGraph.episodeId,persisted.id);
   assert.equal(validateScenarioGraph43(persisted.authored43.scenarioGraph,persisted).episodeId,SOURCE_ID);
   assert.equal(persisted.authored43.timeline,"scenario-graph");
   assert.equal(persisted.authored42.timedPilot===true,timed);
   assert.ok(scenarioWorld43(persisted,[],0));
   const scene=renderConversation42(persisted,0,[]);
   assert.ok(scene.scene.includes(SOURCE_ID));
   assert.ok(!scene.scene.toLowerCase().includes("microwave"));
  }
  assert.equal(requests.filter(x=>x.name==="anthos_jj4_rooms"&&x.method==="POST").length,2);
  assert.equal(requests.filter(x=>x.name==="anthos_jj4_participants"&&x.method==="POST").length,4);
 }finally{
  globalThis.fetch=beforeFetch;
  if(beforeKey===undefined)delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY=beforeKey;
  if(beforeUrl===undefined)delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL=beforeUrl;
  if(beforeStrict===undefined)delete process.env.ANTHOS_QA_STRICT_ISOLATION;
  else process.env.ANTHOS_QA_STRICT_ISOLATION=beforeStrict;
  if(beforeProd===undefined)delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV=beforeProd;
 }
});
