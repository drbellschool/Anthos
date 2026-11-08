// Archived expectations for retired Jack & Jill 1.x/2.x experiences.
// Active replacement coverage: tests/jj3-model.test.mjs and tests/jj3-integration.test.mjs.
import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test.skip("fixed-height mobile pilot keeps scene and chat in separate scroll areas",()=>{
 const css=read("../pilot/style.css"),html=read("../pilot/index.html"),client=read("../pilot/app.js");
 assert.match(css,/\.room\.is-live\{height:100dvh;min-height:0;overflow:hidden/);
 assert.match(css,/\.room\.is-live #storyMoment\{[^}]*max-height:36dvh;overflow-y:auto/);
 assert.match(css,/\.room\.is-live #conversation\{flex:1 1 0;min-height:0/);
 assert.match(css,/\.room\.is-live \.thread\{flex:1 1 0;min-height:0;max-height:none;overflow-y:auto/);
 for(const id of ["resolve","outcomeCard","outcomeText","outcomeComment","choicesBlock","commentDialog"])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(client,/classList\.toggle\("is-live"/);
 assert.match(client,/act\("resolve"\)/);
});
test("Gottman, Schnarch and Aron shape story outcomes privately, never choice grading",()=>{
 const core=read("../api/pilot-core.mjs");
 assert.match(core,/Gottman's bids\/repair/);
 assert.match(core,/Schnarch's differentiation/);
 assert.match(core,/Aron’s shared novelty/);
 assert.match(core,/Return one COHERENT story package/);
 assert.match(core,/next_scene/);
 assert.match(core,/Preserve the canonical next chapter/);
 assert.match(core,/room_id:c\.room\.id,chapter_number:chapter/);
 assert.match(core,/if\(c\.room\.story_format==="full"&&!/);
 assert.match(core,/const lastSophia=current\.findLastIndex/);
 const gen=core.split("async function generate(")[1].split("async function maybeSophia")[0];
 assert.doesNotMatch(gen,/anthos_pilot_comments/);
});
test.skip("feedback remains anchored and distinct from live dialogue sent to OpenAI",()=>{
 const sql=read("../supabase/migrations/20261101043000_pilot_ai_branching_outcomes.sql");
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.anthos_pilot_chapter_outcomes from public,anon,authenticated/);
 const core=read("../api/pilot-core.mjs");
 assert.match(core,/kind==="outcome"/);
 assert.match(core,/if\(!current\)fail\("The story consequence/);
 const ui=read("../pilot/index.html");
 assert.match(ui,/Private beta feedback for Anthos editorial review/);
 assert.match(ui,/Sophia may respond after you both speak/);
});
