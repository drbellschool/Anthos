import test from "node:test";
import assert from "node:assert/strict";
import {storySupabaseBase,PRODUCTION_URL} from "../api/jj4-database-config.mjs";
const BRANCH="deep-dive/4.1-authored-coaching";
const QUALITY="https://ktkjyrgooylksyhfajyj.supabase.co";
test("4.1 preview fails closed when branch-scoped Quality Lab URL is absent",()=>{
 assert.throws(()=>storySupabaseBase({VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:BRANCH}),/Quality Lab/);
 assert.throws(()=>storySupabaseBase({VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:BRANCH,
  SUPABASE_URL:PRODUCTION_URL,ANTHOS_QA_STRICT_ISOLATION:"1"}),/Quality Lab/);
 assert.throws(()=>storySupabaseBase({VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:BRANCH,
  SUPABASE_URL:QUALITY}),/strict isolation/);
});
test("4.1 preview connects only to QA when both explicit safeguards are present",()=>{
 const url=storySupabaseBase({VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:BRANCH,
  SUPABASE_URL:QUALITY,ANTHOS_QA_STRICT_ISOLATION:"1"});
 assert.equal(url,QUALITY+"/rest/v1/");
 assert.notEqual(url,PRODUCTION_URL+"/rest/v1/");
});
test("the five-episode QA guard does not change 4.0's existing environment routing",()=>{
 assert.equal(storySupabaseBase({VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"some-unrelated-branch"}),
 PRODUCTION_URL+"/rest/v1/");
 assert.throws(()=>storySupabaseBase({VERCEL_ENV:"production",
  ANTHOS_QA_STRICT_ISOLATION:"1",SUPABASE_URL:QUALITY}),/QA isolation/);
});
