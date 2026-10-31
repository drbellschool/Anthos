import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const app=read("../dive-review/review.js");
const page=read("../dive-review/index.html");
test("mobile reviewer exposes both-story reset control and intentional reset URL",()=>{
 assert.match(page,/id="resetAllButton"/);
 assert.match(page,/id="resetNotice"/);
 assert.match(app,/params\.get\("reset"\)==="stories"/);
 assert.match(app,/if\(resetOnOpen\)showResetResult\(cleared\)/);
 assert.match(app,/applyStory\(currentKey\)/);
 assert.match(app,/confirm\("Start both Deep Dives over at Chapter 1/);
});
test("reset removes only per-story reading state and leaves editorial notes and comments untouched",()=>{
 const start=app.indexOf("function resetAllStoryProgress(){");
 const end=app.indexOf("function showResetResult",start);
 assert.ok(start>0&&end>start);
 const snippet=app.slice(start,end);
 const fake=new Map([
   ["anthos_dive_review_v1_the-questions-we-stopped-asking_v1","prior answers"],
   ["anthos_dive_review_v1_christmas-tug-of-war_v1","prior answers"],
   ["anthos_dive_review_v1_the-questions-we-stopped-asking_v1_editorial_notes","important draft feedback"],
   ["anthos_editor_unsynced_comments_v1","unsynced comments"],
   ["unrelated_login_preference","keep"]
 ]);
 const storage={removeItem:k=>fake.delete(k)};
 const stories={questions:{id:"the-questions-we-stopped-asking",storyVersion:1},christmas:{id:"christmas-tug-of-war",storyVersion:1}};
 const success=runInNewContext(snippet+";resetAllStoryProgress()",{stories,localStorage:storage});
 assert.equal(success,true);
 assert.equal(fake.has("anthos_dive_review_v1_the-questions-we-stopped-asking_v1"),false);
 assert.equal(fake.has("anthos_dive_review_v1_christmas-tug-of-war_v1"),false);
 assert.equal(fake.get("anthos_dive_review_v1_the-questions-we-stopped-asking_v1_editorial_notes"),"important draft feedback");
 assert.equal(fake.get("anthos_editor_unsynced_comments_v1"),"unsynced comments");
 assert.equal(fake.get("unrelated_login_preference"),"keep");
});
test("storage failure cannot be presented as a successful reset",()=>{
 const start=app.indexOf("function resetAllStoryProgress(){");
 const end=app.indexOf("function showResetResult",start);
 const snippet=app.slice(start,end);
 const stories={questions:{id:"the-questions-we-stopped-asking",storyVersion:1}};
 const storage={removeItem:()=>{throw new Error("storage unavailable")}};
 assert.equal(runInNewContext(snippet+";resetAllStoryProgress()",{stories,localStorage:storage}),false);
 assert.match(app,/browser blocked clearing saved story progress/);
});
