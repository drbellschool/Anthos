import test from "node:test";
import assert from "node:assert/strict";
import {validateClosureEvidence,composeSophiaClosure} from "../api/jj4-closure.mjs";
const scenes=[
 {phase_index:3,body:"Jack suggested checking the return policy later."},
 {phase_index:4,body:"Jill snapped the packing tape, opened the box and said she wanted the microwave tonight."},
 {phase_index:5,body:"Jack watched the opened microwave box on the counter. They were still upset."}
];
test("Sophia must cite the final story, not an earlier proposed compromise",()=>{
 assert.equal(validateClosureEvidence({
  evidence:"Jack suggested checking the return policy later.",
  observation:"They agreed to check the policy and leave the box sealed."
 },scenes).ok,false);
});
test("visible final consequence supports grounded Sophia closure",()=>{
 assert.equal(validateClosureEvidence({
  evidence:"Jill snapped the packing tape, opened the box",
  observation:"Jill decided to open the replacement despite the unresolved disagreement."
 },scenes).ok,true);
});
test("Sophia cannot call an opened box unopened",()=>{
 const result=validateClosureEvidence({
  evidence:"Jill snapped the packing tape, opened the box",
  observation:"They left the unopened box on the counter."
 },scenes);
 assert.equal(result.ok,false);
 assert.match(result.reason,/opened box/);
});
test("Sophia can always provide a non-invented fallback without external AI",()=>{
 const text=composeSophiaClosure({title:"The Four-Hundred-Dollar Surprise"});
 assert.match(text,/Jill bought a \$400 microwave/);
 assert.doesNotMatch(text,/they agreed|confirmed refund|return deadline/i);
});

test("Sophia cannot invent mutual agreement when the ending only shows Jill acting",()=>{
 const out=validateClosureEvidence({
  evidence:"Jill snapped the packing tape, opened the box",
  observation:"They agreed to pause on returning the appliance and rebuild trust."
 },scenes);
 assert.equal(out.ok,false);
 assert.match(out.reason,/unearned mutual agreement/);
});
