import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const story=JSON.parse(fs.readFileSync(path.join(root,"curriculum/stories/the-questions-we-stopped-asking.v1.json"),"utf8"));
test("Friendship story contains a full authored eight-chapter narrative",()=>{
 assert.equal(story.chapters.length,8);
 assert.equal(story.endings.length,6);
 assert.equal(story.slug,"the-questions-we-stopped-asking");
 assert.equal(story.petal,"friendship-admiration");
 for(const [i,c] of story.chapters.entries()){
  assert.equal(c.number,i+1);
  assert.ok(c.title.length>5);
  assert.ok(c.narrative.length>150);
  assert.ok(c.takeaway.length>45);
 }
});
test("six coached choices at three decision chapters and chapter 7 no advance hints",()=>{
 for(const i of [1,3,6]){
  const chapter=story.chapters[i];
  assert.equal(chapter.options.length,6);
  assert.ok(chapter.prompt.length>20);
  for(const choice of chapter.options){
   assert.ok(choice.text.length>18);
   assert.ok(choice.impact.length>35);
   assert.ok(choice.coach.length>40);
   assert.ok([0,1,2].includes(choice.quality));
  }
 }
 assert.equal(story.chapters[6].mastery,true);
 assert.equal(story.chapters[7].options,undefined);
 assert.equal(story.chapters.filter(c=>c.options).length,3);
});
test("six endings remain tied to Chapter 7 choices and no story is auto published",()=>{
 for(const ending of story.endings)assert.ok(ending.length>110);
 const sql=fs.readFileSync(path.join(root,"supabase/migrations/20261031060001_insert_questions_chapters.sql"),"utf8");
 assert.match(sql,/on conflict\(story_id,chapter_number\) do nothing/);
 assert.doesNotMatch(sql,/status='published'/);
});
