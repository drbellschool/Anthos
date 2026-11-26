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

test("The visible studio offers only the shared storybook launch",()=>{
 assert.match(html,/ANTHOS · DEEP DIVE STUDIO 4\.4/);
 assert.match(html,/id="episodeLaunchPilot44"/);
 assert.match(html,/id="episodeSharedPlayer"/);
 assert.doesNotMatch(html,/4\.3|id="episodeLaunchPilot43|id="episodePilotSms|id="episodeHusbandPlayer"|id="episodeWifePlayer"/);
 assert.doesNotMatch(ui,/4\.3|episode-studio-live-review|episode-studio-sms-setup/);
});
test("Four organized panels support storybook editorial guidance and preview",()=>{
 for(const section of ['"Foundation","foundation"','"Story Design","story"','"Weekly Rhythm","flow"','"Storybook Preview","pilot"'])assert.ok(ui.includes(section));
 assert.match(ui,/showStudioSection=key=>/);
 assert.match(ui,/panels\.pilot\.append\(board\)/);
 assert.match(ui,/legacyFlow\.hidden=true/);
 assert.match(css,/\.episode-studio \.episode-archived-fields/);
 assert.match(ui,/panels\.flow\.prepend\(readinessHost\)/);
});
test("One shared reader uses both participant invitations and no chat panels",()=>{
 assert.match(ui,/Anthos4Player\.mount\(\$\("episodeSharedPlayer"\)/);
 assert.match(ui,/secondInvite:new URL\(jill\.href\)/);
 assert.match(ui,/pilotVersion:"4\.4\.0"/);
 assert.match(ui,/function canLaunch44/);
 assert.match(ui,/if\(!await save\(\)\)return;/);
 const player=source("pilot-v4/player.js");
 assert.match(player,/jj44-sheet/);assert.match(player,/jj44-contributions/);
 assert.match(player,/queue\(key,"illustrate"/);
 assert.doesNotMatch(player,/PRIVATE MESSAGE|Send text|private conversation/);
});
test("Historical SMS transcript backend remains authenticated",()=>{
 assert.match(api,/action==="episode-studio-live-review"/);
 assert.match(api,/adminPilotReview43/);
 assert.match(api,/if\(!isAdmin\(request\)\)return json\(\{error:"Administrator sign-in required\."\},401\)/);
 const service=source("api/jj4-core.mjs");
 assert.match(service,/export async function adminPilotReview43/);
 assert.match(service,/isOpen43\(room\)/);
 assert.doesNotMatch(service.slice(service.indexOf("export async function adminPilotReview43"),service.indexOf("async function messages(room,role)")),/encrypted_token|phone_e164|token_hash/);
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

test("Previously saved episodes retain their historical metadata while the storybook saves pending edits",()=>{
 assert.match(ui,/function canLaunch44/);
 assert.match(ui,/if\(current\.dirty\|\|!current\.hasSaved\)/);
 assert.match(ui,/if\(!await save\(\)\)return;/);
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
