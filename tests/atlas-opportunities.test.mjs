import test from "node:test";
import assert from "node:assert/strict";
import {weeklyOpportunity,selectedFocus,coverageReport,missingWeeklyOpportunities} from "../api/atlas-opportunities.mjs";
import {buildConversation43,renderConversation42,weeklyRehearsal42,parseLedger42} from "../api/jj42-conversations.mjs";
import {savedMicrowaveStudio} from "./fixtures/jj41-microwave-saved-studio.mjs";
const ep=()=>buildConversation43({...structuredClone(savedMicrowaveStudio),pilotMode:"shared"},{fastForward:true});
test("All three microwave skills get an opportunity without demanding three skills in each text",()=>{
 const found=[0,1,2,3,4].map(day=>weeklyOpportunity(day));
 assert.deepEqual(found[0].skills,["s-decisions"]);
 assert.deepEqual(found[1].skills,["g-start"]);
 assert.deepEqual(found[2].skills,["g-influence"]);
 const coverage=coverageReport(found);
 assert.equal(coverage.complete,true);
 assert.deepEqual(coverage.offered,["s-decisions","g-start","g-influence"]);
 assert.deepEqual(missingWeeklyOpportunities(found.slice(0,2)),["g-influence"]);
});
test("The canonical five-day episode records opportunities for the selected skills",()=>{
 const e=ep();
 const path=weeklyRehearsal42(e,[
  "Call Jack before buying.","Own the missed repair promises.","Listen to his concern.",
  "Call the repair shop today.","Wait and review together."
 ]);
 const days=path.ledger.slice(0,5);
 assert.deepEqual(days.map(day=>day.opportunitySkills),[
  ["s-decisions"],["g-start"],["g-influence"],
  ["g-start","g-influence"],["s-decisions","g-influence"]
 ]);
 assert.equal(coverageReport(days).complete,true);
 // An opportunity is not the same as a scored behavior: some ratings may be absent.
 assert.ok(days.some(d=>!d.assessment||Object.values(d.assessment?.behavior||{}).some(x=>x===null)));
});
test("Open conversation day zero records one selected skill opportunity without award",()=>{
 const e=buildConversation43({...structuredClone(savedMicrowaveStudio),pilotMode:"shared"},{fastForward:true,openConversation:true});
 const out=renderConversation42(e,0,[]);
 const day=parseLedger42(out.scene);
 assert.deepEqual(day.opportunitySkills,["s-decisions"]);
 assert.equal(day.assessment,null);
});
test("Only one primary and up to two supporting selected skills are valid",()=>{
 assert.deepEqual(selectedFocus("s-decisions",["g-start","g-influence"]),["s-decisions","g-start","g-influence"]);
 assert.throws(()=>selectedFocus("g-start",["g-start"]));
 assert.throws(()=>selectedFocus("g-start",["g-bids","g-repair","g-world"]));
});
