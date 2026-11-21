import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
test("sanitized generation failure reason is logged without private coaching text",()=>{
 assert.match(source,/console\.warn\("jj4-generation-exhausted"/);
 assert.match(source,/phase,attempts,lastGateReason,simulated:simulate,strict:qualityGate/);
});
test("regular customer errors remain generic",()=>{
 assert.match(source,/room\.title\?\.startsWith\("QA STAGED "\)/);
 assert.match(source,/const qaReason=.*?\?/s);
});
