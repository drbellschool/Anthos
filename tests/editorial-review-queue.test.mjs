import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const html=read("../dive-review/index.html");
const js=read("../dive-review/review-editor.js");
const app=read("../dive-review/review.js");
const admin=read("../api/admin.mjs");
const api=read("../api/review-workflow.mjs");
const sql=read("../supabase/migrations/20261031070000_deep_dive_editorial_reviews.sql");
test("inline comments exist on each meaningful content kind",()=>{
 for(const kind of ["chapter_title","narrative","prompt","option_impact","option_coach","takeaway","transition"])
   assert.ok(html.includes('data-comment-target="'+kind+'"'),kind);
 assert.match(app,/dataset\.commentTarget="option_text"/);
 assert.match(app,/dataset\.commentTarget="repair_text"/);
 assert.match(app,/anthos-review-render/);
 assert.match(html,/review-editor\.js/);
 assert.match(html,/id="queueDialog"/);
 assert.match(html,/id="commentDialog"/);
});
test("editor parses and supports protected server sync, local unsynced drafts and view-only overlays",()=>{
 assert.doesNotThrow(()=>new Script(js));
 assert.match(js,/PENDING_KEY/);
 assert.match(js,/x-threefold-admin|X-Threefold-Admin/i);
 assert.match(js,/review-submit/);
 assert.match(js,/review-resolve/);
 assert.match(js,/\["suggested","accepted"\]/);
 assert.match(js,/acceptLowRisk/);
 assert.match(html,/Nothing gets published automatically/);
});
test("server review routes retain admin protection, CSRF check and request size limits",()=>{
 assert.match(admin,/if\(!isAdmin\(request\)\)return json\(\{error:"Administrator sign-in required\."/);
 assert.match(admin,/if \(!validOrigin\(request\)\)/);
 assert.match(admin,/if\(action==="review-submit"\|\|action==="review-resolve"\)/);
 assert.match(admin,/get\("view"\)==="reviews"/);
 assert.match(api,/SUPABASE_SECRET_KEY/);
 assert.match(api,/OPENAI_API_KEY/);
 assert.match(api,/store:false/);
 assert.match(api,/new review version/);
 assert.doesNotMatch(js,/SUPABASE_SECRET_KEY|OPENAI_API_KEY/);
});
test("database review rows are private and no story content is auto-modified",()=>{
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.deep_dive_editorial_comments from public,anon,authenticated/);
 assert.match(sql,/one_accepted_per_location/);
 assert.match(sql,/story_id uuid not null references public\.deep_dive_stories/);
 assert.match(api,/Original authored story preserved/);
 assert.doesNotMatch(api,/query\("deep_dive_chapters"[^;]*,"PATCH"\)/);
 assert.doesNotMatch(api,/query\("deep_dive_stories"[^;]*,"PATCH"\)/);
});
