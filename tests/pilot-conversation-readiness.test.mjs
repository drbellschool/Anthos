import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("Sophia can return for new exchanges while preserving consent and message limits",()=>{
 const core=read("../api/pilot-core.mjs");
 assert.match(core,/const lastSophia=current\.findLastIndex/);
 assert.match(core,/const fresh=current\.slice\(lastSophia\+1\)/);
 assert.match(core,/fresh\.some\(m=>m\.author==="a"\)/);
 assert.match(core,/fresh\.some\(m=>m\.author==="b"\)/);
 assert.match(core,/current\.filter\(m=>m\.author==="sophia"\)\.length>=3/);
 assert.match(core,/invite them to decide whether to keep talking/);
 assert.match(core,/try\{await maybeSophia\(c\);\}catch/);
});
test("new messages and one keep-talking decision both reset shared readiness",()=>{
 const core=read("../api/pilot-core.mjs");
 assert.match(core,/export async function chapterReadiness\(invite,wantsToProceed\)/);
 assert.match(core,/if\(wantsToProceed\)\{/);
 assert.match(core,/\{ready_chapter:0\},"PATCH"/);
 assert.match(core,/ready_chapter:chapter\},"PATCH"/);
 assert.match(core,/votes\.every\(p=>p\.ready_chapter===chapter\)/);
 const route=read("../api/pilot.mjs");
 assert.match(route,/readiness:\(\)=>chapterReadiness\(token,body\.ready\)/);
 const migration=read("../supabase/migrations/20261101153000_pilot_spouse_chapter_readiness.sql");
 assert.match(migration,/ready_chapter smallint not null default 0/);
});
test("phone UI lets either spouse continue or explicitly choose ready",()=>{
 const html=read("../pilot/index.html"),js=read("../pilot/app.js");
 for(const id of ["readinessPanel","readinessStatus","readyButton","continueButton"])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/myChapterReady&&state\.partnerChapterReady/);
 assert.match(js,/act\("readiness",\{ready:true\}\)/);
 assert.match(js,/act\("readiness",\{ready:false\}\)/);
 assert.match(js,/!bothCurrent\|\|!sophiaJoined\|\|!bothReady/);
 assert.match(html,/Sophia will check in as you talk/);
 const css=read("../pilot/style.css");
 assert.match(css,/\.room\.is-live \.readiness-panel/);
});
