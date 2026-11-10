import test from "node:test";
import assert from "node:assert/strict";
import {defaultStudio,PHASES,saveEpisodeStudio} from "../api/episode-studio.mjs";

test("Changing episode to wife-only mode and in-review status is an atomic, versioned save",async()=>{
 const previousFetch=globalThis.fetch,previousKey=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_SECRET_KEY="test-only-key";
 let row={
  id:"4fdf920d-7f88-4419-a600-a89df8ede83b",petal_slug:"desire-physical-intimacy",
  mode:"shared",status:"draft",content_version:2,title:"Changing Seasons of Desire",
  opening_scene:"A tired couple has a complicated evening after the children are finally asleep. They each interpret the same quiet invitation very differently and try to work out why.",
  learning_objective:"Notice invitations to connect without applying pressure.",
  episode_studio:null
 };
 const writes=[];
 globalThis.fetch=async(url,init={})=>{
  const method=init.method||"GET",query=new URL(url).searchParams;
  if(method==="PATCH"){
   const change=JSON.parse(init.body);writes.push(change);row={...row,...change};
   return {ok:true,json:async()=>[row]};
  }
  if(query.get("select")==="*")return {ok:true,json:async()=>[row]};
  if(query.get("select")==="id,title,episode_studio")
   return {ok:true,json:async()=>[{id:row.id,title:row.title,episode_studio:row.episode_studio}]};
  throw Error("Unexpected test query "+String(url));
 };
 try{
  const studio=defaultStudio(row);studio.primarySkill="g-bids";studio.soloCoach="jill";
  studio.phases=Object.fromEntries(PHASES.map((p,i)=>[p.id,"A specific encounter changes the choices Jack and Jill face in phase "+i+", while their coaches can influence consequences."]));
  const result=await saveEpisodeStudio({id:row.id,content_version:2,mode:"individual",status:"in_review",studio});
  assert.equal(result.mode,"individual");assert.equal(result.status,"in_review");
  assert.equal(result.content_version,3);assert.equal(writes.length,1);
  assert.equal(writes[0].mode,"individual");assert.equal(writes[0].status,"in_review");
  assert.equal(writes[0].episode_studio.soloCoach,"jill");
  assert.equal(writes[0].episode_studio.checkpoints.length,5);
  assert.ok(writes[0].episode_studio.checkpoints.every(c=>c.audience==="none"));
 }finally{
  globalThis.fetch=previousFetch;
  if(previousKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=previousKey;
 }
});
