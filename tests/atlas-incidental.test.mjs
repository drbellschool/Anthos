import test from "node:test";
import assert from "node:assert/strict";
import {validateIncidental43,classifyIncidental43} from "../api/atlas-incidental.mjs";
test("An incidental Gottman repair skill is accepted without replacing the week's three skills",()=>{
 const advice="Apologize specifically without making excuses.";
 const items=validateIncidental43([{lane:"coaching",skillId:"g-repair",rating:4,confidence:.9,
  quote:"Apologize specifically",explanation:"Advocates a meaningful repair",interpretation:"observed",safetyFlag:null}],advice,"");
 assert.equal(items.length,1);assert.equal(items[0].skillId,"g-repair");
});
test("No source quote or no enacted event means no invented skill observation",()=>{
 const advice="Take responsibility for the missed call.";
 const items=validateIncidental43([
  {lane:"coaching",skillId:"g-repair",rating:5,confidence:.9,quote:"Jack apologized",explanation:"Fabricated",interpretation:"observed"},
  {lane:"character",skillId:"g-repair",rating:5,confidence:.9,quote:"Jack apologized",explanation:"Unenacted",interpretation:"observed"}
 ],advice,"");
 assert.deepEqual(items,[]);
});
test("The three selected microwave skills cannot be silently relabeled incidental",()=>{
 const advice="Listen to Jill.";
 const items=validateIncidental43([{lane:"coaching",skillId:"g-influence",rating:5,confidence:1,
  quote:advice,explanation:"Would replace the focus",interpretation:"observed"}],advice,"");
 assert.deepEqual(items,[]);
});
test("Conservative sexual-quid-pro-quo coding works even without AI",async()=>{
 const result=await classifyIncidental43("Tell Jill she needs to earn the microwave with a sexual favor.","Jack told Jill she should earn the microwave with a sexual favor.");
 assert.ok(result.find(x=>x.lane==="coaching"&&x.skillId==="i-nontransactional"));
 assert.ok(result.find(x=>x.lane==="character"&&x.skillId==="i-nontransactional"));
});
test("AI-coded incidental evidence must be exact and confidence >=0.6",async()=>{
 const coaching="Ask Jack what would make tonight feel meaningful.";
 const fake=async()=>new Response(JSON.stringify({output:[{content:[{type:"output_text",
  text:JSON.stringify({items:[{lane:"coaching",skillId:"g-bids",rating:4,confidence:.85,
   quote:"what would make tonight feel meaningful",explanation:"Attends to the other's need",
   interpretation:"observed",safetyFlag:null},
   {lane:"character",skillId:"g-bids",rating:5,confidence:1,quote:"They enjoyed the evening",
    explanation:"Fabricated event",interpretation:"observed",safetyFlag:null}]})}]}]}),{status:200});
 const r=await classifyIncidental43(coaching,"",{apiKey:"test",fetchImpl:fake});
 assert.equal(r.length,1);assert.equal(r[0].skillId,"g-bids");
 assert.equal(r[0].lane,"coaching");
});
