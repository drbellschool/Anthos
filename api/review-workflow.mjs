/* Server-only Anthos editorial review queue. No public access. */
const URL_BASE="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const TARGETS=new Set(["chapter_title","narrative","prompt","option_text","option_impact","option_coach","takeaway","transition","repair_text","ending"]);
const INDEXED=new Set(["option_text","option_impact","option_coach","repair_text","ending"]);
const MAP={chapter_title:"title",narrative:"narrative",prompt:"prompt",takeaway:"takeaway",transition:"transition_text"};
const secret=()=>process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||"";
export const reviewConnected=()=>Boolean(secret());
function reject(message,code=400){throw Object.assign(new Error(message),{code});}
async function query(table,params={},body,method="GET"){
  if(!reviewConnected())reject("Supabase editorial connection has not been configured.",503);
  const url=new URL(URL_BASE+table);
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
  const k=secret(),headers={"apikey":k,"Content-Type":"application/json","Accept":"application/json","Prefer":"return=representation"};
  if(!k.startsWith("sb_secret_"))headers.Authorization="Bearer "+k;
  const timer=AbortSignal.timeout(9000);
  const res=await fetch(url,{method,headers,signal:timer,...(body?{body:JSON.stringify(body)}:{})});
  const data=await res.json().catch(()=>[]);
  if(!res.ok)reject("Supabase returned an editorial storage error.",res.status===409?409:502);
  return data;
}
async function findStory(slug,version){
  const found=await query("deep_dive_stories",{select:"id,slug,story_version,title,status",slug:"eq."+slug,story_version:"eq."+version,limit:"1"});
  if(!found[0])reject("Unknown Deep Dive story/version.",404);
  return found[0];
}
async function authoritativeSource(story,chapter,kind,index,provided){
  if(kind==="repair_text")return provided;
  const rows=await query("deep_dive_chapters",{select:"title,narrative,prompt,choices,takeaway,transition_text,ending_variants",story_id:"eq."+story.id,chapter_number:"eq."+chapter,limit:"1"});
  if(!rows[0])reject("Chapter not found.",404);
  const c=rows[0];
  if(MAP[kind])return c[MAP[kind]];
  if(kind==="ending")return c.ending_variants?.[index];
  return c.choices?.[index]?.[kind==="option_text"?"text":kind==="option_impact"?"impact":"coach"];
}
function valid(d){
  if(typeof d.storyId!=="string"||!/^[a-z0-9-]{3,100}$/.test(d.storyId)||
    !Number.isInteger(d.storyVersion)||d.storyVersion<1||d.storyVersion>1000||
    !Number.isInteger(d.chapter)||d.chapter<1||d.chapter>8||!TARGETS.has(d.targetKind)||
    (INDEXED.has(d.targetKind)?(!Number.isInteger(d.index)||d.index<0||d.index>5):d.index!=null)||
    (d.targetKind==="ending"&&d.chapter!==8)||
    typeof d.sourceText!=="string"||d.sourceText.length<1||d.sourceText.length>5000||
    typeof d.feedback!=="string"||d.feedback.trim().length<3||d.feedback.length>1400)
    reject("Choose a valid story item and enter a comment of 3–1400 characters.");
}
const clean=r=>({id:r.id,chapter:r.chapter_number,targetKind:r.target_kind,index:r.target_index,
  sourceText:r.source_text,feedback:r.feedback,proposedText:r.proposed_text,
  reason:r.proposal_reason,risk:r.risk,status:r.status,createdAt:r.created_at});
export async function reviewList(slug,version){
 if(!reviewConnected())return {ok:false,connected:false,message:"Editorial database connection is not yet configured on Vercel."};
 const s=await findStory(slug,version);
 const rows=await query("deep_dive_editorial_comments",{select:"*",story_id:"eq."+s.id,order:"created_at.desc",limit:"200"});
 return {ok:true,connected:true,comments:rows.map(clean)};
}
export async function reviewSubmit(data){
 valid(data);
 const story=await findStory(data.storyId,data.storyVersion);
 if(!["draft","in_review"].includes(story.status))reject("Published stories need a new review version.",409);
 const source=await authoritativeSource(story,data.chapter,data.targetKind,data.index,data.sourceText);
 if(typeof source!=="string"||!source.trim())reject("The selected item was not found in the chapter.",409);
 const inserted=await query("deep_dive_editorial_comments",{},{
   story_id:story.id,chapter_number:data.chapter,target_kind:data.targetKind,
   target_index:INDEXED.has(data.targetKind)?data.index:null,
   source_text:source,feedback:data.feedback.trim(),status:"pending"},"POST");
 if(!inserted[0]?.id)reject("Comment was not saved.",502);
 // In the ChatGPT-review workflow, save the comment only.
 // No OpenAI API call is made by a comment submission.
 // ChatGPT uses its connected Supabase tools to propose revisions later.
 return {ok:true,saved:true,suggested:false,id:inserted[0].id,
   comment:clean(inserted[0]),message:"Comment saved centrally for ChatGPT editorial review."};
}
export async function reviewResolve(id,status){
 if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id)||!["accepted","dismissed"].includes(status))reject("Invalid review decision.");
 const rows=await query("deep_dive_editorial_comments",{select:"id,status,story_id",id:"eq."+id,limit:"1"});
 if(rows[0]?.status!=="suggested")reject("Review suggestion unavailable or already handled.",409);
 if(status==="accepted"){
   const s=await query("deep_dive_stories",{select:"status",id:"eq."+rows[0].story_id,limit:"1"});
   if(!["draft","in_review"].includes(s[0]?.status))reject("Published content cannot be changed in-place.",409);
 }
 await query("deep_dive_editorial_comments",{id:"eq."+id,status:"eq.suggested"},
   {status,resolved_at:new Date().toISOString(),updated_at:new Date().toISOString()},"PATCH");
 return {ok:true,status,notice:"Original authored story preserved. An accepted suggestion is shown as a reviewer overlay only."};
}

