import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SKILLS,PHASES,defaultStudio,normalizeStudio} from "../api/episode-studio.mjs";

const html=readFileSync(new URL("../admin/index.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../admin/episode-studio.js",import.meta.url),"utf8");
const backend=readFileSync(new URL("../api/admin.mjs",import.meta.url),"utf8");
const scenario={
 title:"A Fight on Vacation",
 opening_scene:"Jack and Jill arrive late after a long drive and discover a lost hotel reservation. They disagree about who is at fault, and the beach is across the street.",
 learning_objective:"Practice a repair after frustration."
};

test("Anthos 4.0 catalog covers three researchers and six narrative phases",()=>{
 assert.equal(SKILLS.length,24);
 assert.deepEqual([...new Set(SKILLS.map(x=>x.researcher))].sort(),["Aron","Gottman","Schnarch"]);
 assert.deepEqual(PHASES.map(x=>x.id),["hook","conflict","discovery","reattempt","outcome","reflection"]);
 assert.equal(new Set(SKILLS.map(x=>x.id)).size,SKILLS.length);
});
test("The 4.0 editor starts with scenario seed but no fabricated learning results",()=>{
 const studio=defaultStudio(scenario);
 assert.equal(studio.title,scenario.title);
 assert.equal(studio.premise,scenario.opening_scene);
 assert.equal(studio.primarySkill,"");
 assert.deepEqual(studio.supportingSkills,[]);
 assert.equal(Object.keys(studio.phases).length,6);
 assert.equal(studio.phases.outcome,"");
});
test("Skill assignment normalizes invalid choices, duplicates and excessive supporting skills",()=>{
 const studio=normalizeStudio({
  title:"A Fight on Vacation",primarySkill:"g-repair",
  supportingSkills:["g-repair","s-soothe","s-soothe","a-new","g-bids","fake"],
  humorNotes:"own authored jokes",
  phases:{hook:"Introduce a concrete situation",conflict:"The choice produces a result",madeup:"not part of schema"}
 },scenario);
 assert.equal(studio.primarySkill,"g-repair");
 assert.deepEqual(studio.supportingSkills,["s-soothe","a-new"]);
 assert.equal(studio.humorNotes,"own authored jokes");
 assert.equal(studio.phases.madeup,undefined);
});
test("Long draft fields are bounded and original scenario data is unchanged",()=>{
 const studio=normalizeStudio({title:"x".repeat(200),humorNotes:"y".repeat(2000),runningGags:"z".repeat(1800)},scenario);
 assert.equal(studio.title.length,120);
 assert.equal(studio.humorNotes.length,1300);
 assert.equal(studio.runningGags.length,1300);
 assert.equal(scenario.title,"A Fight on Vacation");
});
test("Admin retains original sidebar and offers 5 free-navigation editor tabs",()=>{
 assert.match(html,/data-studio-tab="deepdives"/);
 assert.match(html,/data-studio-page="deepdives"/);
 assert.match(html,/id="episodeStudio"/);
 for(const tab of ["objectives","story","flow","humor","review"])assert.match(html,new RegExp('data-episode-tab="'+tab+'"'));
 assert.equal((html.match(/data-episode-tab="/g)||[]).length,5);
 for(const phase of ["hook","conflict","discovery","reattempt","outcome","reflection"])assert.ok(PHASES.some(x=>x.id===phase));
 assert.doesNotMatch(html,/8 learning milestones|MILESTONE INSPECTOR|Create Jack &amp; Jill 3\.0 pilot/);
});
test("AI draft, explicit save, and version 4 isolation are routed through authenticated admin",()=>{
 assert.match(backend,/if\(!isAdmin\(request\)\)return json\(\{error:"Administrator sign-in required\."\},401\)/);
 assert.match(backend,/action==="episode-studio-generate"/);
 assert.match(backend,/action==="episode-studio-save"/);
 assert.match(backend,/view"\)==="episode-studio"/);
 assert.match(ui,/anthos-episode-open/);
 assert.match(ui,/episode-studio-generate/);
 assert.match(ui,/episode-studio-save/);
 assert.match(ui,/Discard your unsaved/);
 assert.doesNotMatch(ui,/pilot-create-jack-jill|\/pilot\/?\?/);
});
