import test from "node:test";
import assert from "node:assert/strict";
import {artClaim44,publicArt44,digestArt44,artPath44,generateIllustration44,ensureArtBucket44,saveArt44,readArt44,ART_LEASE_MS,ART_MAX_ATTEMPTS} from "../api/jj44-illustration.mjs";
import {storySupabaseBase,PRODUCTION_URL} from "../api/jj4-database-config.mjs";
const page={story:"Jack installed the new microwave on Friday. Jill brought popcorn.",events:["The new microwave is installed."],artBrief:"Jack and Jill share popcorn in the kitchen.",privateAdvice:"DO NOT SEND PRIVATE WORDS"};
const image=Buffer.from([255,216,42,255,217]);
const nextImage=Buffer.from([255,216,43,255,217]);
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json"}});
const review=(pass,issues=[])=>json({output:[{content:[{type:"output_text",text:JSON.stringify({pass,issues})}]}]});
const id="99000000-0000-4000-8000-000000000001",lease="99000000-0000-4000-8000-000000000002";
test("artwork identity is immutable, lease prevents duplicate requests, retries are bounded",()=>{
 const digest=digestArt44(JSON.stringify(page)),t=Date.now();
 const first=artClaim44(null,digest,lease,t);
 assert.equal(publicArt44(first,digest,t),"generating");
 assert.equal(artClaim44(first,digest,lease,t+1000),null);
 assert.equal(publicArt44(first,digest,t+ART_LEASE_MS),"retry");
 const second=artClaim44(first,digest,lease,t+ART_LEASE_MS);
 assert.equal(second.attempts,2);
 const last={...second,state:"failed",attempts:ART_MAX_ATTEMPTS};
 assert.equal(publicArt44(last,digest,t),"unavailable");
 assert.equal(artClaim44(last,digest,lease,t),null);
 assert.equal(artClaim44({...first,state:"ready"},digest,lease,t),null);
 assert.equal(publicArt44({...first,state:"ready"},digestArt44("different scene"),t),"missing");
 assert.match(artPath44(id,0,digest,lease),/\.jpg$/);
 assert.throws(()=>artPath44("../bad",0,digest,lease));
 assert.throws(()=>artPath44(id,6,digest,lease));
});
test("generation passes actual JPEG pixels to reviewer and retries a rejected caption",async()=>{
 let calls=0,generated=0;
 const bytes=await generateIllustration44({page,apiKey:"synthetic",fetchImpl:async(url,options)=>{
  calls++;
  if(url.endsWith("/generations")){
   const body=JSON.parse(options.body);generated++;
   assert.equal(body.model,"gpt-image-2");assert.equal(body.output_format,"jpeg");
   assert.doesNotMatch(body.prompt,/DO NOT SEND PRIVATE WORDS/);
   assert.match(body.prompt,/No letters, numbers, captions/);
   if(generated===2)assert.match(body.prompt,/Remove the written caption/);
   return json({data:[{b64_json:(generated===1?image:nextImage).toString("base64")}]});
  }
  const body=JSON.parse(options.body);
  assert.equal(body.text.format.name,"jj44_art_review");
  assert.equal(body.input[0].content.at(-1).image_url,"data:image/jpeg;base64,"+(generated===1?image:nextImage).toString("base64"));
  return generated===1?review(false,["Remove the written caption"]):review(true);
 }});
 assert.deepEqual(bytes,nextImage);assert.equal(calls,4);
});
test("later pages submit both approved references to artist and visual reviewer",async()=>{
 let calls=0;
 const output=await generateIllustration44({page,references:[image,nextImage],apiKey:"synthetic",fetchImpl:async(url,options)=>{
  calls++;
  if(url.endsWith("/edits")){
   assert.equal(options.body.getAll("image[]").length,2);
   assert.match(options.body.get("prompt"),/Reference images establish/);
   assert.equal(options.headers["Content-Type"],undefined);
   return json({data:[{b64_json:image.toString("base64")}]});
  }
  const c=JSON.parse(options.body).input[0].content;
  assert.equal(c.filter(x=>x.type==="input_image").length,3);
  return review(true);
 }});
 assert.deepEqual(output,image);assert.equal(calls,2);
});
test("two visual rejections or malformed image cannot produce publishable artwork",async()=>{
 let calls=0;
 await assert.rejects(generateIllustration44({page,apiKey:"synthetic",fetchImpl:async(url)=>{calls++;return url.endsWith("/generations")?json({data:[{b64_json:image.toString("base64")}]}):review(false,["Wrong appliance"])} }),/did not pass/);
 assert.equal(calls,4);
 await assert.rejects(generateIllustration44({page,apiKey:"synthetic",fetchImpl:async()=>json({data:[{b64_json:Buffer.from("not JPEG").toString("base64")}]})}),/bounded JPEG/);
});
const env={SUPABASE_URL:"https://test-isolated-project.supabase.co",SUPABASE_SECRET_KEY:"sb_secret_synthetic",ANTHOS_QA_STRICT_ISOLATION:"1",VERCEL_ENV:"preview"};
test("private bucket only; isolated QA may provision it, production cannot auto-create",async()=>{
 let calls=0;
 await ensureArtBucket44({env,fetchImpl:async(url,o)=>{calls++;if(calls===1)return json({},404);if(calls===2){assert.equal(o.method,"POST");assert.equal(JSON.parse(o.body).public,false);return json({})}return json({public:false})}});
 assert.equal(calls,3);
 await assert.rejects(ensureArtBucket44({env,fetchImpl:async()=>json({public:true})}),/must be private/);
 let prodCalls=0;
 await assert.rejects(ensureArtBucket44({env:{SUPABASE_SECRET_KEY:"synthetic",VERCEL_ENV:"production"},fetchImpl:async()=>{prodCalls++;return json({},404)}}),/not configured/);
 assert.equal(prodCalls,1);
});
test("image storage is private, non-overwriting and uses authenticated read",async()=>{
 const path=artPath44(id,0,digestArt44(JSON.stringify(page)),lease);
 await saveArt44(path,image,{env,fetchImpl:async(url,o)=>{assert.match(url,/storage\/v1\/object\/anthos-jj44-art\//);assert.equal(o.headers["x-upsert"],"false");assert.equal(o.headers.apikey,"sb_secret_synthetic");assert.equal(o.headers.Authorization,undefined);assert.deepEqual(o.body,image);return json({})}});
 const bytes=await readArt44(path,{env,fetchImpl:async(url,o)=>{assert.match(url,/object\/authenticated\/anthos-jj44-art\//);return new Response(image)}});
 assert.deepEqual(bytes,image);
});
test("4.4 preview cannot fall back to production database",()=>{
 const config={VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"deep-dive-4.4-storybook"};
 assert.throws(()=>storySupabaseBase(config),/Quality Lab/);
 assert.throws(()=>storySupabaseBase({...config,SUPABASE_URL:PRODUCTION_URL,ANTHOS_QA_STRICT_ISOLATION:"1"}),/Quality Lab/);
 assert.equal(storySupabaseBase({...config,...env}),env.SUPABASE_URL+"/rest/v1/");
});
