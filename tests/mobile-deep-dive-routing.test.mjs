import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const config=JSON.parse(readFileSync(new URL("../vercel.json",import.meta.url),"utf8"));
test("mobile Deep Dive landing route resolves explicitly to existing static HTML",()=>{
 const rewrites=config.rewrites||[];
 for(const path of ["/dive-review","/dive-review/"])
   assert.ok(rewrites.some(r=>r.source===path&&r.destination==="/dive-review/index.html"),path);
 const h=readFileSync(new URL("../dive-review/index.html",import.meta.url),"utf8");
 assert.match(h,/Deep Dive Mobile Review/);
 for(const relative of ["review.css","review.js","engine.js"])
   assert.ok(h.includes("/dive-review/"+relative),"missing asset reference "+relative);
});
test("review assets and both story files are physically present",async()=>{
 for(const item of ["../dive-review/review.css","../dive-review/review.js","../dive-review/engine.js","../dive-review/stories/questions.v1.json","../dive-review/stories/christmas.v1.json"]){
   const raw=readFileSync(new URL(item,import.meta.url),"utf8");
   assert.ok(raw.length>100,item);
 }
});
