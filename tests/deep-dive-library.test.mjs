import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(dir,p),"utf8");
const schema=read("supabase/migrations/20261031050000_anthos_deep_dive_library.sql");
const catalog=read("supabase/migrations/20261031050001_seed_twelve_petals_and_120_outlines.sql");
const chapters=read("supabase/migrations/20261031050002_seed_christmas_tug_of_war.sql");

test("exactly twelve agreed curriculum petals, with ten draft outlines each",()=>{
  const rows=[...catalog.matchAll(/^\('([a-z0-9-]+)', 1, '([a-z0-9-]+)', '(?:[^']|'')+', '(?:[^']|'')+', '(draft|in_review)', ARRAY\[/gm)];
  assert.equal(rows.length,120);
  const grouped=new Map();
  for(const [,slug,petal,status] of rows){
    grouped.set(petal,(grouped.get(petal)||0)+1);
    assert.ok(slug.length>=3);
    assert.ok(status==="draft"||status==="in_review");
  }
  assert.equal(grouped.size,12);
  for(const count of grouped.values())assert.equal(count,10);
  assert.equal(rows.filter(x=>x[3]==="in_review").length,1);
  assert.ok(rows.some(x=>x[1]==="christmas-tug-of-war"&&x[3]==="in_review"));
});

test("twelve month identity is not confused with a fixed learning sequence",()=>{
  assert.match(schema,/sort_order smallint not null unique check \(sort_order between 1 and 12\)/);
  assert.match(schema,/not a mandated calendar sequence/);
  assert.match(catalog,/Monthly order will be chosen per couple/);
  assert.match(catalog,/friendship-admiration/);
  assert.match(catalog,/individuality-growth/);
  assert.match(catalog,/emotional-safety-vulnerability/);
  assert.match(catalog,/desire-physical-intimacy/);
  assert.match(catalog,/money-stewardship/);
});

test("versioned stories, private data and explicit publication status",()=>{
  assert.match(schema,/unique\(slug,story_version\)/);
  assert.match(schema,/references public\.deep_dive_stories\(slug,story_version\)/);
  assert.match(schema,/published_requires_date/);
  assert.match(schema,/status in \('draft','in_review','published','retired'\)/);
  assert.match(schema,/revoke all on table public\.anthos_petals/);
  assert.match(schema,/from public, anon, authenticated/);
  assert.match(schema,/enable row level security/g);
  assert.doesNotMatch(schema,/grant (insert|update|delete) on table .* authenticated/i);
});

test("authored story satisfies eight milestones and chapter-seven mastery",()=>{
  const rows=[...chapters.matchAll(/^\(([1-8]),'/gm)];
  assert.equal(rows.length,8);
  assert.deepEqual(rows.map(x=>Number(x[1])),[1,2,3,4,5,6,7,8]);
  assert.match(schema,/authored_six_choices/);
  assert.match(schema,/independent_mastery_is_chapter_seven/);
  assert.match(schema,/seventh_chapter_requires_choices/);
  assert.match(schema,/eighth_chapter_not_a_choice/);
  assert.match(schema,/endings_only_on_eight/);
  assert.match(chapters,/christmas-tug-of-war/i);
  assert.match(chapters,/on conflict \(story_id,chapter_number\) do nothing/);
});
