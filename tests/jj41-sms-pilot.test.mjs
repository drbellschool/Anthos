import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign,randomUUID} from "node:crypto";
import {pilotSmsReady,protectSmsToken,unprotectSmsToken,verifyTelnyxWebhook,
 registerPilotSms} from "../api/jj41-sms-core.mjs";
import smsWebhook from "../api/jj41-sms-webhook.mjs";

const prior={};
const KEYS=["THREEFOLD_SESSION_SECRET","TELNYX_PUBLIC_KEY","TELNYX_PILOT_MESSAGING_ENABLED",
 "THREEFOLD_10DLC_APPROVED","TELNYX_FROM_NUMBER","TELNYX_API_KEY","VERCEL_ENV",
 "SUPABASE_SECRET_KEY"];
const makeEnv=()=>{
 for(const k of KEYS)prior[k]=process.env[k];
 process.env.THREEFOLD_SESSION_SECRET="test-only-strong-session-secret-that-is-not-a-production-key";
 process.env.TELNYX_FROM_NUMBER="+19036090465";
 process.env.TELNYX_API_KEY="test-only-api-key";
 process.env.TELNYX_PILOT_MESSAGING_ENABLED="true";
 process.env.THREEFOLD_10DLC_APPROVED="true";
 process.env.VERCEL_ENV="production";
 process.env.SUPABASE_SECRET_KEY="synthetic-test-key";
};
const restore=()=>{for(const k of KEYS){
 if(prior[k]===undefined)delete process.env[k];else process.env[k]=prior[k];
}};
test("Ed25519 Telnyx signed webhooks validate body, signature, timestamp, and replay age",()=>{
 makeEnv();
 const {publicKey,privateKey}=generateKeyPairSync("ed25519");
 process.env.TELNYX_PUBLIC_KEY=publicKey.export({type:"spki",format:"der"}).subarray(-32).toString("base64");
 const raw=JSON.stringify({data:{id:randomUUID(),event_type:"message.received",payload:{text:"JOIN"}}});
 const now=Date.now(),timestamp=String(Math.floor(now/1000));
 const signature=sign(null,Buffer.from(timestamp+"|"+raw),privateKey).toString("base64");
 const headers=new Headers({"telnyx-signature-ed25519":signature,"telnyx-timestamp":timestamp});
 try{
  assert.equal(verifyTelnyxWebhook({body:raw,headers,now}),true);
  assert.equal(verifyTelnyxWebhook({body:raw+" ",headers,now}),false);
  assert.equal(verifyTelnyxWebhook({body:raw,headers,now:now+301000}),false);
  assert.equal(verifyTelnyxWebhook({body:raw,headers:new Headers(),now}),false);
 }finally{restore()}
});
test("private invite tokens are authenticated encrypted at rest",()=>{
 makeEnv();
 try{
  const token="A".repeat(43),secret=protectSmsToken(token);
  assert.ok(!secret.includes(token));
  assert.equal(unprotectSmsToken(secret),token);
  const parts=secret.split(".");
  parts[2]=parts[2].slice(0,-3)+"AAA";
  assert.throws(()=>unprotectSmsToken(parts.join(".")));
  assert.throws(()=>protectSmsToken("invalid"));
 }finally{restore()}
});
test("a missing carrier approval, public key, or production setting fails closed",async()=>{
 makeEnv();
 try{
  process.env.TELNYX_PILOT_MESSAGING_ENABLED="false";
  assert.equal(pilotSmsReady(),false);
  let r=await smsWebhook.fetch(new Request("https://anthos.love/api/jj41-sms-webhook",
   {method:"POST",body:"{}"}));
  assert.equal(r.status,503);
  process.env.TELNYX_PILOT_MESSAGING_ENABLED="true";
  delete process.env.TELNYX_PUBLIC_KEY;
  assert.equal(pilotSmsReady(),false);
  process.env.TELNYX_PUBLIC_KEY="A".repeat(44);
  process.env.VERCEL_ENV="preview";
  assert.equal(pilotSmsReady(),false);
  assert.equal((await smsWebhook.fetch(new Request("https://anthos.love/api/jj41-sms-webhook",
   {method:"GET"}))).status,405);
 }finally{restore()}
});
test("SMS setup refuses anyone without verified signup consent; no JOIN or new checkbox",async()=>{
 makeEnv();
 const {publicKey}=generateKeyPairSync("ed25519");
 process.env.TELNYX_PUBLIC_KEY=publicKey.export({type:"spki",format:"der"}).subarray(-32).toString("base64");
 const oldFetch=globalThis.fetch;
 let sent=0,records=0;
 globalThis.fetch=async url=>{
  const u=new URL(String(url));
  if(u.hostname==="api.telnyx.com")sent++;
  if(u.pathname.includes("anthos_customer_directory")){records++;return new Response(JSON.stringify([]),{status:200})}
  throw Error("Unexpected request: "+u.pathname);
 };
 try{
  await assert.rejects(registerPilotSms({origin:"https://anthos.love",roomId:randomUUID(),
   husbandCustomerId:randomUUID(),invitations:{}}),/verified phone numbers|SMS consent/);
  assert.equal(records,1);
  assert.equal(sent,0,"An unverified person must never receive pilot messages.");
 }finally{globalThis.fetch=oldFetch;restore()}
});
