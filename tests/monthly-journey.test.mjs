import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";import {Script} from "node:vm";
const html=readFileSync(new URL("../journey/index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../journey/app.js",import.meta.url),"utf8");
const admin=readFileSync(new URL("../admin/progress.js",import.meta.url),"utf8");
test("month flows discovery to two distinct dives, Paraclete and adventure",()=>{
 for(const id of ["survey","team","solo","plan","adventure"])assert.match(html,new RegExp('id="'+id+'"'));
 for(const text of ["WEEK 1","WEEK 2","WEEK 3","WEEKS 2.5–3.5","WEEK 4","LOVE WHISPERS"])assert.ok(html.includes(text));
 assert.match(html,/Jack and Jill/);assert.match(html,/No real texts, AI, bookings, or partner accounts/);
});
test("survey reveal waits for both; solo stays private; authoring choice four free-form",()=>{
 assert.match(js,/if\(!data\.survey\.A\|\|!data\.survey\.B\)return/);
 assert.match(js,/data\.survey\.revealed=true/);
 assert.match(js,/My own response/);
 assert.match(js,/Private response saved; not revealed/);
 assert.match(js,/data\.solo\[who\]=\{index,text:safe\(value\)\}/);
 assert.doesNotMatch(js,/data\.solo\[who\].*planningClues/);
});
test("shared dialogue powers only bounded demo planning hints",()=>{
 assert.match(js,/const combined=data\.team\.map/);
 assert.match(js,/data\.team\.filter\(x=>x\.who!=="Sophia"\)\.length<2/);
 assert.match(js,/not fixed personality labels/);
 assert.doesNotMatch(js,/OPENAI_API_KEY|SUPABASE_SECRET_KEY|TELNYX_API_KEY|api\.openai\.com/);
 assert.doesNotThrow(()=>new Script(js));
});
test("admin progress includes new scope and does not call a demo customer-ready",()=>{
 assert.match(admin,/Monthly orchestration and planning/);
 assert.match(admin,/Monthly journey: survey/);
 assert.match(admin,/Scoped planning estimates, not live completion/);
 assert.match(admin,/not the customer-ready experience|not the customer-ready experience|not the customer-ready/);
});