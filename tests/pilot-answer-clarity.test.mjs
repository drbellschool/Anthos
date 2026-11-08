// Archived expectations for retired Jack & Jill 1.x/2.x experiences.
// Active replacement coverage: tests/jj3-model.test.mjs and tests/jj3-integration.test.mjs.
import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const js=readFileSync(new URL("../pilot/app.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../pilot/index.html",import.meta.url),"utf8");
test("proposing spouse sees waiting screen, not ambiguous two-action review",()=>{assert.match(js,/Waiting for your spouse/);assert.match(js,/proposer\?"No action needed/);assert.match(js,/\$\("reopen"\)\.hidden=proposer/);assert.match(js,/\$\("approveAnswer"\)\.hidden=proposer/);});
test.skip("reviewing spouse has explicit approval and discussion alternatives",()=>{assert.match(html,/Yes, I agree — finish Deep Dive/);assert.match(html,/Let's discuss it more/);assert.match(js,/Please review your spouse/);});
test.skip("avoid overlapping Back to conversation and Keep talking buttons",()=>{assert.match(js,/\$\("backChat"\)\.hidden=state\.roomStatus!=="active"/);assert.doesNotMatch(html,/Keep talking instead/);assert.match(html,/FINAL CONFIRMATION|proposalStep/);});
