import test from "node:test";
import assert from "node:assert/strict";
import {validateClosureEvidence,composeSophiaClosure,groundedClosureFallback} from "../api/jj4-closure.mjs";
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

test("fallback for a postponed conversation is grounded in the actual ending, not intimacy",()=>{
 const episode={title:"Can We Talk Later?",learningObjective:"Return to a postponed conversation"};
 const scenes=[
  {phase_index:4,body:"Jack checks the family calendar. Jill says she needs a specific time to revisit the problem."},
  {phase_index:5,body:"Jill points to the date they chose. Jack agrees to put a reminder on his phone."}
 ];
 const result=composeSophiaClosure(episode,{},scenes);
 assert.match(result,/family calendar|date they chose|reminder/);
 assert.doesNotMatch(result,/assumptions about affection|kind of closeness|physical intimacy/i);
});
test("cross-petal fact fallback copies events without inventing victory",()=>{
 const episode={title:"A Fight on Vacation"};
 const scenes=[
  {phase_index:4,body:"Jack puts his phone away and walks toward the beach. Jill follows him but still looks disappointed."},
  {phase_index:5,body:"Jill stops by the seawall to catch her breath. Jack waits without arguing."}
 ];
 const observation=groundedClosureFallback(episode,scenes);
 assert.match(observation,/beach|seawall|waits/);
 assert.doesNotMatch(observation,/affection|they agreed|reservation was restored|happily/i);
});
test("no observed ending produces uncertainty, not a fake agreement",()=>{
 const result=groundedClosureFallback({title:"A Generous Yes"},[]);
 assert.match(result,/A Generous Yes/);
 assert.doesNotMatch(result,/they agreed|fixed|repaired/i);
});


test("Sophia fallback never lowercases Jill or leaves an unfinished speech quote",()=>{
 const episode={title:"That's Not What Happened"};
 const scenes=[
 {phase_index:4,body:'Jill leans forward, voice firm, "I do not accept that writing words down settles this. The tone matters." Jack pushes the paper aside. Both remain uneasy.'},
 {phase_index:5,body:'Jack looks at the paper and thinks. Jill watches him carefully. He pushes the paper away.'}
 ];
 const result=groundedClosureFallback(episode,scenes);
 assert.match(result,/The ending showed these moments:/);
 assert.doesNotMatch(result,/\bjill\b/);
 assert.equal((result.match(/"/g)||[]).length%2,0);
 assert.doesNotMatch(result,/In the final moments, jill/);
});


test("Sophia fallback prioritizes both partners' actions, not a phone buzz and a seated Jack",()=>{
 const scenes=[
  {phase_index:4,body:"Jack's phone shrieked as he settled into his car, startling a pedestrian. Jack set an alarm to remind him to call Jill. Jill replied to ask him to message first."},
  {phase_index:5,body:"Jack sat in his parked car, phone in hand, hesitant to call Jill. Jack sent the text initiating the call, bracing himself. Jill answered cautiously, mixing relief with wariness."}
 ];
 const fallback=groundedClosureFallback({title:"Can We Talk Later?"},scenes);
 assert.match(fallback,/Jack sent the text initiating the call/);
 assert.match(fallback,/Jill answered cautiously/);
 assert.doesNotMatch(fallback,/phone shrieked|Jack sat in his parked car/);
 assert.match(fallback,/agreement cannot be assumed/);
});
