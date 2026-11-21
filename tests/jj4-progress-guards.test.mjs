import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {checkSceneProgression,repeatedRhetoricalImage,sceneProgressionHints,hasNewConsequence,novelVisibleAfterEffect} from "../api/jj4-progress-guards.mjs";
const history=[{body:"Jack promised to check the repair cost tomorrow. Jill agreed to wait to decide whether to open the sealed box."}];
test("real live reflection repeat fails without concrete after-effect",()=>{
 const last="Jill rests her hands on the kitchen counter, eyes narrowing briefly at the box on the counter, then back to Jack’s guarded face. Jack shifts his stance and manages a shaky smile. I guess this box sitting here is our unspoken agreement — neither opened nor forgotten. With a bitter chuckle, Jill taps the box again. Yeah, a monument to waiting and our misfires. But I’m tired of frozen dinners and broken promises. Jack nods slowly, tension still tight but easing. Jill's poke at the box leaves it exactly where she put it—unopened, a cold truce neither dares thaw tonight. They share a quiet moment charged with lingering frustration and reluctant respect.";
 assert.equal(checkSceneProgression(history,last,5).ok,false);
});
test("earned reflection action without new agreement passes",()=>{
 const next="Jill wrote check repair estimate on the calendar beside the sealed box. Jack left the receipt on the counter instead of pretending the issue was solved. I will call tomorrow, he said; Jill answered, I'll believe that when I see it. Neither touched the box.";
 assert.equal(checkSceneProgression(history,next,5).ok,true);
});
test("explicit refusal has consequences without requiring happy ending",()=>{
 const next="Jill refused to leave the box where Jack wanted it and slid it out of his reach. I still don't agree, she said. Jack stepped away, but left the bank statement out for both of them.";
 assert.equal(checkSceneProgression(history,next,5).ok,true);
});
test("hook and early stages are allowed unresolved conflict",()=>{
 const hook="Jack saw the expensive microwave on the counter. Jill asked why he was staring at the box.";
 assert.equal(checkSceneProgression([],hook,0).ok,true);
 assert.equal(checkSceneProgression(history,hook,1).ok,true);
});
test("current core enforces scene progression for simulated episodes",()=>{
 const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
 assert.match(core,/checkSceneProgression\(sharedHistory,story,phaseIndex\)/);
});

test("a rerun of the museum-of-broken-promises metaphor is blocked",()=>{
 const h=[{body:"Jill tapped the sealed box. She called the note a museum of broken promises. Jack winced."}];
 const s="Jill lifted the lid of the repair manual and quipped that the kitchen had become a museum of broken promises. Jack frowned.";
 const result=checkSceneProgression(h,s,4);
 assert.equal(result.ok,false);
 assert.equal(result.code,"repeated_image");
 assert.ok(sceneProgressionHints(h).rhetoricalImagesAlreadySpent.length>0);
});
test("repeating a physical object is allowed when the action genuinely changes",()=>{
 const h=[{body:"The unopened box remained on the counter. Jack asked for a time to talk."}];
 const s="Jill refused to wait another Saturday. She wrote a repair deadline on the calendar and handed the pen to Jack. He agreed to phone the repair shop next morning.";
 assert.equal(checkSceneProgression(h,s,4).ok,true);
});
test("a symbolic final note removal without consequence fails",()=>{
 const h=[{body:"Jack wrote the reminder. Jill remained guarded. The unopened microwave box represented the argument."}];
 const s="Jack peeled off the old note and placed it by the box. Jill touched the box. He said it was time the note retired. The box remained a symbol of unresolved tension.";
 const r=checkSceneProgression(h,s,5);
 assert.equal(r.ok,false);
 assert.equal(r.code,"no_after_effect");
});
test("a new costly choice in the final scene passes without happy ending",()=>{
 const h=[{body:"Jack promised to call tomorrow. Jill would not yet agree to return the microwave."}];
 const s="Jill refused to put the purchase on the credit card. She wrote the spending limit on the family calendar; Jack said he needed to think before agreeing. She left the sealed box on the counter and walked away. He did not follow.";
 assert.equal(hasNewConsequence(h,s),true);
 assert.equal(checkSceneProgression(h,s,5).ok,true);
});
test("generic late-night kitchen tension is not a repeated image by itself",()=>{
 const h=[{body:"The couple stood in the kitchen. Jack asked about the money. Jill looked at the microwave."}];
 const s="Jill called the repair shop on speaker. There was no answer. Jack put the receipt beside the phone and refused to open the new appliance.";
 assert.equal(repeatedRhetoricalImage(h,s),null);
});
test("main engine feeds prior images and soft retries the style failures",()=>{
 const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
 assert.match(core,/freshnessConstraints:sceneProgressionHints\(sharedHistory\)/);
 assert.match(core,/progress.severity==="hard"\|\|attempt<maxAttempts-1/);
});

test("real latest Scene 6 fails: repeats agreement and a smudge, but no consequence",()=>{
 const history=[
 {body:"Jack writes on the fridge, 'Call repair service tomorrow.' Jill replies, 'We will wait for the estimate.'"},
 {body:"Jill says 'This box stays closed tonight.' Jack agrees to wait for the repair estimate and smiles."}
 ];
 const scene="Jack wipes a smudge from the fridge plan. Jill, arms folded by the sealed microwave box, says, 'I’m not opening it before the repair estimate. This box tests if we're syncing.' Jack rubs his neck and admits he should have acted sooner. Jill nods. The box stays untouched, tension palpable.";
 assert.equal(novelVisibleAfterEffect(history,scene),false);
 const decision=checkSceneProgression(history,scene,5);
 assert.equal(decision.ok,false);
 assert.equal(decision.code,"no_new_event");
 assert.equal(decision.severity,"hard");
});
test("final scene with new visible consequence remains allowed",()=>{
 const history=[{body:"Jack wrote a repair reminder. Jill said she would wait."}];
 const scene="Jill leaves the kitchen to heat her dinner on the stove. Jack puts the handwritten reminder in his coat pocket. The old note stays on the microwave. 'I can't fix the past by promising,' Jack says. Jill replies from the stove, 'You could start by showing up tomorrow.'";
 assert.equal(novelVisibleAfterEffect(history,scene),true);
 assert.equal(checkSceneProgression(history,scene,5).ok,true);
});
test("repeated plan writing is not new merely because the narration changed",()=>{
 const history=[{body:"Jack writes the repair appointment on his phone calendar."}];
 const scene="Jack writes the repair appointment in his phone calendar again. Jill stands by the box. Jack tells Jill that the plan now matters. Jill says she is cautiously hopeful.";
 assert.equal(novelVisibleAfterEffect(history,scene),false);
 assert.equal(checkSceneProgression(history,scene,5).severity,"hard");
});
test("late phase gets additional bounded attempts rather than silently accepting no event",()=>{
 const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
 assert.match(core,/const maxAttempts=simulate&&phaseIndex>=4\?Math.max\(attempts,5\):attempts/);
});

test("latest live Scene 6 cannot claim progress from 'open' used as an adjective",()=>{
 const history=[
  {body:"Jack wrote a sticky note calling for a repair estimate. Jill said they would wait."},
  {body:"Jill cracks the tape but keeps the box lid just slightly open. Jack watches her quietly."}
 ];
 const scene='Jack enters the kitchen, eyes on the slightly open microwave box marked by a faded note. Jack cautiously says, "We have not really talked about what happens next." Holding the box, Jill replies, "I am not ready to plug it in yet. I do not want to push while tension is here." Jack nods slowly. Though tension remains, Jill hesitates.';
 assert.equal(novelVisibleAfterEffect(history,scene),false);
 assert.equal(checkSceneProgression(history,scene,5).ok,false);
});
