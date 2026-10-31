/* Anthos mobile Deep Dive reviewer. The shared story engine remains authoritative
 * for decisions, bounded repair, chapter-seven mastery, and all eight chapters.
 * Only the presentation stage changes. No AI, SMS, or spouse records are read.
 */
(()=>{
"use strict";
const E=globalThis.ANTHOS_DEEP_DIVE_ENGINE;
const $=id=>document.getElementById(id);
const STORY_URLS=Object.freeze({
 questions:"/dive-review/stories/questions.v1.json",
 christmas:"/dive-review/stories/christmas.v1.json",
 offer:"/dive-review/stories/offer.v1.json"
});
const params=new URLSearchParams(location.search);
const requested=params.get("story"),resetOnOpen=params.get("reset")==="stories";
let currentKey=Object.hasOwn(STORY_URLS,requested)?requested:"questions";
let stories={},story=null,state=null,notes={},started=true,stage="scene";
const stateKey=()=> "anthos_dive_review_v1_"+story.id+"_v"+story.storyVersion;
const notesKey=()=> stateKey()+"_editorial_notes";
const put=(id,value)=>{$(id).textContent=value??""};
const showFeedback=message=>put("readerFeedback",message);
function resetAllStoryProgress(){
 try{
  for(const entry of Object.values(stories))
   localStorage.removeItem("anthos_dive_review_v1_"+entry.id+"_v"+entry.storyVersion);
  return true;
 }catch{return false;}
}
function showResetResult(ok){
 const el=$("resetNotice");el.hidden=false;
 el.textContent=ok?"Both Deep Dives have been reset to Chapter 1 on this device. Editorial notes and comments were kept.":
   "The browser blocked clearing saved story progress. Use the same browser and allow local storage.";
}
function readLocal(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{showFeedback("Your browser cannot save progress; this session still works.");return false}}
function flower(completed){
 const petals=Array.from({length:12},(_,i)=>'<ellipse cx="50" cy="24" rx="8" ry="17" transform="rotate('+i*30+' 50 50)" fill="'+(i===0?"#799f7c":"#dee8db")+'" stroke="#faf8f2" stroke-width="1.3"/>').join("");
 return '<svg viewBox="0 0 100 100" focusable="false" aria-hidden="true">'+petals+'<circle cx="50" cy="50" r="19" fill="#faf8f2"/><text x="50" y="54" text-anchor="middle" font-size="17" font-family="Georgia" fill="#3d5843">'+completed+'</text></svg>';
}
function animate(direction="next"){
 const pane=$("slideWindow");
 pane.classList.remove("slide-next","slide-back");pane.scrollTop=0;
 if(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)return;
 void pane.offsetWidth;
 pane.classList.add(direction==="back"?"slide-back":"slide-next");
}
function setStage(newStage,direction="next"){
 if(stage===newStage)return;
 stage=newStage;renderReader();animate(direction);
}
function applyStory(key){
 if(!Object.hasOwn(stories,key))return;
 currentKey=key;story=E.storyCheck(stories[key]);
 state=E.restore(story,readLocal(stateKey(),null));
 notes=readLocal(notesKey(),{});
 if(!notes||typeof notes!=="object"||Array.isArray(notes))notes={};
 stage="scene";started=true;
 $("reviewNotes").open=false;
 $("resetNotice").hidden=true;
 try{history.replaceState(null,"",location.pathname+"?story="+encodeURIComponent(key));}catch{}
 render();
 $("storyDialog").close();
 if($("toolsDialog").open)$("toolsDialog").close();
}
function run(action){
 const result=E.transition(story,state,action);
 if(result.changed){state=result.state;writeLocal(stateKey(),state);render();}
 else if(result.reason)showFeedback("Continue in order and finish the current decision before advancing.");
 return result.changed;
}
function chapterJump(index){
 if(!story||!Number.isInteger(index)||index<0||index>Math.min(7,state.completed))return false;
 if(index===state.chapter){setStage("scene","back");return true;}
 const changed=run({type:"navigate",chapter:index});
 if(changed){stage="scene";renderReader();animate("back");}
 return changed;
}
function button(label,cls,fn,disabled=false){
 const b=document.createElement("button");b.type="button";b.className=cls;
 b.textContent=label;b.disabled=disabled;b.addEventListener("click",fn);return b;
}
function render(){
 if(!story)return;
 put("storyTitle",story.title);put("petalName",story.petalName);
 put("storyOverview",story.overview);
 put("progressStat",state.completed+" / 8");
 $("flower").innerHTML=flower(state.completed);
 $("flower").setAttribute("aria-label","Petal bloom: "+state.completed+" of eight chapters completed.");
 $("overview").hidden=started;$("reader").hidden=!started;
 if(started)renderReader();
 document.dispatchEvent(new Event("anthos-review-render"));
}
function repairContent(v,i,container){
 container.replaceChildren();container.hidden=true;
 if(v.needsRepair){
  container.hidden=false;
  const character=story.id==="the-questions-we-stopped-asking"?
    (i===1?"Mara":"Eli"):"Jack";
  const question=document.createElement("p");
  question.textContent="That response created distance. How could "+character+" try again?";
  container.append(question);
  const options=story.id==="the-questions-we-stopped-asking"?
    i===1?[
     {id:"own",text:"Mara acknowledges the accusation and asks Eli what has been on his mind."},
     {id:"deflect",text:"Mara says she's sorry Eli took it badly, then insists she had a good reason."}
    ]:[
     {id:"own",text:"Eli acknowledges the pressure he created and gives Mara room to decide what to share."},
     {id:"deflect",text:"Eli says he was only trying to help, then insists Mara overreacted."}
    ]:null;
  v.repairOptions.forEach((option,index)=>{
   const label=options?.find(x=>x.id===option.id)?.text||option.text;
   const row=document.createElement("div");row.className="repair-row";
   row.append(button(label,"btn outline",()=>{if(run({type:"repair",repair:option.id}))animate("next")}));
   const chip=button("Comment","comment-chip",()=>{});
   chip.dataset.commentTarget="repair_text";chip.dataset.commentIndex=String(index);
   row.append(chip);container.append(row);
  });
 }else if(v.repair){
  container.hidden=false;
  const item=v.repairOptions.find(x=>x.id===v.repair.selected);
  const p=document.createElement("p");
  p.textContent=(v.repair.guided?"Sophia models a clearer repair. ":"Repair practiced. ")+
     (item?.consequence||"The characters begin to address what happened.");
  container.append(p);
 }
}
function renderReader(){
 if(!story)return;
 const v=E.view(story,state),c=v.chapter,i=v.index;
 put("chapterEyebrow","CHAPTER "+(i+1)+" OF 8");
 put("chapterState",v.complete?"Finished":v.readOnly?"Reviewing":c.mastery?"Independent choice":"In progress");
 put("footerMilestone","Chapter "+(i+1)+" · "+({scene:"Story",choice:"Your decision",outcome:"What happened",insight:"Reflection",finished:"Finished"}[stage]||"Story"));
 const rail=$("chapterRail");rail.replaceChildren();
 story.chapters.forEach((ch,n)=>{
  const b=button(n<state.completed?"Completed":String(n+1),"chapter-node "+(n===i?"current ":n<state.completed?"done ":""),()=>chapterJump(n),n>state.completed);
  b.setAttribute("aria-label","Chapter "+(n+1)+": "+ch.title+(n<state.completed?", completed":"")+(n===i?", current":""));
  if(n===i)b.setAttribute("aria-current","step");
  rail.append(b);
 });
 put("storyLocation",c.location||"THE SCENE");
 put("chapterTitle",c.title);
 put("storyText",v.storyText);
 put("question",c.prompt||"");
 put("decisionHint",c.mastery?"Choose independently. There are no advance hints.":"Choose the response you believe is most constructive.");
 put("takeaway",c.takeaway||"Notice what helped or hindered the relationship.");
 put("transitionText",c.transition||"");
 const choices=$("options");choices.replaceChildren();
 if(c.options){
  c.options.forEach((option,n)=>{
   const b=document.createElement("button");
   b.type="button";b.className="choice"+(v.choiceIndex===n?" selected":"");
   const letter=document.createElement("b");letter.textContent=String.fromCharCode(65+n);
   const txt=document.createElement("span");txt.textContent=option.text;
   b.append(letter,txt);b.disabled=!v.canChoose;
   b.addEventListener("click",()=>{
    if(run({type:"choose",index:n})){stage="outcome";renderReader();animate("next");}
   });
   const row=document.createElement("div");row.className="choice-row";row.append(b);
   const chip=button("Comment","comment-chip",()=>{});
   chip.dataset.commentTarget="option_text";chip.dataset.commentIndex=String(n);
   row.append(chip);choices.append(row);
  });
 }
 put("impact",v.outcome||"");
 const score=c.mastery&&v.mastery?" Independent mastery: "+v.mastery.status.replaceAll("-"," ")+". "+v.mastery.summary:"";
 put("coach",(v.coaching||"")+score);
 repairContent(v,i,$("repair"));
 const visibleStage=stage==="choice"&&!c.options?"scene":stage;
 if(stage!==visibleStage)stage=visibleStage;
 for(const pane of document.querySelectorAll(".slide-part"))
  pane.hidden=pane.dataset.stage!==stage;
 const back=$("previousButton"),next=$("advanceButton");
 back.disabled=stage==="scene"&&i===0;
 next.disabled=stage==="finished"||(stage==="choice"&&!v.choice)||(stage==="outcome"&&v.needsRepair);
 next.textContent=stage==="scene"?(c.options?"See choices →":"Reflect →"):
  stage==="choice"?"See what happened →":
  stage==="outcome"?(v.needsRepair?"Practice a repair":"Reflect →"):
  stage==="insight"?(i===7?"Finish story ✦":"Next chapter →"):"Story completed ✓";
 put("chapterNote",notes[String(i)]||"");
 put("notesCount",Object.values(notes).filter(x=>typeof x==="string"&&x.trim()).length+" saved");
 showFeedback(v.complete&&stage==="finished"?"All eight chapters finished. Review notes from the menu.":"");
 document.dispatchEvent(new Event("anthos-review-render"));
}
function nextScreen(){
 if(!story)return;
 const v=E.view(story,state),i=v.index,c=v.chapter;
 if(stage==="scene")return setStage(c.options?"choice":"insight");
 if(stage==="choice"){if(v.choice)return setStage("outcome");return;}
 if(stage==="outcome"){if(!v.needsRepair)return setStage("insight");return;}
 if(stage==="insight"){
   if(i===7){
    if(v.readOnly||v.complete)return setStage("finished");
    if(run({type:"advance"})){stage="finished";renderReader();animate("next");}
    return;
   }
   if(v.readOnly){
    if(run({type:"navigate",chapter:i+1})){stage="scene";renderReader();animate("next");}
   }else if(run({type:"advance"})){stage="scene";renderReader();animate("next");}
 }
}
function previousScreen(){
 if(!story)return;
 if(stage==="finished")return setStage("insight","back");
 if(stage==="insight")return setStage(story.chapters[state.chapter].options?"outcome":"scene","back");
 if(stage==="outcome")return setStage("choice","back");
 if(stage==="choice")return setStage("scene","back");
 if(stage==="scene"&&state.chapter>0){
  if(run({type:"navigate",chapter:state.chapter-1})){stage="insight";renderReader();animate("back");}
 }
}
async function copyAllNotes(){
 const values=Object.entries(notes).filter(([,v])=>typeof v==="string"&&v.trim()).sort((a,b)=>Number(a[0])-Number(b[0]));
 if(!values.length){put("noteFeedback","No notes to copy yet.");return;}
 const payload="Anthos Review · "+story.title+"\n"+values.map(([i,t])=>"Chapter "+(Number(i)+1)+" — "+story.chapters[Number(i)]?.title+"\n"+t.trim()).join("\n\n");
 try{
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(payload);
  else{const el=document.createElement("textarea");el.value=payload;el.style.position="fixed";el.style.top="-9999px";document.body.append(el);el.select();const ok=document.execCommand("copy");el.remove();if(!ok)throw Error("Copy blocked")}
  put("noteFeedback","Copied "+values.length+" notes. Paste them into ChatGPT for revision.");
 }catch{put("noteFeedback","Your browser blocked copying. Select the notes manually.")}
}
function init(){
 $("storiesButton").addEventListener("click",()=>$("storyDialog").showModal());
 $("closeDialog").addEventListener("click",()=>$("storyDialog").close());
 document.querySelectorAll(".story-pick").forEach(b=>b.addEventListener("click",()=>applyStory(b.dataset.story)));
 $("storyDialog").addEventListener("click",ev=>{if(ev.target===$("storyDialog"))$("storyDialog").close()});
 $("toolsButton").addEventListener("click",()=>$("toolsDialog").showModal());
 $("closeTools").addEventListener("click",()=>$("toolsDialog").close());
 $("reviewModeButton").addEventListener("click",()=>{
  const on=$("app").classList.toggle("review-on");
  $("reviewModeButton").setAttribute("aria-pressed",String(on));
  $("reviewModeButton").textContent=on?"Normal comment appearance":"Highlight comment buttons";
  $("toolsDialog").close();
 });
 $("startButton").addEventListener("click",()=>{started=true;render()});
 $("previousButton").addEventListener("click",previousScreen);
 $("advanceButton").addEventListener("click",nextScreen);
 $("reviewAgainButton").addEventListener("click",()=>{if(chapterJump(0))setStage("scene","back")});
 $("saveNote").addEventListener("click",()=>{
  if(!story)return;
  const key=String(state.chapter),text=$("chapterNote").value.trim().slice(0,3000);
  if(text)notes[key]=text;else delete notes[key];
  if(writeLocal(notesKey(),notes)){put("noteFeedback",text?"Saved on this device.":"Note cleared.");put("notesCount",Object.keys(notes).length+" saved")}
 });
 $("copyNotes").addEventListener("click",copyAllNotes);
 $("resetAllButton").addEventListener("click",()=>{
  if(!confirm("Start both Deep Dives over at Chapter 1 on this device? Choices and progress will be cleared. Editorial notes and comments will remain."))return;
  const ok=resetAllStoryProgress();if(ok)applyStory(currentKey);showResetResult(ok);
 });
 $("resetButton").addEventListener("click",()=>{
  if(!story||!confirm("Reset only this story's chapter progress on this device? Editorial notes are kept."))return;
  try{localStorage.removeItem(stateKey())}catch{showResetResult(false);return}
  state=E.fresh(story);started=true;stage="scene";render();$("toolsDialog").close();
 });
 Promise.all(Object.entries(STORY_URLS).map(async ([key,url])=>{
  const response=await fetch(url,{cache:"no-store",credentials:"same-origin"});
  if(!response.ok)throw new Error("Story loading error ("+response.status+")");
  return [key,E.storyCheck(await response.json())];
 })).then(entries=>{
  stories=Object.fromEntries(entries);
  const cleared=resetOnOpen?resetAllStoryProgress():null;
  applyStory(currentKey);if(resetOnOpen)showResetResult(cleared);
 }).catch(()=>{
  started=false;$("overview").hidden=false;
  $("reader").hidden=true;
  put("storyOverview","The story could not load. Refresh this page to try again.");
  $("startButton").disabled=true;
 });
}
globalThis.ANTHOS_REVIEW_CONTEXT=()=>story&&state?{
 story,chapter:state.chapter,chosen:E.view(story,state).choiceIndex,
 endingIndex:state.choices?.["6"],completed:state.completed
}:null;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
})();