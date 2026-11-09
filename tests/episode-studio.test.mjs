import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 SKILLS,PHASES,CHECKPOINT_AFTER,CHECKPOINT_AUDIENCES,
 defaultStudio,defaultCheckpoints,normalizeStudio
} from "../api/episode-studio.mjs";

const html=readFileSync(new URL("../admin/index.html",import.meta.url),"utf8");
const ui=readFileSync(new URL("../admin/episode-studio.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../admin/episode-studio.css",import.meta.url),"utf8");
const backend=readFileSync(new URL("../api/admin.mjs",import.meta.url),"utf8");
const generator=readFileSync(new URL("../api/episode-studio.mjs",import.meta.url),"utf8");
const scenario={
 title:"A Fight on Vacation",mode:"shared",
 opening_scene:"Jack and Jill arrive late after a long drive and discover a lost hotel reservation. They disagree about who is at fault, and the beach is across the street.",
 learning_objective:"Practice a repair after frustration."
};

test("Research skill catalog covers three researchers without an eight-milestone gate",()=>{
 assert.equal(SKILLS.length,24);
 assert.deepEqual([...new Set(SKILLS.map(x=>x.researcher))].sort(),["Aron","Gottman","Schnarch"]);
 assert.deepEqual(PHASES.map(x=>x.id),["hook","conflict","discovery","reattempt","outcome","reflection"]);
 assert.equal(new Set(SKILLS.map(x=>x.id)).size,SKILLS.length);
 assert.deepEqual(CHECKPOINT_AFTER,["hook","conflict","discovery","reattempt","outcome"]);
 assert.deepEqual(CHECKPOINT_AUDIENCES,["none","jack","both","jill"]);
});
test("New drafts have six editable phases and exactly five optional, dormant interventions",()=>{
 const d=defaultStudio(scenario);
 assert.equal(d.title,scenario.title);
 assert.equal(d.premise,scenario.opening_scene);
 assert.equal(d.primarySkill,"");
 assert.deepEqual(d.supportingSkills,[]);
 assert.deepEqual(Object.keys(d.phases),PHASES.map(p=>p.id));
 assert.deepEqual(d.checkpoints,defaultCheckpoints());
 assert.ok(d.checkpoints.every(c=>c.audience==="none"&&!c.waitForReply));
});
test("Existing 4.0 drafts without checkpoints remain editable",()=>{
 const d=normalizeStudio({title:"The older draft",phases:{hook:"A setup"},humorNotes:"my original joke"},scenario);
 assert.equal(d.title,"The older draft");
 assert.equal(d.phases.hook,"A setup");
 assert.equal(d.humorNotes,"my original joke");
 assert.equal(d.checkpoints.length,5);
 assert.ok(d.checkpoints.every(x=>x.audience==="none"));
});
test("Shared episodes can assign Jack-only, both private coaches, and Jill-only check-ins",()=>{
 const d=normalizeStudio({checkpoints:[
  {afterPhase:"hook",audience:"jack",purpose:"Jack seeks help navigating a misunderstanding",humorCue:"GPS recurring joke",waitForReply:true},
  {afterPhase:"conflict",audience:"both",purpose:"Each has a consequential independent decision",humorCue:"The motel clerk remembers them",waitForReply:true},
  {afterPhase:"discovery",audience:"jill",purpose:"Jill privately reflects before a new choice",humorCue:"Her running callback",waitForReply:false}
 ]},scenario);
 assert.deepEqual(d.checkpoints.map(x=>x.audience),["jack","both","jill","none","none"]);
 assert.equal(d.checkpoints[0].waitForReply,true);
 assert.equal(d.checkpoints[2].waitForReply,false);
 assert.equal(d.checkpoints[0].humorCue,"GPS recurring joke");
});
test("Single coach episodes cannot inadvertently ask both users or switch recipient",()=>{
 const solo={...scenario,mode:"individual"};
 const d=normalizeStudio({soloCoach:"jill",checkpoints:[
  {afterPhase:"hook",audience:"both",waitForReply:true},
  {afterPhase:"conflict",audience:"jack",waitForReply:true},
  {afterPhase:"discovery",audience:"jill",waitForReply:true}
 ]},solo);
 assert.equal(d.soloCoach,"jill");
 assert.deepEqual(d.checkpoints.map(p=>p.audience),["none","none","jill","none","none"]);
 assert.deepEqual(d.checkpoints.map(p=>p.waitForReply),[false,false,true,false,false]);
});
test("Unknown or excessive objectives, jokes and check-in fields are bounded",()=>{
 const d=normalizeStudio({
  title:"x".repeat(200),humorNotes:"y".repeat(2000),
  primarySkill:"g-repair",supportingSkills:["g-repair","s-soothe","s-soothe","a-new","g-bids"],
  checkpoints:[{afterPhase:"hook",audience:"invalid",purpose:"a".repeat(900),humorCue:"b".repeat(1000),waitForReply:true}]
 },scenario);
 assert.equal(d.title.length,120);
 assert.equal(d.humorNotes.length,1300);
 assert.deepEqual(d.supportingSkills,["s-soothe","a-new"]);
 assert.equal(d.checkpoints[0].audience,"none");
 assert.equal(d.checkpoints[0].waitForReply,false);
 assert.equal(d.checkpoints[0].purpose.length,600);
 assert.equal(d.checkpoints[0].humorCue.length,700);
});
test("Admin retains left navigation and shows objectives, six-phase flow, integrated humor in three columns",()=>{
 assert.match(html,/data-studio-tab="deepdives"/);
 assert.match(html,/id="episodeStudio"/);
 assert.match(html,/id="episodeSkillList"/);
 assert.match(html,/id="episodePhases"/);
 assert.match(html,/id="episodeAddHumor"/);
 assert.match(html,/data-episode-field="humorNotes"/);
 assert.match(css,/\.episode-layout\{display:grid;grid-template-columns:/);
 assert.match(css,/\.studio-editing>/);
 assert.doesNotMatch(html,/data-episode-tab="humor"|class="episode-tabs"/);
 assert.doesNotMatch(html,/8 learning milestones|MILESTONE INSPECTOR|Create Jack &amp; Jill 3\.0 pilot/);
});
test("Check-ins are placed between phases and offer private sender targeting, reply gating and a humor cue",()=>{
 assert.match(ui,/if\(index===current\.phases\.length-1\)continue/);
 assert.match(ui,/dataset\.checkpointAudience/);
 assert.match(ui,/Jack → husband only/);
 assert.match(ui,/Jack \+ Jill → both, separately/);
 assert.match(ui,/Jill → wife only/);
 assert.match(ui,/Wait for reply/);
 assert.match(ui,/checkpointHumor/);
 assert.match(ui,/No pause here/);
});
test("AI must draft targeted interventions, while saved drafts remain admin-only and independent of SMS",()=>{
 assert.match(generator,/afterPhase,beforePhase/);
 assert.match(generator,/Return exactly five/);
 assert.match(generator,/never a fixed SMS punchline/);
 assert.match(generator,/waitForReply/);
 assert.match(backend,/action==="episode-studio-generate"/);
 assert.match(backend,/action==="episode-studio-save"/);
 assert.match(ui,/Discard unsaved changes/);
 assert.match(ui,/No SMS or pilot was launched/);
 assert.doesNotMatch(ui,/pilot-create-jack-jill|\/pilot\/?\?/);
});
