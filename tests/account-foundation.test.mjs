import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../supabase/migrations/20261030_01_account_foundation.sql", import.meta.url), "utf8");
const html = await readFile(new URL("../account/index.html", import.meta.url), "utf8");
const js = await readFile(new URL("../account/account.js", import.meta.url), "utf8");

test("pilot is not linked into the public marketing site", async () => {
  const homepage = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(homepage, /href=["']\/account\//);
  assert.match(html, /PRIVATE DEVELOPMENT PILOT/);
  assert.match(html, /SMS requires its own separate opt-in/);
});

test("account access and private profile policies are strictly user-scoped", () => {
  assert.match(sql, /participants_read_own[\s\S]*?auth\.uid\(\)\) = user_id/i);
  assert.match(sql, /participants_create_own[\s\S]*?auth\.uid\(\)\) = user_id/i);
  assert.match(sql, /participants_update_own[\s\S]*?with check \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /couple_members_read_own[\s\S]*?auth\.uid\(\)\) = user_id/i);
  assert.match(sql, /couples_read_own_active[\s\S]*?cm\.status = 'active'/i);
  assert.match(sql, /deep_dive_progress_read_own[\s\S]*?auth\.uid\(\)\) = participant_id/i);
  assert.doesNotMatch(sql, /grant (insert|update|delete)\s+on public\.(couples|couple_members|deep_dive_progress|partner_shares|sms_)/i);
  assert.match(sql, /revoke all on public\.participants/);
});

test("sign-up cannot be mistaken for SMS consent or partner invitation", () => {
  assert.doesNotMatch(js, /sendSMS|sendSms|sms_outbox|partner_shares|\.from\(["']couple_members/);
  assert.match(html, /Partner linking is not enabled in this pilot yet/);
  assert.match(js, /\.from\("participants"\)/);
  assert.match(js, /eligibleBirthDate\(birth\)/);
});

test("public configuration is disabled by default and never exposes a service key", async () => {
  const handler = (await import("../api/public-config.mjs")).default;
  const vars = ["SUPABASE_URL","SUPABASE_PUBLISHABLE_KEY","ANTHOS_ACCOUNT_PILOT_ENABLED"];
  const saved = Object.fromEntries(vars.map(k=>[k,process.env[k]]));
  try {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_notsecret";
    delete process.env.ANTHOS_ACCOUNT_PILOT_ENABLED;
    const res = await handler(new Request("http://localhost/api/public-config"));
    const body = await res.json();
    assert.equal(body.enabled,false);
    assert.equal(body.publishableKey,undefined);
    assert.equal(res.headers.get("cache-control"),"no-store");
    const post = await handler(new Request("http://localhost/api/public-config",{method:"POST"}));
    assert.equal(post.status,405);
    process.env.ANTHOS_ACCOUNT_PILOT_ENABLED = "true";
    const enabled = await (await handler(new Request("http://localhost/api/public-config"))).json();
    assert.equal(enabled.enabled,true);
    assert.equal(enabled.publishableKey,"sb_publishable_notsecret");
  } finally {
    for (const k of vars) {
      if(saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
});
