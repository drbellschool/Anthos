import test from "node:test";
import assert from "node:assert/strict";
import {buildConversation43,renderConversation42,prepareOpenTurn43,enactmentWithAtlas43} from "../api/jj42-conversations.mjs";
import {atlasTurnObservations,slimAtlasContext} from "../api/atlas-runtime.mjs";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";

const setup=(state={})=>{
 const episode=buildConversation43({...structuredClone(savedMicrowaveStudio),pilotMode:"shared"},{
  fastForward:true,openConversation:true});
 const first=renderConversation42(episode,0,[]);
 const canon=JSON.parse(first.scene);
 canon.state={...canon.state,strain:3,...state};
 return {episode,history:[{role:"shared",kind:"scene",phase_index:0,body:JSON.stringify(canon)}]};
};
const atlas=(jack=3,nontransactional=3)=>({
 character:"jack",characterSkills:{"s-decisions":jack,"g-start":jack,"g-influence":jack,
 "i-nontransactional":nontransactional},coachSkills:{},rememberedEvents:[]
});

test("Same advice, different long-term Jack skill: he can follow or resist",async()=>{
 const {episode,history}=setup();
 const text="Own your missed repair promises and apologize to Jill.";
 const low=await prepareOpenTurn43(episode,"jack",0,history,text,
 "d1434970-3606-4f33-a602-43c2f92611f1",{atlasContext:atlas(2.2)});
 const high=await prepareOpenTurn43(episode,"jack",0,history,text,
 "d1434970-3606-4f33-a602-43c2f92611f2",{atlasContext:atlas(4.2)});
 assert.equal(low.assessment?.enacted,"chat");
 assert.equal(high.assessment?.enacted,"own");
 assert.notEqual(low.reply,high.reply);
 assert.notEqual(low.event,high.event);
});

test("Transactional suggestion remains incidental and Jack can enact or reject it",async()=>{
 const {episode,history}=setup();
 const text="Tell Jill she needs to earn the microwave by giving you a sexual favor.";
 const bad=await prepareOpenTurn43(episode,"jack",0,history,text,
 "d1434970-3606-4f33-a602-43c2f92611f3",{atlasContext:atlas(2.5,2.5)});
 const good=await prepareOpenTurn43(episode,"jack",0,history,text,
 "d1434970-3606-4f33-a602-43c2f92611f4",{atlasContext:atlas(3.6,4.3)});
 assert.equal(bad.assessment?.enacted,"joke");
 assert.equal(good.assessment?.enacted,"reject_joke");
 assert.match(bad.event,/sexual favor/);
 assert.match(good.event,/rejected/);
 const observations=atlasTurnObservations(bad);
 const coached=observations.find(x=>x.subject==="husband"&&x.skillId==="i-nontransactional");
 assert.ok(coached);assert.equal(coached.contextClass,"incidental");
 const enacted=observations.find(x=>x.subject==="jack"&&x.skillId==="i-nontransactional");
 assert.ok(enacted);
 assert.ok(!observations.some(x=>x.subject==="jill"));
});

test("Bad coaching alone does not change Jack before an enacted event",()=>{
 const observed=atlasTurnObservations({role:"jack",key:"d1434970-3606-4f33-a602-43c2f92611f5",
  body:"She has to earn it with a sexual favor.",event:"",
  assessment:{coaching:{"s-decisions":2},behavior:{"s-decisions":null}}});
 assert.ok(observed.some(x=>x.subject==="husband"&&x.skillId==="i-nontransactional"));
 assert.ok(!observed.some(x=>x.subject==="jack"));
});

test("Atlas role view never contains the other spouse's coach ratings",()=>{
 const state={
  scores:{jack:{"s-decisions":2.1},jill:{"s-decisions":4.1},
   husband:{"s-decisions":3.2},wife:{"s-decisions":1.4}},
  memories:[{memoryKey:"microwave",summary:"A past disagreement",skillIds:["s-decisions"],salience:5}]};
 const jack=slimAtlasContext(state,"jack",["s-decisions"]);
 const jill=slimAtlasContext(state,"jill",["s-decisions"]);
 assert.equal(jack.characterSkills["s-decisions"],2.1);
 assert.equal(jack.coachSkills["s-decisions"],3.2);
 assert.equal(jill.coachSkills["s-decisions"],1.4);
 assert.equal(jack.coachSkills["s-decisions"]!==jill.coachSkills["s-decisions"],true);
 assert.equal(jack.rememberedEvents[0].referenceOnly,true);
});

test("A stable low/high score affects the same coach decision without forced improvement",()=>{
 assert.equal(enactmentWithAtlas43("jack","own",{strain:3},atlas(2.1),{}),"chat");
 assert.equal(enactmentWithAtlas43("jack","own",{strain:3},atlas(4.1),{}),"own");
 assert.equal(enactmentWithAtlas43("jack","joke",{strain:3},atlas(4,2.1),{}),"joke");
 assert.equal(enactmentWithAtlas43("jack","joke",{strain:3},atlas(4,4.3),{}),"reject_joke");
});
