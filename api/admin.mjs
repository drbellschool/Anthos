// Threefold private admin API — server only, never import this from client JavaScript.
// Vercel Node.js Function (.mjs); no persistent customer state until Supabase is provisioned.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const COOKIE = "threefold_admin_session";
const TEST_SMS_TEXT = "Threefold test: The adventure awaits! This is a single administrator-requested connectivity check, not an ongoing subscription. Reply STOP to opt out.";
const US_MOBILE_FORMAT = /^\+1[2-9]\d{2}[2-9]\d{6}$/;
function testSMSSettings() {
  const recipient = env("THREEFOLD_TEST_SMS_TO");
  const sender = env("TELNYX_FROM_NUMBER");
  return {
    recipientReady: US_MOBILE_FORMAT.test(recipient) && recipient !== sender,
    recipientLast4: (recipient.match(/\d{4}$/) || [])[0] || null,
    carrierApproved: env("THREEFOLD_10DLC_APPROVED") === "true",
    enabled: env("THREEFOLD_TEST_SMS_ENABLED") === "true",
    messagePreview: TEST_SMS_TEXT
  };
}
const SESSION_TTL = 60 * 60 * 2;
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer"
};
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
function env(name) { return process.env[name]?.trim() || ""; }
const configured = () =>
  (process.env.THREEFOLD_ADMIN_PASSWORD || "").length >= 10 && env("THREEFOLD_SESSION_SECRET").length >= 32;

function parseCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
}
function hmac(value) {
  return createHmac("sha256", env("THREEFOLD_SESSION_SECRET")).update(value).digest("base64url");
}
function isAdmin(request) {
  if (!configured()) return false;
  const cookie = parseCookie(request, COOKIE);
  const parts = cookie.split(".");
  if (parts.length !== 3 || !/^\d{10,14}$/.test(parts[0]) ||
      !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return false;
  const expiry = Number(parts[0]);
  if (!Number.isSafeInteger(expiry) || expiry < Date.now() || expiry > Date.now() + SESSION_TTL*1000) return false;
  const message = parts[0] + "." + parts[1];
  const expected = Buffer.from(hmac(message), "utf8");
  const received = Buffer.from(parts[2], "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
function correctPassword(input) {
  if (!configured() || typeof input !== "string" || input.length > 256) return false;
  const salt = "threefold-admin-password-v1";
  const a = scryptSync(input, salt, 32);
  const b = scryptSync(process.env.THREEFOLD_ADMIN_PASSWORD || "", salt, 32);
  return timingSafeEqual(a, b);
}
function validOrigin(request) {
  const origin = request.headers.get("origin");
  // No cross-site or origin-less POSTs from the public internet.
  return !!origin && origin === new URL(request.url).origin &&
    request.headers.get("x-threefold-admin") === "1";
}
async function bodyJSON(request) {
  if (!(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json")) throw new Error("JSON only");
  const size = Number(request.headers.get("content-length") || "0");
  if (size > 4096) throw new Error("Request too large");
  const text = await request.text();
  if (text.length > 4096) throw new Error("Request too large");
  const data = JSON.parse(text);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid data");
  return data;
}
function sessionCookie(expires) {
  const token = String(expires) + "." + randomBytes(16).toString("hex");
  return COOKIE + "=" + token + "." + hmac(token) + "; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=" + SESSION_TTL;
}
function clearedCookie() {
  return COOKIE + "=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}
function providerStatus() {
  return {
    openai: { configured: !!env("OPENAI_API_KEY"), model: env("OPENAI_MODEL") || "gpt-4.1-mini" },
    telnyx: { configured: !!env("TELNYX_API_KEY"), senderConfigured: /^\+[1-9]\d{7,14}$/.test(env("TELNYX_FROM_NUMBER")),
      senderLast4: (env("TELNYX_FROM_NUMBER").match(/\d{4}$/)||[])[0] || null },
    database: { configured: false, stage: "Awaiting Supabase recovery or replacement" },
    messaging: { enabled: false, reason: "Outbound customer SMS is intentionally disabled until consent records and a durable SQL outbox are live." },
    testSMS: testSMSSettings()
  };
}
async function readError(response) {
  // Do not forward raw third-party HTTP errors or accidentally reflect credentials.
  if (response.status === 401 || response.status === 403) return "Provider rejected the API credentials or permissions.";
  if (response.status === 429) return "Provider rate limit or billing quota reached.";
  if (response.status >= 500) return "Provider temporarily unavailable.";
  return "Provider returned HTTP " + response.status + ".";
}
const PERSONA_INSTRUCTIONS = Object.freeze({
  sophia:"You are Sophia, Threefold's feminine, warm, curious relationship-adventure companion for consenting adults. Speak like a grounded, romantic guide—not a therapist. You lead Love Whispers and fictional Deep Dive narration/coaching. Follow the story's authored goals: own behavior, choose jointly, hold respectful boundaries, repair harm. Do not award mastery, invent extra chapters, extend a fictional story off course, access a spouse's private texts, or pressure forgiveness or sex. If a scenario drifts away from its objective, give one brief acknowledgement, offer a separate handoff to Paraclete for logistics, and return to the current story objective. Under 600 characters and at most one question. Respond only to the FICTIONAL rehearsal prompt.",
  paraclete:"You are Paraclete, Threefold's thoughtful and practical romantic-adventure planner. Turn fictional ideas into actionable, fun plans with budget, timeframe and childcare responsibilities. Be organized, concise and pleasantly imaginative, not clinical. Ask for unknown details rather than invent availability, prices or reservations. Never claim to book, purchase, contact a babysitter, send an SMS, or reveal a spouse's private Whisper. Mark actions proposed, not completed. Under 600 characters. Respond only to the FICTIONAL rehearsal prompt.",
  threefold:"You are Threefold, a private relationship-adventure workflow director in a FICTIONAL admin rehearsal. Route emotional reflection, Love Whispers and eight-milestone story coaching to Sophia; practical dates, budgets and logistics to Paraclete. YOU—not either AI persona—enforce separate participant consent, privacy boundaries, versioned eight-chapter narrative state, objective tracking, finite option grades and earned progression. Do not infer mastery from unrestricted text, invent completed tasks, claim access to records, or reveal partner-private content. For off-topic Deep Dive messages, allow one short relevant clarification or handoff, then resume the SAME milestone. Safety concerns pause normal progression. Under 650 characters. Respond only to the FICTIONAL rehearsal prompt with an exact workflow suggestion, not a claim that the system already acted."
});
async function openAIRequest(prompt, tryPrompt = false, persona = null) {
  if (!env("OPENAI_API_KEY")) return { ok:false, message:"OpenAI API key is not configured." };
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 14000);
  try {
    const instructions = persona && Object.hasOwn(PERSONA_INSTRUCTIONS,persona)
      ? PERSONA_INSTRUCTIONS[persona]
      : tryPrompt
      ? "You are Threefold, an adult relationship adventure companion. Write a warm, concise (under 400 characters), practical response that promotes curiosity, kindness, shared novelty, and individual autonomy. Do not act as a therapist, do not demand intimacy or disclosure, and do not claim access to either partner's private messages. No more than one question."
      : "Reply with only the word READY.";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method:"POST", signal:controller.signal,
      headers:{Authorization:"Bearer " + env("OPENAI_API_KEY"),"Content-Type":"application/json"},
      body:JSON.stringify({model: env("OPENAI_MODEL") || "gpt-4.1-mini",
        instructions, input: tryPrompt ? prompt : "Service health check.", max_output_tokens:persona?220:(tryPrompt?180:32),store:false})
    });
    if (!response.ok) return {ok:false,message:await readError(response),status:response.status};
    const result=await response.json();
    const output=(result.output||[]).filter(x=>x.type==="message").flatMap(x=>(x.content||[])
      .filter(y=>y.type==="output_text").map(y=>y.text)).join(" ").trim();
    return {ok:true,message:"OpenAI responded successfully.",model:result.model||env("OPENAI_MODEL")||"gpt-4.1-mini",
      output:output.slice(0,750)||"(No text response)",usage:result.usage?{
        inputTokens:result.usage.input_tokens||0,outputTokens:result.usage.output_tokens||0}:null};
  } catch(err) {
    return {ok:false,message:err?.name==="AbortError"?"OpenAI timed out.":"Could not connect to OpenAI."};
  } finally {clearTimeout(timeout);}
}
async function telnyxCheck() {
  if (!env("TELNYX_API_KEY")) return {ok:false,message:"Telnyx API key is not configured."};
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),14000);
  try {
    const response=await fetch("https://api.telnyx.com/v2/messaging_profiles?page[size]=10",{
      method:"GET",signal:controller.signal,headers:{Authorization:"Bearer "+env("TELNYX_API_KEY"),Accept:"application/json"}});
    if(!response.ok) return {ok:false,message:await readError(response),status:response.status};
    const data=await response.json();
    const profiles=Array.isArray(data.data)?data.data:[];
    return {ok:true,message:"Telnyx API credentials accepted. No SMS was sent.",
      profileCountReturned:profiles.length,
      profiles:profiles.slice(0,10).map(p=>({name:String(p.name||"Unnamed profile").slice(0,75),
        id:String(p.id||"").slice(0,80)})),
      note:"This checks API access only. It does not verify 10DLC approval, opt-in compliance or messaging delivery."};
  }catch(err){
    return {ok:false,message:err?.name==="AbortError"?"Telnyx timed out.":"Could not connect to Telnyx."};
  }finally{clearTimeout(timeout);}
}
// Fixed, allowlisted, human-triggered Telnyx test; NEVER a general SMS send API.
// A successful Telnyx API response means accepted/queued, not handset delivered.
async function sendOneTestSMS() {
  const settings = testSMSSettings();
  if (!settings.enabled || !settings.carrierApproved || !settings.recipientReady)
    return {ok:false,message:"SMS test remains locked: enable the test, verify approved 10DLC, and allowlist your own phone number in Vercel."};
  if (!env("TELNYX_API_KEY") || !US_MOBILE_FORMAT.test(env("TELNYX_FROM_NUMBER")))
    return {ok:false,message:"Telnyx sending configuration is incomplete."};
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),14000);
  try {
    const response = await fetch("https://api.telnyx.com/v2/messages",{
      method:"POST",signal:controller.signal,
      headers:{Authorization:"Bearer "+env("TELNYX_API_KEY"),
        "Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({from:env("TELNYX_FROM_NUMBER"),
        to:env("THREEFOLD_TEST_SMS_TO"),text:TEST_SMS_TEXT})
    });
    if(!response.ok)return {ok:false,message:await readError(response),status:response.status,
      note:"No automatic retry. Inspect Telnyx before sending another test."};
    const result=await response.json();
    const messageId=result?.data?.id;
    return {ok:true,message:"Telnyx accepted the one-message test request. Delivery has NOT been confirmed.",
      providerMessageId:typeof messageId==="string"?messageId.slice(0,100):null,
      recipientLast4:settings.recipientLast4,
      note:"Check your phone and the Telnyx messaging logs for delivery. Do not press Send again until the result is known."};
  }catch(err){
    return {ok:false,message:err?.name==="AbortError"
      ?"Telnyx timed out: the send outcome is uncertain. Check Telnyx activity before retrying."
      :"Could not confirm the send outcome. Check Telnyx activity before retrying.",
      outcomeUncertain:true};
  }finally{clearTimeout(timeout);}
}

export default {
  async fetch(request) {
    if (!["GET","POST"].includes(request.method)) return json({error:"Method not allowed."},405,{Allow:"GET, POST"});
    if (request.method==="GET" && new URL(request.url).searchParams.get("view")==="development") {
      if (!isAdmin(request)) return json({error:"Administrator sign-in required."},401);
      return json(await getDevelopmentStatus());
    }
    if (request.method==="GET") {
      // Development status is read-only; the admin session remains mandatory.
      return json({authenticated:isAdmin(request),adminConfigured:configured(), 
        ...(isAdmin(request)?{services:providerStatus()}:{})});
    }
    if (!validOrigin(request)) return json({error:"Origin verification failed."},403);
    let body;
    try{body=await bodyJSON(request)}catch{return json({error:"Invalid JSON request."},400);}
    const action=String(body.action||"");
    if (action==="login") {
      if(!configured()) return json({error:"Administrator login has not been configured in Vercel."},503);
      const valid=correctPassword(body.password);
      if(!valid) return json({error:"Incorrect administrator password."},401);
      return json({ok:true,authenticated:true},200,{"Set-Cookie":sessionCookie(Date.now()+SESSION_TTL*1000)});
    }
    if(!isAdmin(request))return json({error:"Administrator sign-in required."},401);
    if(action==="logout")return json({ok:true},200,{"Set-Cookie":clearedCookie()});
    if(action==="status")return json({ok:true,services:providerStatus()});
    if(action==="check-openai")return json(await openAIRequest(""));
    if(action==="try-openai"){
      const prompt=body.prompt;
      if(typeof prompt!=="string"||prompt.trim().length<3||prompt.length>500)return json({error:"Use a sample prompt between 3 and 500 characters."},400);
      return json(await openAIRequest(prompt.trim(),true));
    }
    if(action==="check-telnyx")return json(await telnyxCheck());
    if(action==="rehearse-persona"){
      const {persona,prompt}=body;
      if(typeof persona!=="string"||!Object.hasOwn(PERSONA_INSTRUCTIONS,persona))
        return json({error:"Unsupported companion."},400);
      if(typeof prompt!=="string"||prompt.trim().length<3||prompt.length>600)
        return json({error:"Use a fictional prompt between 3 and 600 characters."},400);
      const result=await openAIRequest(prompt.trim(),true,persona);
      return json({...result,persona,disclaimer:"Fictional rehearsal only. No objective scores, couple records, or messages have been changed."});
    }
    if(action==="send-test-sms"){
      // Never accept a caller-supplied number or text. A malicious caller cannot turn
      // this operation into a bulk SMS route, even with a stolen admin session.
      if(body.confirmation!=="SEND ONE TEST"||body.ownPhone!==true||
        body.expressConsent!==true||body.carrierStatusVerified!==true)
        return json({error:"Explicit ownership, consent and carrier-approval confirmations are required."},400);
      return json(await sendOneTestSMS());
    }
    return json({error:"Unknown admin action."},400);
  }
};
