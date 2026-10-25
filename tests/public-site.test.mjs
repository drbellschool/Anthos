import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const home=read("index.html");
const privacy=read("privacy/index.html");
const terms=read("terms/index.html");
const experience=read("experience/index.html");
const admin=read("admin/index.html");

test("Anthos public home has correct identity and does not claim a live service",()=>{
 assert.match(home,/<title>Anthos/);
 assert.match(home,/The adventure/);
 assert.match(home,/Threefold/);
 assert.match(home,/temporarily closed/);
 assert.match(home,/No live messages or accounts yet/);
 assert.doesNotMatch(home,/href=["']sms:/);
 assert.doesNotMatch(home,/<form\b/);
});
test("SMS disclosures are accessible and honest in all three public pages",()=>{
 for(const [file,text] of [["home",home],["privacy",privacy],["terms",terms]]){
   assert.match(text,/STOP/,"Missing STOP in "+file);
   assert.match(text,/HELP/,"Missing HELP in "+file);
   assert.match(text,/903\) 609-0465/,"Missing public SMS number in "+file);
   assert.match(text,/drbell@lonestarteacher\.com/);
 }
 assert.match(home,/Message frequency varies/);
 assert.match(home,/rates may apply/);
 assert.match(home,/Consent is not a condition of purchase/);
 assert.match(terms,/each person/);
 assert.match(privacy,/mobile phone numbers/);
});
test("existing routes remain intact, and the demo is clearly isolated",()=>{
 assert.match(home,/href="\/experience\/"/);
 assert.match(home,/href="\/privacy\/"/);
 assert.match(home,/href="\/terms\/"/);
 assert.match(experience,/INTERACTIVE DEMO/);
 assert.match(experience,/\.\.\/app\.js/);
 assert.match(experience,/\.\.\/content\.js/);
 assert.match(experience,/\.\.\/styles\.css/);
 assert.match(admin,/src="\/admin\/admin\.js"/);
 assert.match(admin,/href="\/experience\//);
 assert.match(read("vercel.json"),/\/api\/\(\.\*\)/);
});
test("No credentials, webhook URLs, or nonexistent enrollment forms on the public pages",()=>{
 for(const page of [home,privacy,terms]){
  assert.doesNotMatch(page,/sk-proj-|TELNYX_API_KEY|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|<input[^>]*name=["']phone/);
 }
});

test("admin implementation progress is authenticated, labeled and linked to tracker",()=>{
 assert.match(admin,/data-studio-tab="progress"/);
 assert.match(admin,/data-studio-page="progress"/);
 assert.match(admin,/Tracked snapshot/);
 assert.match(admin,/not a live GitHub or Vercel feed/);
 assert.match(admin,/github\.com\/drbellschool\/Anthos\/issues\/4/);
 const studio=read("admin/studio.js");
 assert.match(studio,/progress:"IMPLEMENTATION PROGRESS"/);
 assert.match(studio,/dashboard/);
});
