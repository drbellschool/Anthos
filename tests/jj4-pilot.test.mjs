import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const file=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const html=file("admin/index.html");
const editor=file("admin/episode-studio.js");
const player=file("pilot-v4/player.js");
const standalone=file("pilot-v4/index.html");
const endpoint=file("api/jack-jill-v4.mjs");
const core=file("api/jj4-core.mjs");
const sql=file("supabase/migrations/20261109233000_jj4_browser_pilot.sql");
const admin=file("api/admin.mjs");
test("Episode Studio displays two independent private coaches and links inside the admin",()=>{
 for(const id of ["episodeLaunchPilot","episodePilotBoard","episodeHusbandLink","episodeWifeLink",
 "episodeHusbandPlayer","episodeWifePlayer","episodeCopyHusband","episodeCopyWife"]){
  assert.ok(html.includes('id="'+id+'"'),"missing "+id);
 }
 assert.match(html,/\/pilot-v4\/player\.js/);
 assert.match(html,/\/pilot-v4\/player\.css/);
 assert.match(editor,/episode-studio-pilot-v4/);
 assert.match(editor,/Anthos4Player\.mount\(\$\("episodeHusbandPlayer"\),jToken\)/);
 assert.match(editor,/Anthos4Player\.mount\(\$\("episodeWifePlayer"\),wToken\)/);
 assert.match(editor,/current\.dirty\|\|!current\.hasSaved/);
});
test("4.0 runs on distinct token route without sending SMS or accessing 3.3 live players",()=>{
 assert.match(admin,/createRoom as createV4PilotRoom/);
 assert.match(admin,/action==="episode-studio-pilot-v4"/);
 assert.match(endpoint,/x-anthos-v4-invite/);
 assert.match(endpoint,/request\.headers\.get\("origin"\)/);
 for(const x of ["join","advance","coach"])assert.match(endpoint,new RegExp('case "'+x+'"'));
 assert.doesNotMatch(core,/from "\.\/jj3-core|from "\.\/jj-guided/);
 assert.match(core,/No actual text messages will be sent/);
 assert.match(standalone,/\/pilot-v4\/start\.js/);
});
test("4.0 snapshot uses exact author supplied six phases and intervention settings",()=>{
 assert.match(core,/const draft=normalizeStudio\(scenario\.episode_studio,scenario\)/);
 assert.match(core,/episode:draft/);
 assert.match(core,/savedSixPhaseStoryboard:room\.episode\.phases/);
 assert.match(core,/phaseStoryDirection:storyDirection/);
 assert.match(core,/lockedEditorialFields:room\.episode\.locks/);
 assert.match(core,/checkpoint:cp/);
 assert.match(core,/FIXED episode plan/);
 assert.match(core,/DO NOT invent another premise/);
 assert.match(core,/Keep the plot within the six planned phases/);
 assert.match(core,/exact saved checkpoint\.purpose/);
});
test("Pilot data is isolated and each coach reads only their own messages",()=>{
 for(const table of ["anthos_jj4_rooms","anthos_jj4_participants","anthos_jj4_messages"]){
  assert.match(sql,new RegExp("create table if not exists public\\."+table));
  assert.match(sql,new RegExp("alter table public\\."+table+" enable row level security"));
 }
 assert.match(sql,/revoke all on public\.anthos_jj4_rooms/);
 assert.match(core,/role:"eq\.shared"/);
 assert.match(core,/role:"eq\."\+role/);
 assert.match(core,/token_hash:"eq\."\+sha\(token\)/);
 assert.match(sql,/unique\(room_id,role,request_key\)/);
});
test("Private intervention audiences and wait flags drive state transitions",()=>{
 assert.match(sql,/if aud in \('jack','both'\)/);
 assert.match(sql,/if aud in \('jill','both'\)/);
 assert.match(sql,/when wait_flag and aud in \('jack','jill','both'\) then 'awaiting'/);
 assert.match(sql,/if both_ready then update/);
 assert.match(sql,/stage='generating',processing_token=p_claim/);
 assert.match(sql,/r\.processing_token is distinct from p_claim/);
});
test("Rehearsal progresses automatically between checkpoints without scripted coach turns",()=>{
 assert.match(player,/autoTimer=setTimeout/);
 assert.match(player,/act\("advance"\)/);
 assert.match(player,/state\.needsReply/);
 assert.match(player,/state\.finished/);
});

test("Both private coach name fields submit on Enter and Join remains enabled after initial fetch",()=>{
 // The same mounted component serves husband and wife; verify its join panel
 // handles Enter without a form and its buttons are never left disabled.
 assert.match(player,/const join=oneAction\("Join "/);
 assert.match(player,/inp\.addEventListener\("keydown",event=>\{/);
 assert.match(player,/event\.key==="Enter"&&!event\.isComposing/);
 assert.match(player,/event\.preventDefault\(\)/);
 assert.match(player,/join\.click\(\)/);
 assert.match(player,/btn\.disabled=false/);
 assert.doesNotMatch(player,/btn\.disabled=inFlight/);
 assert.match(player,/if\(!inFlight&&!destroyed\)callback\(\)/);
 assert.match(player,/if\(!name\)\{message\("Enter your first name to join\."/);
});
