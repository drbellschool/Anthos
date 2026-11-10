import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PHASES,normalizeStudio} from "../api/episode-studio.mjs";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const editor=read("../admin/episode-studio.js");
const html=read("../admin/index.html");
const css=read("../admin/episode-studio.css");
const library=read("../api/jj2-library.mjs");
const server=read("../api/episode-studio.mjs");

test("Studio browser script compiles",()=>{
 assert.doesNotThrow(()=>new Function(editor));
});
test("Six-panel layout uses one retained grid parent and original fields",()=>{
 assert.match(editor,/layout\.append\(nav,stage\)/);
 assert.doesNotMatch(editor,/layout\.replaceChildren\(nav,stage\)/);
 assert.doesNotMatch(editor,/cloneNode\(/);
 for(const key of ["foundation","scene","metadata","voice","flow","ending"]){
  assert.match(editor,new RegExp('panels\\.'+key+'\\.append\\('));
 }
 for(const id of ["learningObjective","jackExample","jillExample","sceneSetting","sceneStress",
  "sceneTrigger","sophiaIntro","closureCriteria","reflectionPrompt","researchNotes"]){
  assert.equal(html.split('data-episode-field="'+id+'"').length,2,id+" must exist exactly once");
 }
 assert.match(css,/episode-foundation-workspace/);
 assert.match(css,/episode-scene-workspace/);
 assert.match(css,/episode-phase-overview-card/);
});
test("Last saved episode is restored and Petal filters options",()=>{
 assert.match(editor,/restoreLastEpisode/);
 assert.match(editor,/anthos\.studio\.lastEpisodeId/);
 assert.match(editor,/item\.episode_saved/);
 assert.match(editor,/item\.petal_slug===petalPicker\.value/);
 assert.match(library,/episode_studio:"not\.is\.null"/);
 assert.match(library,/item\.episode_saved=savedIds\.has/);
});
test("Readiness remains expandable at top and phase check-ins remain five",()=>{
 assert.match(editor,/episode-readiness-rail/);
 assert.match(editor,/episodeReadinessHeadline/);
 assert.match(editor,/episode-phase-overview/);
 assert.match(editor,/const CHECKPOINT_IDS=PHASE_IDS\.slice\(0,-1\)/);
 assert.equal(PHASES.length,6);
 assert.equal(PHASES.slice(0,-1).length,5);
});
test("Changing couple/solo mode saves with versioned episode while retaining role rules",()=>{
 assert.match(html,/data-mode-choice="shared"/);
 assert.match(html,/data-mode-choice="jack"/);
 assert.match(html,/data-mode-choice="jill"/);
 assert.match(editor,/mode:current\.mode,status:current\.status,studio:s/);
 assert.match(server,/persistEpisodeStudio\(scenario\.id,expected,studio,mode,status\)/);
 const scenario={title:"Test",opening_scene:"A concrete original situation that begins with two conflicting needs and a decision to talk.",mode:"individual"};
 const s=normalizeStudio({soloCoach:"jill",checkpoints:[
  {afterPhase:"hook",audience:"both",waitForReply:true,purpose:"a",humorCue:""},
  {afterPhase:"conflict",audience:"jill",waitForReply:true,purpose:"b",humorCue:""}
 ]},scenario);
 assert.equal(s.checkpoints[0].audience,"none");
 assert.equal(s.checkpoints[1].audience,"jill");
});
test("Automatic AI suggestions never autosave or rewrite populated fields",()=>{
 assert.match(editor,/autoDraftMissingDetails/);
 assert.match(editor,/!draft\[key\]\.trim\(\)/);
 assert.match(editor,/!box\.value\.trim\(\)/);
 assert.match(editor,/current\.studio\.locks\.includes\(key\)/);
 assert.match(editor,/nothing has been saved automatically/i);
});
