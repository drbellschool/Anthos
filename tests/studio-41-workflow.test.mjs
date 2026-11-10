import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeStudio} from "../api/episode-studio.mjs";
const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
const player=readFileSync(new URL("../pilot-v4/player.js",import.meta.url),"utf8");
const editor=readFileSync(new URL("../admin/episode-studio.js",import.meta.url),"utf8");
const scenario={title:"Changing Seasons of Desire",opening_scene:"An ordinary evening at home.",mode:"individual"};
test("New editorial fields survive a studio snapshot and remain optional for old episodes",()=>{
 const s=normalizeStudio({sophiaIntro:"Sophia introduces the objective.",jackExample:"Jack withdraws.",jillExample:"Jill avoids pressure.",sceneSetting:"Living room",toneApproach:"serious",toneIntensity:4,locks:["sophiaIntro","jackExample"]},scenario);
 assert.equal(s.sophiaIntro,"Sophia introduces the objective.");
 assert.equal(s.sceneSetting,"Living room");
 assert.equal(s.toneApproach,"serious");
 assert.equal(s.toneIntensity,4);
 assert.deepEqual(s.locks,["sophiaIntro","jackExample"]);
 assert.equal(normalizeStudio({},scenario).sophiaIntro,"");
});
test("Sophia opening is distinct from the post-story closure and precedes scenes",()=>{
 assert.match(core,/id:-1,kind:"introduction"/);
 assert.match(player,/SOPHIA · YOUR EPISODE OBJECTIVE/);
 assert.match(player,/SOPHIA · THE RESEARCH & THE TAKEAWAY/);
});
test("Individual pilot has one invite and requires only its active participant",()=>{
 assert.match(core,/const active=scenario.mode==="individual"\?\[draft.soloCoach\]:ROLE/);
 assert.match(core,/for\(const role of active\)/);
 assert.match(core,/activeRoles\(room\)\.every/);
 assert.match(editor,/const isSolo=room.mode==="individual"/);
});
test("Existing checkpoint editors remain in expandable phases",()=>{
 assert.match(editor,/episode-phase-fold/);
 assert.match(editor,/episodeExpandAll/);
 assert.match(editor,/episodeCollapseAll/);
 assert.match(editor,/waitForReply/);
});

test("Strict response schema includes required tone fields without unsupported numeric bounds",()=>{
 const api=readFileSync(new URL("../api/episode-studio.mjs",import.meta.url),"utf8");
 assert.match(api,/required:\[\.\.\.Object\.keys\(FIELDS\).*"toneApproach","toneIntensity"/);
 assert.doesNotMatch(api,/toneIntensity:\{type:"integer",minimum:/);
});
test("Selecting another skill adds support rather than replacing the primary",()=>{
 assert.match(editor,/else if\(!current\.studio\.primarySkill\)/);
 assert.match(editor,/current\.studio\.supportingSkills\.push\(skill\.id\)/);
});
