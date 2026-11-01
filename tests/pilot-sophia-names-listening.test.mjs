import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("Sophia is instructed to attend to actual disagreement and occasionally joke without quoting",()=>{
 const core=read("../api/pilot-core.mjs");
 assert.match(core,/genuinely LISTEN to the exact latest contributions/);
 assert.match(core,/one SPECIFIC contrast/);
 assert.match(core,/Never directly quote, cite, or merely paraphrase/);
 assert.match(core,/occasional light joke about Jack and Jill/);
 assert.match(core,/first names or nicknames naturally/);
 assert.match(core,/Don't force jokes each turn/);
 assert.match(core,/private beta editorial comments/);
 assert.match(core,/speakerName\(m\.author,names\)/);
 assert.match(core,/generate\(thread\.slice\(-26\),chapter,chapters,effects,namesFor\(c\)\)/);
 assert.match(core,/generate\(thread\.slice\(-26\),beatNumber\(c\.room\),chapters,effects,namesFor\(c\)\)/);
});
test("name is user-controlled, consent-gated and persists in server-only pilot participant record",()=>{
 const sql=read("../supabase/migrations/20261101140000_pilot_opt_in_personal_names.sql");
 const core=read("../api/pilot-core.mjs"),route=read("../api/pilot.mjs");
 assert.match(sql,/add column if not exists display_name text/);
 assert.match(core,/display_name:cleanName\(displayName\)/);
 assert.match(core,/if\(!c\.person\.consented_at\)fail\("Agree to the pilot/);
 assert.match(core,/displayName:c\.person\.display_name/);
 assert.match(core,/partnerName:c\.other\.display_name/);
 assert.match(route,/consent:\(\)=>consent\(token,body\.name\)/);
 assert.match(route,/name:\(\)=>setName\(token,body\.name\)/);
});
test("room collects names at consent, supports edits, and includes them in spouse message labels",()=>{
 const html=read("../pilot/index.html"),js=read("../pilot/app.js");
 for(const name of ["consentName","nameButton","nameDialog","editName","saveName"])
  assert.match(html,new RegExp('id="'+name+'"'));
 assert.match(js,/act\("consent",\{name\}\)/);
 assert.match(js,/act\("name",\{name\}\)/);
 assert.match(js,/state\.partnerName/);
 assert.match(js,/state\.displayName/);
 assert.match(html,/What should Sophia call you/);
});
