import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeStudio,preserveLockedText} from "../api/episode-studio.mjs";
import {scenarioGraph} from "./fixtures/jj43-what-makes-us-feel-close-graph.mjs";
import {episode} from "./fixtures/jj43-what-makes-us-feel-close.mjs";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const html=source("admin/index.html");
const ui=source("admin/episode-studio.js");
const css=source("admin/episode-studio.css");
const api=source("api/admin.mjs");

test("The visible Anthos Deep Dive Studio identifies 4.4 and retains legacy pilot controls",()=>{
 assert.match(html,/ANTHOS 4\.4 · DEEP DIVE OPERATIONS/);
 assert.match(html,/ANTHOS · DEEP DIVE STUDIO 4\.4/);
 for(const id of ["episodeLaunchPilot","episodeLaunchPilot41","episodeLaunchPilot42"])
  assert.match(html,new RegExp('id="'+id+'"[^>]*hidden'));
 assert.match(html,/id="episodeLaunchPilot44"/);
 assert.match(html,/id="episodeLaunchPilot43"/);
 assert.match(html,/id="episodeLaunchPilot43Timed"/);
 assert.match(html,/Deep Dive 4\.3 · Text the registered couple/);
 assert.doesNotMatch(html,/ANTHOS 4\.0 · CURRICULUM|VERSION 4\.0 · BROWSER|Deep Dive 4\.1 · Text/);
});
test("Four organized panels replace the previous six scattered version-specific editors",()=>{
 for(const section of [
  '"Foundation","foundation"',
  '"Story World","story"',
  '"Coaching & Evidence","flow"',
  '"Pilot & Review","pilot"'
 ])assert.ok(ui.includes(section));
 assert.doesNotMatch(ui,/"Six-Phase Developmental Flow","flow"/);
 assert.match(ui,/showStudioSection=key=>/);
 assert.match(ui,/panels\.pilot\.append\(board\)/);
 assert.match(ui,/legacyFlow\.hidden=true/);
 assert.match(css,/\.episode-studio \.episode-archived-fields/);
 assert.match(ui,/panels\.flow\.prepend\(readinessHost\)/);
});
test("Canon, five days, action consequences and both private openings are editable in one world panel",()=>{
 for(const key of ["who","what","where","when","why"])
  assert.match(ui,new RegExp('"'+key+'"'));
 assert.match(ui,/episodeWorld43/);
 assert.match(ui,/graph\.qualityContract/);
 assert.match(ui,/graph\.roleOpenings/);
 assert.match(ui,/graph\.days/);
 assert.match(ui,/graph\.rules/);
 assert.match(ui,/rule\.set/);
 assert.match(ui,/markDirty\(\)/);
 assert.match(ui,/sourceQuote/);
});
test("Only real, protected 4.3 SMS transcripts are exposed to signed-in administrators",()=>{
 assert.match(ui,/episode-studio-live-review/);
 assert.match(ui,/source==="model-validated"/);
 assert.match(ui,/Independent 8\/10 human certification: not yet established/);
 assert.match(api,/action==="episode-studio-live-review"/);
 assert.match(api,/adminPilotReview43/);
 assert.match(api,/if\(!isAdmin\(request\)\)return json\(\{error:"Administrator sign-in required\."\},401\)/);
 const service=source("api/jj4-core.mjs");
 assert.match(service,/export async function adminPilotReview43/);
 assert.match(service,/isOpen43\(room\)/);
 assert.doesNotMatch(service.slice(service.indexOf("export async function adminPilotReview43"),
  service.indexOf("async function messages(room,role)")),/encrypted_token|phone_e164|token_hash/);
});
test("Original approved 4.3 world survives old AI editor generation and remains episode-specific",()=>{
 const scenario={
  id:episode.id,title:episode.title,opening_scene:episode.premise,mode:"shared"
 };
 const editorial=normalizeStudio({
  title:episode.title,premise:episode.premise,
  learningObjective:episode.learningObjective,
  primarySkill:episode.primarySkill,supportingSkills:episode.supportingSkills,
  scenarioGraph
 },scenario);
 assert.deepEqual(editorial.scenarioGraph,scenarioGraph);
 const generated=normalizeStudio({
  title:episode.title,
  premise:"A newly drafted alternate premise with enough content to be accepted, though the generated story may still need editing.",
  learningObjective:episode.learningObjective,
  primarySkill:episode.primarySkill,supportingSkills:episode.supportingSkills
 },scenario);
 const after=preserveLockedText(generated,editorial);
 assert.deepEqual(after.scenarioGraph,scenarioGraph);
 assert.throws(()=>normalizeStudio({...editorial,scenarioGraph},{
  ...scenario,id:"some-other-episode"
 }),/graph ID mismatch/);
});

test("Previously saved 4.3 episode launches after Save completes, and draft state cannot silently disable it",()=>{
 assert.match(ui,/function setBusy\(on\)\{[\s\S]*?updatePilotControls43\(\);\n\}/);
 assert.match(ui,/function canLaunch43\(\)\{\n if\(!current\|\|current\.mode!=="shared"\)/);
 assert.doesNotMatch(ui,/if\(!current\|\|current\.dirty\|\|!current\.hasSaved\|\|current\.mode!=="shared"\)/);
 assert.match(ui,/if\(current\.dirty\|\|!current\.hasSaved\)\{\n  note\("Saving your 4\.3 episode before launching/);
 assert.match(ui,/if\(!await save\(\)\)return;/);
 assert.match(ui,/renderReadiness\(\);\n  return true;\n \}catch\(error\)/);
 assert.doesNotMatch(ui,/\bvoid autoDraftMissingDetails\(\);/);
 const verified=normalizeStudio({
  title:episode.title,premise:episode.premise,learningObjective:episode.learningObjective,
  primarySkill:episode.primarySkill,supportingSkills:episode.supportingSkills,
  scenarioGraph
 },{id:episode.id,title:episode.title,opening_scene:episode.premise,mode:"shared"});
 const skills=[verified.primarySkill,...verified.supportingSkills].filter(Boolean);
 assert.equal(verified.scenarioGraph.version,"anthos-4.3-scenario-graph-v1");
 assert.equal(verified.scenarioGraph.episodeId,episode.id);
 assert.equal(verified.scenarioGraph.days.length,5);
 assert.equal(verified.scenarioGraph.rules.length,12);
 assert.ok(skills.every(skill=>verified.scenarioGraph.days.some(day=>day.skills.includes(skill))));
});
