import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const html=read("../dive-review/index.html");
const css=read("../dive-review/review.css");
const js=read("../dive-review/review.js");
const editor=read("../dive-review/review-editor.js");
test("Deep Dive reader owns a stationary top, a single scrollable slide, and a stationary footer",()=>{
 assert.match(html,/<header class="compact-header">/);
 assert.match(html,/<main class="reading-window" id="storyViewport">/);
 assert.match(html,/<footer class="reader-footer">/);
 assert.match(css,/grid-template-rows:clamp\(75px,10dvh,88px\) minmax\(0,1fr\) clamp\(92px,12dvh,111px\)/);
 assert.match(css,/\.slide-window\{min-height:0;overflow-y:auto;overflow-x:hidden/);
 assert.match(css,/html,body\{height:100%;margin:0;overflow:hidden\}/);
 assert.match(css,/\.story-text\{font:normal clamp\(21px,5\.3vw,23px\)/);
 assert.match(css,/\.choice span\{font:normal clamp\(18px,4\.8vw,21px\)/);
});
test("Each chapter only presents one scene, choice, outcome, or insight at a time",()=>{
 for(const stage of ["scene","choice","outcome","insight","finished"])
  assert.ok(html.includes('data-stage="'+stage+'"'),stage);
 assert.match(js,/pane\.hidden=pane\.dataset\.stage!==stage/);
 assert.match(js,/if\(stage==="scene"\)return setStage\(c\.options\?"choice":"insight"\)/);
 assert.match(js,/if\(stage==="outcome"\)\{if\(!v\.needsRepair\)return setStage\("insight"\)/);
 assert.match(js,/stage="outcome";renderReader\(\);animate\("next"\)/);
 assert.match(js,/if\(run\(\{type:"advance"\}\)\)/);
 assert.match(js,/next\.disabled=stage==="finished"\|\|\(stage==="choice"&&!v\.choice\)\|\|\(stage==="outcome"&&v\.needsRepair\)/);
});
test("Navigation animates but reduced-motion users retain instant transitions",()=>{
 assert.match(css,/@keyframes slideFromRight/);
 assert.match(css,/@keyframes slideFromLeft/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/id="previousButton"/);
 assert.match(html,/id="advanceButton"/);
});
test("Editor is hidden behind review tools and still anchors exact choices, consequences, repairs, and endings",()=>{
 assert.match(html,/id="toolsButton"/);
 assert.match(html,/id="reviewModeButton"/);
 assert.match(css,/\.phone:not\(\.review-on\) \.comment-chip\{opacity:\.83\}/);
 assert.match(js,/id==="the-questions-we-stopped-asking"/);
 assert.match(js,/dataset\.commentTarget="option_text"/);
 assert.match(js,/dataset\.commentTarget="repair_text"/);
 assert.match(editor,/#scenePane \.item-actions \.comment-chip/);
 assert.match(html,/id="queueDialog"/);
 assert.match(html,/id="commentDialog"/);
 assert.match(html,/id="reviewNotes"/);
 assert.doesNotThrow(()=>new Script(js));
 assert.doesNotThrow(()=>new Script(editor));
});
test("Reader does not expose a live couple reviewer role without authentication",()=>{
 assert.match(html,/Couple reviewers will have separate, permission-limited access in a future release/);
 assert.match(html,/Illustrative, not real partner data/);
 assert.doesNotMatch(js,/supabase\.co|OPENAI_API_KEY|TELNYX_API_KEY/);
});
