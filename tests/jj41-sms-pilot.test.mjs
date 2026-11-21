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
  process.env.THREEFOLD_10DLC_APPROVED="false";
  assert.equal(pilotSmsReady(),false);
  let r=await smsWebhook.fetch(new Request("https://anthos.love/api/jj41-sms-webhook",
   {method:"POST",body:"{}"}));
  assert.equal(r.status,503);
  process.env.THREEFOLD_10DLC_APPROVED="true";
  delete process.env.TELNYX_PUBLIC_KEY;
  assert.equal(pilotSmsReady(),false);
  process.env.TELNYX_PUBLIC_KEY="A".repeat(44);
  process.env.VERCEL_ENV="preview";
  assert.equal(pilotSmsReady(),false);
  assert.equal((await smsWebhook.fetch(new Request("https://anthos.love/api/jj41-sms-webhook",
   {method:"GET"}))).status,405);
 }finally{restore()}
});
test("SMS setup validates room and participant links without sending either spouse an unsolicited text",async()=>{
 makeEnv();
 const {publicKey}=generateKeyPairSync("ed25519");
 process.env.TELNYX_PUBLIC_KEY=publicKey.export({type:"spki",format:"der"}).subarray(-32).toString("base64");
 const oldFetch=globalThis.fetch;
 const roomId=randomUUID(),jToken="J".repeat(43),lToken="L".repeat(43);
 const links={jack:"https://anthos.love/pilot-v4/?invite="+jToken,
  jill:"https://anthos.love/pilot-v4/?invite="+lToken};
 let sent=0,writes=0;
 globalThis.fetch=async (url,init={})=>{
  const u=new URL(String(url));
  assert.equal(u.hostname,"kstluxwgrrgdbjyloscb.supabase.co");
  if(u.pathname.includes("anthos_jj4_rooms"))
   return new Response(JSON.stringify([{id:roomId,stage:"needs_scene",expires_at:"2099-01-01T00:00:00Z",
    episode:{authored41:{version:"4.1.0"},pilotMode:"shared"}}]),{status:200});
  if(u.pathname.includes("anthos_jj4_participants")){
   const role=u.searchParams.get("role")?.slice(3);
   assert.equal(u.searchParams.get("token_hash")?.slice(3),
    createHash("sha256").update(role==="jack"?jToken:lToken).digest("hex"));
   return new Response(JSON.stringify([{id:randomUUID()}]),{status:200});
  }
  if(u.pathname.includes("anthos_jj41_sms_participants")){writes++;return new Response(JSON.stringify([{id:randomUUID()}]),{status:201})}
  if(u.hostname.includes("telnyx"))sent++;
  throw Error("Unexpected request path "+u.pathname);
 };
 try{
  const result=await registerPilotSms({origin:"https://anthos.love",roomId,
   husbandPhone:"+12125550124",wifePhone:"+12125550125",invitations:links,adultsConfirmed:true});
  assert.equal(result.registered,true);
  assert.equal(writes,1);
  assert.equal(sent,0,"No SMS sent before each adult sends JOIN");
  await assert.rejects(registerPilotSms({origin:"https://anthos.love",roomId,
   husbandPhone:"+12125550124",wifePhone:"+12125550124",invitations:links,adultsConfirmed:true}),/distinct/);
 }finally{globalThis.fetch=oldFetch;restore()}
});
