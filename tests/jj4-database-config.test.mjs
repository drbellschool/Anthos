import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {storySupabaseBase,storySupabaseHeaders,PRODUCTION_URL} from "../api/jj4-database-config.mjs";

const prod="kstluxwgrrgdbjyloscb";
const qa="fake-quality-lab-project";
test("production behavior remains unchanged without a QA override",()=>{
 assert.equal(storySupabaseBase({}),PRODUCTION_URL+"/rest/v1/");
 assert.match(storySupabaseBase({}),new RegExp(prod));
});
test("an isolated QA session requires a nonproduction Supabase URL",()=>{
 assert.throws(()=>storySupabaseBase({ANTHOS_QA_STRICT_ISOLATION:"1",VERCEL_ENV:"preview"}),/isolated/);
 assert.throws(()=>storySupabaseBase({ANTHOS_QA_STRICT_ISOLATION:"1",VERCEL_ENV:"preview",SUPABASE_URL:PRODUCTION_URL}),/isolated/);
 assert.throws(()=>storySupabaseBase({ANTHOS_QA_STRICT_ISOLATION:"1",VERCEL_ENV:"production",SUPABASE_URL:"https://"+qa+".supabase.co"}),/production/);
 assert.equal(storySupabaseBase({ANTHOS_QA_STRICT_ISOLATION:"1",VERCEL_ENV:"preview",SUPABASE_URL:"https://"+qa+".supabase.co"}),"https://"+qa+".supabase.co/rest/v1/");
});
test("malformed, cross-origin and credential-embedded database URL overrides are rejected",()=>{
 for(const value of ["http://"+qa+".supabase.co","https://evil.example.com",
  "https://"+qa+".supabase.co/rest/v1/","https://user:password@"+qa+".supabase.co",
  "https://"+qa+".supabase.co?secret=123","https://"+qa+".supabase.co#fragment"]){
  assert.throws(()=>storySupabaseBase({SUPABASE_URL:value}));
 }
});
test("both story modules use the same server-side routing control",()=>{
 for(const name of ["jj4-core.mjs","jj2-library.mjs"]){
  const source=readFileSync(new URL("../api/"+name,import.meta.url),"utf8");
  assert.match(source,/storySupabaseBase\(\)\+resource/);
  assert.doesNotMatch(source,/const (?:BASE|ROOT)="https:\/\/kstluxwgrrgdbjyloscb/);
 }
});

test("modern opaque Supabase secret keys are sent only in apikey header",()=>{
 const key="sb_secret_test_secret_from_qa";
 const headers=storySupabaseHeaders(key);
 assert.equal(headers.apikey,key);
 assert.equal(Object.hasOwn(headers,"Authorization"),false);
});
test("legacy JWT service role key retains production bearer authorization",()=>{
 const key="eyJhbGciOiJIUzI1NiJ9.test.signature";
 const headers=storySupabaseHeaders(key);
 assert.equal(headers.apikey,key);
 assert.equal(headers.Authorization,"Bearer "+key);
});
test("both Jack/Jill modules call the shared key header selector",()=>{
 for(const name of ["jj4-core.mjs","jj2-library.mjs"]){
  const src=readFileSync(new URL("../api/"+name,import.meta.url),"utf8");
  assert.match(src,/headers:storySupabaseHeaders\(key\)/);
 }
});
