/* Anthos editor: administrator-only central comments, AI proposals, and review overlays.
 * Queued local drafts are explicitly labeled until the Supabase server key is configured.
 * No AI revision is published or changes lesson grading automatically.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const API="/api/admin",PENDING_KEY="anthos_editor_unsynced_comments_v1";
let auth=false,connected=false,comments=[],context=null,target=null,loadedStory="";
const local=()=>{try{return JSON.parse(localStorage.getItem(PENDING_KEY)||"[]")}catch{return []}};
const setLocal=x=>{try{localStorage.setItem(PENDING_KEY,JSON.stringify(x))}catch{}};
const label=k=>({chapter_title:"Chapter heading",narrative:"Story scene",prompt:"Decision question",
  option_text:"Choice wording",option_impact:"Consequence",option_coach:"Sophia reflection",
  takeaway:"Learning takeaway",transition:"Transition",repair_text:"Repair choice",ending:"Chapter 8 ending"})[k]||k;
const post=async data=>{
 const response=await fetch(API,{method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"Content-Type":"application/json","X-Threefold-Admin":"1"},body:JSON.stringify(data)});
 return {http:response.status,...await response.json().catch(()=>({error:"Unexpected response."}))};
};
async function session(){
 try{
  const r=await fetch(API,{credentials:"same-origin",cache:"no-store"});
  const d=await r.json();auth=!!d.authenticated;connected=auth&&!!d.reviewConnected;
 }catch{auth=false;connected=false}
 refreshStatus();
}
function refreshStatus(){
 const count=comments.filter(c=>["pending","suggested","needs_review"].includes(c.status)).length+local().length;
 $("queueCount").textContent=String(count);
 $("reviewConnection").textContent=connected?"Saved comments and suggestions sync with Anthos.":
   auth?"Database connection pending — comments will stay on this phone until synced.":
   "Sign in with your Anthos admin password to store and auto-revise comments.";
}
function current(){return globalThis.ANTHOS_REVIEW_CONTEXT?.()||null}
function sourceFor(ctx,kind,index){
 const c=ctx.story.chapters[ctx.chapter];
 if(kind==="chapter_title")return c.title;
 if(kind==="narrative")return ctx.chapter===7&&Number.isInteger(ctx.endingIndex)?
   ctx.story.endings?.[ctx.endingIndex]:c.story;
 if(kind==="prompt")return c.prompt;
 if(kind==="takeaway")return c.takeaway;
 if(kind==="transition")return c.transition;
 if(kind==="ending")return ctx.story.endings?.[index];
 if(["option_text","option_impact","option_coach"].includes(kind)){
  return c.options?.[index]?.[kind==="option_text"?"text":kind==="option_impact"?"impact":"coach"];
 }
 if(kind==="repair_text"){
  const row=document.querySelector('[data-comment-target="repair_text"][data-comment-index="'+index+'"]')?.closest(".repair-row");
  return row?.querySelector(".btn")?.textContent;
 }
 return null;
}
function openComment(kind,index,clicked){
 const ctx=current();if(!ctx)return;
 const source=sourceFor(ctx,kind,index);
 if(typeof source!=="string"||!source.trim())return;
 target={storyId:ctx.story.id,storyVersion:ctx.story.storyVersion,
  chapter:ctx.chapter+1,targetKind:kind,index,sourceText:source};
 $("commentHeading").textContent="Comment · "+label(kind)+(index!=null?" "+String.fromCharCode(65+index):"");
 $("commentContext").textContent=source;
 $("commentText").value="";
 $("commentState").textContent="";
 $("commentAuth").hidden=auth;
 $("sendComment").disabled=false;
 $("commentDialog").showModal();
 $("commentText").focus();
}
function overlayKey(c){return [c.chapter,c.targetKind,c.index??"-"].join(":")}
function paint(){
 const ctx=current();if(!ctx)return;
 const edits=comments.filter(c=>c.status==="accepted"&&c.proposedText&&c.chapter===ctx.chapter+1);
 for(const e of edits){
   const index=e.index,kind=e.targetKind,value=e.proposedText;
   if(kind==="chapter_title")$("chapterTitle").textContent=value;
   else if(kind==="narrative"&&ctx.chapter!==7)$("storyText").textContent=value;
   else if(kind==="ending"&&ctx.chapter===7&&index===ctx.endingIndex)$("storyText").textContent=value;
   else if(kind==="prompt")$("question").textContent=value;
   else if(kind==="takeaway")$("takeaway").textContent=value;
   else if(kind==="transition")$("transitionText").textContent=value;
   else if(["option_text","option_impact","option_coach"].includes(kind)){
     if(kind==="option_text"){
       const row=document.querySelector('.choice-row:nth-child('+(index+1)+')');
       const el=row?.querySelector(".choice span");if(el)el.textContent=value;
     }else if(index===ctx.chosen)$(kind==="option_impact"?"impact":"coach").textContent=value;
   }else if(kind==="repair_text"){
     const el=document.querySelector('[data-comment-target="repair_text"][data-comment-index="'+index+'"]')?.closest(".repair-row")?.querySelector(".btn");
     if(el)el.textContent=value;
   }
 }
 const id=current()?.story?.id;
 if(id)document.querySelectorAll("[data-comment-target]").forEach(el=>el.title="Comment on this "+label(el.dataset.commentTarget).toLowerCase());
 // In chapter eight, the visible narrative is an authored branching ending.
 const storyBtn=document.querySelector('[data-comment-target="narrative"]');
 if(storyBtn){
   storyBtn.dataset.commentTarget=ctx.chapter===7?"ending":"narrative";
   if(ctx.chapter===7&&Number.isInteger(ctx.endingIndex))storyBtn.dataset.commentIndex=ctx.endingIndex;
   else delete storyBtn.dataset.commentIndex;
   storyBtn.textContent=ctx.chapter===7?"Comment on ending":"Comment on scene";
 }
}
async function syncLocal(){
 if(!connected)return;
 const pending=local();if(!pending.length)return;
 const remaining=[];
 for(const entry of pending.slice(0,12)){
  try{
   const result=await post({action:"review-submit",...entry});
   if(!result.ok)remaining.push(entry);
  }catch{remaining.push(entry)}
 }
 setLocal([...remaining,...pending.slice(12)]);
}
async function load(){
 const ctx=current();if(!ctx)return;
 const identity=ctx.story.id+"@"+ctx.story.storyVersion;
 if(identity===loadedStory){paint();return;}
 loadedStory=identity;
 comments=[];
 await session();
 if(connected){
   await syncLocal();
   try{
    const result=await fetch(API+"?view=reviews&story="+encodeURIComponent(ctx.story.id)+"&version="+ctx.story.storyVersion,
       {credentials:"same-origin",cache:"no-store"}).then(r=>r.json());
    comments=result.ok?result.comments||[]:[];
   }catch{comments=[]}
 }
 refreshStatus();paint();
}
function itemCard(c,localOnly=false){
 const card=document.createElement("article");card.className="queue-entry";
 const top=document.createElement("small");top.textContent="Chapter "+c.chapter+" · "+label(c.targetKind)+(c.index!=null?" "+String.fromCharCode(65+c.index):"");
 const status=document.createElement("div");status.className="queue-status";status.textContent=localOnly?"Saved on device — not synced":c.status.replaceAll("_"," ");
 const old=document.createElement("div");old.className="orig";old.textContent=c.sourceText;
 const feedback=document.createElement("p");feedback.textContent="Your comment: "+c.feedback;
 card.append(top,status,old,feedback);
 if(c.proposedText){
  const revised=document.createElement("div");revised.className="proposed";revised.textContent="Suggested revision:\n"+c.proposedText;
  card.append(revised);
  if(c.reason){const reason=document.createElement("p");reason.textContent="Why: "+c.reason+(c.risk==="review_required"?" · Requires careful editorial review.":"");card.append(reason)}
 }
 if(c.status==="suggested"&&!localOnly){
  const actions=document.createElement("div");actions.className="queue-actions";
  const yes=document.createElement("button");yes.className="btn primary";yes.textContent="Use in review preview";
  yes.addEventListener("click",()=>decide(c.id,"accepted"));
  const no=document.createElement("button");no.className="btn outline";no.textContent="Dismiss";
  no.addEventListener("click",()=>decide(c.id,"dismissed"));
  actions.append(yes,no);card.append(actions);
 }
 return card;
}
function drawQueue(){
 const box=$("queueItems");box.replaceChildren();
 const entries=[...local().filter(x=>x.storyId===current()?.story.id).map(x=>({row:x,local:true})),
   ...comments.map(x=>({row:x,local:false}))];
 if(!entries.length){const p=document.createElement("p");p.textContent="No comments yet. Tap Comment beside any story item to begin.";box.append(p)}
 else entries.forEach(x=>box.append(itemCard(x.row,x.local)));
 $("queueFeedback").textContent=connected?"Changes are suggestions until you approve them. Nothing is published.":"Offline notes are queued on this phone. Central syncing needs the admin connection.";
}
async function decide(id,decision){
 $("queueFeedback").textContent="Updating editorial review…";
 try{
  const r=await post({action:"review-resolve",id,decision});
  if(!r.ok){$("queueFeedback").textContent=r.error||"Could not update review.";return}
  const c=comments.find(x=>x.id===id);if(c)c.status=decision;
  $("queueFeedback").textContent=decision==="accepted"?"The revised wording is approved for this review preview only.":"Suggestion dismissed.";
  drawQueue();paint();refreshStatus();
 }catch{$("queueFeedback").textContent="Could not reach editorial review server."}
}
async function submit(e){
 e.preventDefault();if(!target)return;
 const feedback=$("commentText").value.trim();
 if(feedback.length<3){$("commentState").textContent="Please describe the issue.";return}
 const payload={...target,feedback};
 $("sendComment").disabled=true;
 $("commentState").textContent="Saving your comment…";
 try{
  if(!auth){$("commentAuth").hidden=false;$("commentState").textContent="Sign in first, then save your comment.";return}
  if(!connected){
    const pending=local();pending.push(payload);setLocal(pending);
    $("commentState").textContent="Saved on this phone only; central syncing is waiting for the Supabase connection.";
  }else{
    const r=await post({action:"review-submit",...payload});
    if(!r.ok){
      $("commentState").textContent=r.error||"Could not save comment. It remains in the text box.";return;
    }
    if(r.comment)comments.unshift(r.comment);
    $("commentState").textContent=r.suggested?"Comment saved and Anthos suggested a revision. Open Review comments to see it.":"Comment saved centrally; an AI suggestion can be generated later.";
  }
  $("commentText").value="";refreshStatus();
  $("commentDialog").close();
  drawQueue();$("queueDialog").showModal();
 }catch{$("commentState").textContent="Network failed. Your comment is still in this box."}
 finally{$("sendComment").disabled=false}
}
async function signIn(){
 const password=$("reviewPassword").value;
 if(!password){$("commentState").textContent="Enter your existing Anthos admin password.";return}
 $("reviewSignIn").disabled=true;
 try{
  const r=await post({action:"login",password});
  $("reviewPassword").value="";
  if(!r.ok){$("commentState").textContent=r.error||"Sign-in failed.";return}
  await session();$("commentAuth").hidden=auth;
  $("commentState").textContent=connected?"Signed in. Your comments will be saved centrally.":"Signed in. Central comment storage still needs its database key configured.";
  loadedStory="";await load();
 }catch{$("commentState").textContent="Could not sign in."}
 finally{$("reviewSignIn").disabled=false}
}
function init(){
 $("reviewForm").addEventListener("submit",submit);
 $("reviewSignIn").addEventListener("click",signIn);
 $("closeComment").addEventListener("click",()=>$("commentDialog").close());
 $("closeQueue").addEventListener("click",()=>$("queueDialog").close());
 $("queueButton").addEventListener("click",async()=>{await load();drawQueue();$("queueDialog").showModal()});
 document.addEventListener("click",e=>{
   const b=e.target.closest("[data-comment-target]");
   if(!b||!current())return;
   const kind=b.dataset.commentTarget;
   let index=b.hasAttribute("data-comment-index")?Number(b.dataset.commentIndex):null;
   if(["option_impact","option_coach"].includes(kind))index=current().chosen;
   openComment(kind,index,b);
 });
 document.addEventListener("anthos-review-render",load);
 session();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
