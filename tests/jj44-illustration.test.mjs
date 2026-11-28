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
   const payload=JSON.parse(options.body);
   assert.deepEqual(payload.images,[image,nextImage].map(x=>({image_url:"data:image/jpeg;base64,"+x.toString("base64")})));
   assert.match(payload.prompt,/Reference images establish/);
   assert.equal(options.headers["Content-Type"],"application/json");
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

test("authenticated production room setup may provision only the fixed private image bucket",async()=>{
 const env={SUPABASE_SECRET_KEY:"synthetic",VERCEL_ENV:"production"};
 let calls=0;
 await ensureArtBucket44({env,allowCreate:true,fetchImpl:async(url,o)=>{
  calls++;if(calls===1)return json({},404);
  if(calls===2){assert.equal(o.method,"POST");assert.match(url,/storage\/v1\/bucket$/);assert.deepEqual(JSON.parse(o.body),{id:"anthos-jj44-art",name:"anthos-jj44-art",public:false,file_size_limit:3145728,allowed_mime_types:["image/jpeg"]});return json({})}
  return json({public:false});
 }});
 assert.equal(calls,3);
});

 test("production legacy HTTP 400 missing bucket is verified through list and provisioned privately",async()=>{
 const env={SUPABASE_SECRET_KEY:"synthetic",VERCEL_ENV:"production"};
 let calls=0;
 await ensureArtBucket44({env,allowCreate:true,fetchImpl:async(url,o)=>{
  calls++;if(calls===1)return json({statusCode:"404",message:"Bucket not found"},400);
  if(calls===2){assert.match(url,/storage\/v1\/bucket$/);assert.equal(o.method,undefined);return json([{id:"unrelated"}])}
  if(calls===3){assert.equal(o.method,"POST");assert.equal(JSON.parse(o.body).public,false);return json({})}
  return json({public:false});
 }});assert.equal(calls,4);
 });
 test("400 does not create a bucket if the list fails or already contains it",async()=>{
 const env={SUPABASE_SECRET_KEY:"synthetic",VERCEL_ENV:"production"};
 for(const result of [()=>json({},403),()=>json([{id:"anthos-jj44-art",public:true}])]){
 let calls=0;await assert.rejects(ensureArtBucket44({env,allowCreate:true,fetchImpl:async(url,o)=>{calls++;assert.notEqual(o.method,"POST");return calls===1?json({},400):result()}}),/not configured/);assert.equal(calls,2);
 }
 });

test("previously failed artwork gets a fresh bounded retry budget without touching published artwork",()=>{
 const digest=digestArt44("saved story"),t=Date.now();
 const old={state:"failed",digest,lease,at:new Date(t-10000).toISOString(),attempts:3};
 assert.equal(publicArt44(old,digest,t),"retry");
 assert.equal(artClaim44(old,digest,lease,t).attempts,1);
 assert.equal(artClaim44({...old,state:"ready"},digest,lease,t),null);
 assert.equal(artClaim44({...old,state:"generating"},digest,lease,t),null);
});
test("reference image errors are classified without exposing provider response bodies",async()=>{
 await assert.rejects(generateIllustration44({page,references:[image],apiKey:"synthetic",fetchImpl:async()=>json({error:{message:"secret"}},429)}),e=>e.artCode==="IMAGE_HTTP_429"&&!e.message.includes("secret"));
 await assert.rejects(generateIllustration44({page,references:[image],apiKey:"synthetic",fetchImpl:async()=>{throw Object.assign(new Error("private"),{name:"TimeoutError"})}}),e=>e.artCode==="IMAGE_TIMEOUT"&&!e.message.includes("private"));
});

test("provider moderation blocks log only public categories, stage, and request ID",async()=>{
 const logs=[],old=console.warn;console.warn=(s)=>logs.push(s);
 try{
  let calls=0;
  await assert.rejects(generateIllustration44({page,apiKey:"synthetic",fetchImpl:async()=>{
   calls++;return new Response(JSON.stringify({error:{code:"moderation_blocked",message:"private prompt must not be logged",moderation_details:{moderation_stage:"input",categories:["sexual","private words"]}}}),{status:400,headers:{"x-request-id":"req_synthetic"}});
  }}),e=>e.artCode==="IMAGE_MODERATION_BLOCKED");
  assert.equal(calls,1);
  const detail=JSON.parse(logs[0].split("[jj44-art-detail] ")[1]);
  assert.deepEqual(detail,{stage:"IMAGE",code:"MODERATION_BLOCKED",http:400,moderationStage:"input",categories:["sexual"],requestId:"req_synthetic"});
  assert.doesNotMatch(logs.join(" "),/private prompt|private words/);
 }finally{console.warn=old}
});
test("review logs explicit safety versus continuity categories without logging free-form issues",async()=>{
 const logs=[],old=console.warn;console.warn=s=>logs.push(s);
 try{
  await assert.rejects(generateIllustration44({page,apiKey:"synthetic",fetchImpl:async(url,options)=>{
   if(url.endsWith("/generations"))return json({data:[{b64_json:image.toString("base64")}]});
   const schema=JSON.parse(options.body).text.format.schema;
   assert.ok(schema.required.includes("categories"));
   return json({output:[{content:[{type:"output_text",text:JSON.stringify({pass:false,issues:["private quote"],categories:["SEXUAL_CONTENT","STORY_CONTRADICTION","private data"]})}]}]});
  }}),e=>e.artCode==="REVIEW_REJECTED");
  assert.equal(logs.length,2);
  for(const line of logs){
   const detail=JSON.parse(line.split("[jj44-art-detail] ")[1]);
   assert.equal(detail.code,"CANDIDATE_REJECTED");
   assert.deepEqual(detail.categories,["SEXUAL_CONTENT","STORY_CONTRADICTION"]);
  }
  assert.doesNotMatch(logs.join(" "),/private quote|private data/);
 }finally{console.warn=old}
});

test("illustrator and reviewer distinguish non-explicit romantic affection from prohibited depictions",async()=>{
 const romantic={story:"Jack and Jill put on pajamas and cuddled while discussing their sex life.",events:["They talked about intimacy."],artBrief:"Warm portrait of the married couple cuddling on the couch."};
 const result=await generateIllustration44({page:romantic,apiKey:"synthetic",fetchImpl:async(url,options)=>{
  const payload=JSON.parse(options.body);
  if(url.endsWith("/generations")){
   assert.match(payload.prompt,/ordinary kissing and tasteful non-sexualized sleepwear are welcome/);
   assert.match(payload.prompt,/Do not depict nudity, sexual activity/);
   return json({data:[{b64_json:image.toString("base64")}]});
  }
  assert.match(payload.instructions,/do not flag them solely because the written story discusses sex/);
  assert.match(payload.instructions,/Do not approve explicit imagery or bypass provider safeguards/);
  return json({output:[{content:[{type:"output_text",text:JSON.stringify({pass:true,issues:[],categories:[]})}]}]});
 }});
 assert.deepEqual(result,image);
});
