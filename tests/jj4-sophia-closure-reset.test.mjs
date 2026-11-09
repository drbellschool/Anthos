import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {composeSophiaClosure,RESEARCH_SOURCES} from "../api/jj4-closure.mjs";

const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const core=file("api/jj4-core.mjs");
const api=file("api/jack-jill-v4.mjs");
const admin=file("api/admin.mjs");
const editor=file("admin/episode-studio.js");
const html=file("admin/index.html");
const client=file("pilot-v4/player.js");
const css=file("pilot-v4/player.css");
const migration=file("supabase/migrations/20261109235000_jj4_sophia_closure.sql");

test("Sophia gives a separate researched closing reflection after the six fictional phases",()=>{
 const text=composeSophiaClosure({learningObjective:"Recognize emotional bids"},{
  observation:"Jack noticed Jill offering a small emotional bid while she also expressed different needs for affection.",
  practice:"Each partner can describe a welcome kind of connection and listen without assuming consent."
 });
 assert.match(text,/SOPHIA · A CLOSING THOUGHT/);
 assert.match(text,/What I noticed:/);
 assert.match(text,/Gottman/);
 assert.match(text,/Schnarch/);
 assert.match(text,/Aron/);
 assert.match(text,/clinical model, not a score/);
 assert.match(text,/One small thing to try:/);
 assert.match(text,/Jack and Jill are fictional/);
 assert.ok(text.length<2500);
 assert.equal(RESEARCH_SOURCES.length,3);
 for(const item of RESEARCH_SOURCES)assert.match(item.url,/^https:\/\//);
});
test("Sophia fallback remains available if the AI doesn't respond",()=>{
 const text=composeSophiaClosure({learningObjective:"Reflect on boundaries"});
 assert.match(text,/SOPHIA/);
 assert.ok(text.length>=120);
 assert.match(text,/One small thing to try:/);
});
test("Database saves one Sophia note only after the complete story, never as phase seven",()=>{
 assert.match(migration,/anthos_jj4_single_sophia_closure/);
 assert.match(migration,/kind in \('scene','prompt','coach','sophia'\)/);
 assert.match(migration,/stage='complete'/);
 assert.match(migration,/processing_token=p_claim/);
 assert.match(migration,/shared','sophia',5/);
});
test("Already-complete 4.0 rooms can generate Sophia using their old invitation",()=>{
 assert.match(api,/case "closure":return json\(await sophia\(token\)\)/);
 assert.match(core,/export async function sophia\(token\)/);
 assert.match(core,/room\.stage!=="complete"/);
 assert.match(core,/rpc\/anthos_jj4_claim_closure/);
 assert.match(core,/rpc\/anthos_jj4_commit_closure/);
 assert.match(core,/kind:"eq.scene"/);
 assert.match(core,/hasSophia/);
 assert.match(core,/researchSources:hasSophia\?RESEARCH_SOURCES/);
});
test("Fictional characters are Jack and Jill, not the real coaches",()=>{
 assert.match(core,/fictionalNames=\{jack:"Jack",jill:"Jill"\}/);
 assert.match(core,/fictionalCharacters:fictionalNames/);
 assert.match(core,/body:scrub\(m.body\)/);
 assert.match(core,/scene:brief\(scrub\(result.scene\)/);
 assert.doesNotMatch(core,/participants:cast/);
});
test("Admin reset requires saved edits, creates a fresh snapshot and retires prior room",()=>{
 assert.match(html,/id="episodePilotReset"/);
 assert.match(editor,/episodePilotReset"\)\.addEventListener/);
 assert.match(editor,/current\.dirty\|\|!current\.hasSaved/);
 assert.match(editor,/previousRoomId=pilot\?\.roomId\|\|null/);
 assert.match(editor,/scenarioId:current\.id,previousRoomId/);
 assert.match(core,/previous\.scenario_id!==scenario\.id/);
 assert.match(core,/stage:"retired"/);
 assert.match(admin,/body\.previousRoomId\|\|null/);
 assert.match(editor,/Previous test archived and its links retired/);
 assert.match(editor,/closePilot\(true\)/);
});
test("Sophia appears as a distinct final card with linked research sources",()=>{
 assert.match(client,/isSophia=item\.kind==="sophia"/);
 assert.match(client,/SOPHIA · THE RESEARCH & THE TAKEAWAY/);
 assert.match(client,/state\.researchSources/);
 assert.match(client,/state\.finished/);
 assert.match(client,/state\.hasSophia/);
 assert.match(client,/act\("closure"\)/);
 assert.match(css,/\.jj4-entry\.sophia/);
 assert.match(client,/anchor\.rel="noopener noreferrer"/);
});
