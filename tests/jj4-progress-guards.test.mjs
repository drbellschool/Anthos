import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {checkSceneProgression} from "../api/jj4-progress-guards.mjs";
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
