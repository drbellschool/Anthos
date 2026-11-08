import test from "node:test";
import assert from "node:assert/strict";
import {createRoom} from "../api/jack-jill-pilot-core.mjs";
import {listScenarios,getScenario,saveScenario} from "../api/jj2-library.mjs";
const soloId="88888888-8888-4888-8888-888888888888";
const sharedId="99999999-9999-4999-8999-999999999999";
const roomId="77777777-7777-4777-8777-777777777777";
const base={petal_slug:"adventure-play",title:"The Backroad Surprise",opening_scene:"Jack notices a peculiar roadside attraction while Jill checks the dinner reservation. There is one exit and five minutes to decide whether to stop.",learning_objective:"Respect different preferences and decide together about an unexpected detour.",research_lenses:["aron","gottman"],content_version:1,status:"draft"};
function mockDatabase(){
 const oldFetch=globalThis.fetch, oldSecret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 process.env.SUPABASE_SERVICE_ROLE_KEY="test-secret";
 let createdRoom=null,people=[],patches=[];
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url);const path=u.pathname;const method=options.method||"GET";
  const rows={
    "/rest/v1/anthos_petals":[{slug:"adventure-play",sort_order:11,name:"Adventure & Play",purpose:"Shared playful growth",primary_lenses:["aron"]}],
    "/rest/v1/anthos_jj2_scenarios":[{id:soloId,mode:"individual",slot:1,...base},{id:sharedId,mode:"shared",slot:2,...base,title:"Two Tickets, One Nervous Spouse"}],
  };
  if(path.endsWith("/anthos_jj2_scenarios")){
   let out=rows["/rest/v1/anthos_jj2_scenarios"];
   const id=u.searchParams.get("id");
   if(id)out=out.filter(x=>x.id===id.replace(/^eq\./,""));
   if(method==="PATCH"){
     const body=JSON.parse(options.body);
     patches.push(body);out=out.map(x=>({...x,...body}));
   }
   return new Response(JSON.stringify(out),{status:200});
  }
  if(rows[path])return new Response(JSON.stringify(rows[path]),{status:200});
  if(path.endsWith("/anthos_jj2_rooms")&&method==="POST"){
   createdRoom={...JSON.parse(options.body),id:roomId,expires_at:"2099-01-01"};
   return new Response(JSON.stringify([createdRoom]),{status:200});
  }
  if(path.endsWith("/anthos_jj2_participants")&&method==="POST"){
   people=JSON.parse(options.body);
   return new Response(JSON.stringify(people),{status:200});
  }
  throw Error("Unexpected mock DB operation "+method+" "+path);
 };
 return {get room(){return createdRoom},get people(){return people},get patches(){return patches},
  restore(){globalThis.fetch=oldFetch;if(oldSecret===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldSecret;}};
}
test("petal library returns curated scenarios without any private participant records",async()=>{
 const db=mockDatabase();
 try{
  const data=await listScenarios();
  assert.equal(data.ok,true);
  assert.equal(data.counts.total,2);
  assert.equal(data.counts.shared,1);
  assert.equal(data.counts.individual,1);
  assert.equal((await getScenario(soloId)).mode,"individual");
  await assert.rejects(getScenario("not-a-valid-id"),/valid scenario ID/);
 }finally{db.restore()}
});
test("manager-selected solo scenario creates exactly one confidential pilot invitation",async()=>{
 const db=mockDatabase();
 try{
  const room=await createRoom("https://anthos.love",soloId,"jill");
  assert.equal(room.ok,true);
  assert.equal(room.experienceMode,"individual");
  assert.equal(db.room.scenario_id,soloId);
  assert.equal(db.room.canon.scene,base.opening_scene);
  assert.equal(db.people.length,1);
  assert.equal(db.people[0].role,"jill");
  assert.ok(room.invitations.a.includes("/pilot/?invite="));
  assert.equal(room.invitations.b,undefined);
 }finally{db.restore()}
});
test("manager-selected shared scenario creates separate Jack and Jill invitations",async()=>{
 const db=mockDatabase();
 try{
  const room=await createRoom("https://anthos.love",sharedId);
  assert.equal(room.experienceMode,"shared");
  assert.deepEqual(db.people.map(x=>x.role),["jack","jill"]);
  assert.notEqual(room.invitations.a,room.invitations.b);
  assert.equal(db.room.scenario_id,sharedId);
 }finally{db.restore()}
});
test("scenario manager validates length and version before saving",async()=>{
 const db=mockDatabase();
 try{
  await assert.rejects(saveScenario({id:soloId,content_version:1,title:"Bad",opening_scene:"short",learning_objective:"Too short",status:"beta_ready"}),/Title/);
  const next=await saveScenario({id:soloId,content_version:1,title:base.title,opening_scene:base.opening_scene,learning_objective:base.learning_objective,status:"in_review"});
  assert.equal(next.ok,true);
  assert.equal(db.patches[0].content_version,2);
 }finally{db.restore()}
});
