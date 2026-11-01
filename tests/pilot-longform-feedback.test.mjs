import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {FULL_STORY} from "../api/pilot-story.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("eight fully authored Jack and Jill chapters, exactly three ungraded starters each",()=>{
 assert.equal(FULL_STORY.length,8);
 for(const [i,chapter] of FULL_STORY.entries()){
  assert.equal(typeof chapter.title,"string");
  assert.ok(chapter.story.split(/\s+/).length>=95,"chapter "+(i+1)+" needs enough story");
  assert.equal(chapter.options.length,3);
  assert.equal(new Set(chapter.options).size,3);
  assert.ok(!("quality" in chapter),"no educational grades in consumer experience");
 }
});
test("pilot editor can critique chapters, individual options, messages, shared answer, and general UX",()=>{
 const html=read("../pilot/index.html"),js=read("../pilot/app.js"),core=read("../api/pilot-core.mjs");
 for(const id of ["generalComment","chapterComment","commentDialog","commentText","submitComment","choiceOptions","customChoice","chapterHistory","answerComment"])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/makeCommentButton\("✎ Comment","option"/);
 assert.match(js,/makeCommentButton\("✎ Comment","message"/);
 assert.match(js,/makeCommentButton\("✎ Comment on chapter"/);
 assert.match(js,/openComment\("answer"/);
 assert.match(js,/act\("comment"/);
 assert.match(core,/export async function comment/);
 assert.match(core,/author_role:c.person.role/);
 assert.match(core,/chapter_number:chapter/);
 assert.match(core,/if\(rows\[0\]\.chapter_number!==chapter\)/);
 assert.match(core,/storyFor\(c\.room\)\.slice\(0,beatNumber\(c\.room\)\)/);
 assert.doesNotMatch(core,/function generate\([^]*?anthos_pilot_comments/);
});
test("new rooms use full story while legacy 3-moment rooms are preserved",()=>{
 const core=read("../api/pilot-core.mjs");
 assert.match(core,/story_format:"full"/);
 assert.match(core,/room\?\.story_format==="full"\?FULL_STORY:STORY_BEATS/);
 assert.match(core,/storyFormat:c\.room\.story_format\|\|"short"/);
 assert.match(core,/Finish the eight chapters/);
 assert.match(core,/storyFor\(c\.room\)\.length/);
 const route=read("../api/pilot.mjs");
 assert.match(route,/next:\(\)=>nextMoment\(token\)/);
 assert.match(route,/comment:\(\)=>comment\(token,body\)/);
});
test("private review migration and admin review route",()=>{
 const sql=read("../supabase/migrations/20261101033000_pilot_eight_chapters_editorial_comments.sql");
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.anthos_pilot_comments from public,anon,authenticated/);
 assert.match(sql,/grant select,insert,update,delete on public\.anthos_pilot_comments to service_role/);
 const admin=read("../api/admin.mjs");
 assert.match(admin,/isAdmin\(request\)/);
 assert.match(admin,/view"\)==="pilot-feedback"/);
 assert.match(read("../pilot/reviews/app.js"),/pilot-feedback/);
});
