// Anthos 4.0 Episode Studio — editorial editor only, no v3 pilot launch or SMS.
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const text=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value);return x};
let current=null,researcher="Gottman",busy=false,activeTab="objectives";
const phases=["hook","conflict","discovery","reattempt","outcome","reflection"];
const note=(message,error=false)=>{const p=$("episodeNotice");p.textContent=message;p.classList.toggle("error",error)};
const setBusy=on=>{busy=on;for(const id of ["episodeGenerate","episodeSave","episodeReviewSave","episodeValidate"])$(id).disabled=on};
const changed=()=>{if(!current)return;current.dirty=true;$("episodeSavedState").textContent="Unsaved edits";$("episodeSavedState").classList.add("modified");};
async function request(action,data={}){
 const params=new URLSearchParams();
 if(!action){params.set("view","episode-studio");params.set("id",data.id)}
 const res=await fetch("/api/admin"+(action?"":"?"+params),{
   method:action?"POST":"GET",credentials:"same-origin",cache:"no-store",
   headers:action?{"Content-Type":"application/json","x-threefold-admin":"1"}:{},
   ...(action?{body:JSON.stringify({action,...data})}:{})
 });
 const body=await res.json().catch(()=>({error:"Invalid API response."}));
 if(!res.ok||!body.ok)throw Error(body.error||"Episode Studio could not complete the request.");
 return body;
}
function field(name){return document.querySelector('[data-episode-field="'+name+'"]')}
function phaseField(name){return document.querySelector('[data-episode-phase="'+name+'"]')}
function collect(){
 if(!current)return null;
 const s={...current.studio,phases:{...current.studio.phases}};
 document.querySelectorAll("[data-episode-field]").forEach(e=>{s[e.dataset.episodeField]=e.value});
 for(const p of phases)s.phases[p]=phaseField(p).value;
 s.primarySkill=$("episodePrimary").value;
 s.supportingSkills=[...current.studio.supportingSkills].filter(x=>x!==s.primarySkill).slice(0,2);
 return s;
}
function setTab(tab){
 activeTab=tab;
 document.querySelectorAll("[data-episode-tab]").forEach(b=>{
  const selected=b.dataset.episodeTab===tab;b.classList.toggle("active",selected);b.setAttribute("aria-selected",String(selected));
 });
 document.querySelectorAll("[data-episode-page]").forEach(x=>x.hidden=x.dataset.episodePage!==tab);
 if(tab==="review")review();
}
function paintResearchers(){
 const box=$("episodeResearchers");box.replaceChildren();
 for(const name of ["Gottman","Schnarch","Aron"]){
  const button=text("button","episode-researcher"+(researcher===name?" active":""),name);button.type="button";
  button.setAttribute("aria-pressed",String(researcher===name));
  button.addEventListener("click",()=>{researcher=name;paintResearchers();paintSkills()});box.append(button);
 }
}
function paintSupports(){
 const box=$("episodeSupports");box.replaceChildren();
 if(!current.studio.supportingSkills.length){box.append(text("span","","Choose up to two skills from the objective library."));return}
 for(const id of current.studio.supportingSkills){
  const skill=current.skills.find(s=>s.id===id);if(!skill)continue;
  const button=text("button","episode-support-pill",skill.title+" ×");button.type="button";
  button.title="Remove supporting objective";
  button.addEventListener("click",()=>{current.studio.supportingSkills=current.studio.supportingSkills.filter(x=>x!==id);changed();paintSupports();paintSkills()});
  box.append(button);
 }
}
function paintSkills(){
 if(!current)return;
 const box=$("episodeSkillList");box.replaceChildren();
 for(const skill of current.skills.filter(s=>s.researcher===researcher)){
  const row=text("article","episode-skill"),desc=text("div","episode-skill-text");
  desc.append(text("strong","",skill.title),text("small","",skill.description));
  const main=text("button","episode-mini"+(current.studio.primarySkill===skill.id?" selected":""),current.studio.primarySkill===skill.id?"Primary ✓":"Make primary");
  main.type="button";main.setAttribute("aria-pressed",String(current.studio.primarySkill===skill.id));
  main.addEventListener("click",()=>{
   current.studio.primarySkill=skill.id;
   current.studio.supportingSkills=current.studio.supportingSkills.filter(x=>x!==skill.id);
   $("episodePrimary").value=skill.id;changed();paintSkills();paintSupports();
  });
  const selected=current.studio.supportingSkills.includes(skill.id),support=text("button","episode-mini"+(selected?" selected":""),selected?"Supporting ✓":"+ Support");
  support.type="button";support.disabled=skill.id===current.studio.primarySkill;
  support.setAttribute("aria-pressed",String(selected));
  support.addEventListener("click",()=>{
   const list=current.studio.supportingSkills;
   if(selected)current.studio.supportingSkills=list.filter(x=>x!==skill.id);
   else if(list.length>=2){note("Choose at most two supporting skills. Remove one first.",true);return}
   else current.studio.supportingSkills=[...list,skill.id];
   changed();paintSupports();paintSkills();
  });
  row.append(desc,main,support);box.append(row);
 }
}
function populate(){
 if(!current)return;
 const s=current.studio;
 for(const item of document.querySelectorAll("[data-episode-field]"))item.value=s[item.dataset.episodeField]||"";
 for(const p of phases)phaseField(p).value=s.phases?.[p]||"";
 $("episodePrimary").value=s.primarySkill||"";
 $("episodeStudioTitle").textContent=s.title||"Untitled episode";
 $("episodeMeta").textContent=current.petal+" · "+(current.mode==="shared"?"Two coaches, one shared story":"Individual private adventure")+" · Version 4.0 editorial draft";
 $("episodeSavedState").textContent=current.dirty?"Unsaved edits":current.hasSaved?"Saved draft":"New draft";
 $("episodeSavedState").classList.toggle("modified",!!current.dirty);
 const found=current.skills.find(x=>x.id===s.primarySkill);
 if(found)researcher=found.researcher;
 paintResearchers();paintSkills();paintSupports();review();
}
function previewPhases(){
 const target=$("episodePhases");target.replaceChildren();
 for(const [i,p] of current.phases.entries()){
  const row=text("div","episode-phase-row");
  const header=text("div","episode-phase-head");
  header.append(text("span","episode-phase-number",i+1),text("strong","",p.title));
  const body=text("div","");
  body.append(text("small","",p.hint));
  const area=text("textarea","");area.rows=3;area.maxLength=850;area.dataset.episodePhase=p.id;
  area.placeholder="The AI can improvise. Describe the educational purpose and story direction, not an SMS script.";
  area.addEventListener("input",changed);
  body.append(area);row.append(header,body);target.append(row);
 }
}
async function openEditor(id,petal,mode){
 if(current?.dirty&&!confirm("Discard your unsaved 4.0 draft and open another episode?"))return;
 $("episodeStudio").hidden=false;$("jj2Browse").hidden=true;
 $("episodeStudioTitle").textContent="Loading episode…";
 note("Loading editor and objectives…");
 try{
  const out=await request(null,{id});
  current={id,petal,mode,version:out.scenario.content_version,studio:out.studio,
   skills:out.skills,phases:out.phases,hasSaved:out.scenario.episode_saved,dirty:false};
  previewPhases();
  const select=$("episodePrimary");select.replaceChildren();
  const blank=text("option","","Select one relationship skill");blank.value="";select.append(blank);
  for(const skill of current.skills){
   const opt=text("option","",skill.researcher+" · "+skill.title);opt.value=skill.id;select.append(opt);
  }
  populate();setTab("objectives");
  note(out.scenario.episode_saved?"Saved 4.0 episode draft loaded. Edit any field.":"New 4.0 editorial draft, based on the existing scenario seed. Use AI to complete the plan.");
  $("episodeStudio").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(err){current=null;note(err.message,true)}
}
function validation(){
 const s=collect();
 if(!s)return [];
 const tests=[
  ["Primary relationship objective",Boolean(s.primarySkill)],
  ["Clear episode title",s.title.trim().length>=5],
  ["Story premise",s.premise.trim().length>=75],
  ["Learning objective",s.learningObjective.trim().length>=12],
  ["Jack's motivation",s.jackMotivation.trim().length>=20],
  ["Jill's motivation",s.jillMotivation.trim().length>=20],
  ["Story boundaries",s.boundaries.trim().length>=15],
  ["Research context",s.researchNotes.trim().length>=15],
  ["Ending that resolves the original conflict",s.closureCriteria.trim().length>=20],
  ["Reflection invitation",s.reflectionPrompt.trim().length>=15],
  ["Six dynamic phases",phases.every(p=>s.phases?.[p]?.trim().length>=30)]
 ];
 return tests;
}
function review(){
 if(!current)return;
 const list=$("episodeReadiness");list.replaceChildren();
 const checks=validation();
 for(const [label,pass] of checks){const row=text("div","episode-check"+(pass?" ok":""));row.append(text("span","",pass?"✓":"○"),text("span","",label));list.append(row)}
 const count=checks.filter(x=>x[1]).length;
 list.prepend(text("p","episode-summary",count+" of "+checks.length+" editorial readiness checks complete. Optional humor is yours to write or remove."));
}
async function generate(){
 if(!current||busy)return;
 if(current.dirty&&!confirm("AI will replace the text currently shown, including unsaved changes and personal jokes. Continue?"))return;
 setBusy(true);note("Asking OpenAI to prepare a complete six-phase editorial draft. Your changes will not save automatically.");
 try{
  const data=await request("episode-studio-generate",{id:current.id,direction:field("creativeDirection").value});
  current.studio=data.studio;current.dirty=true;populate();
  note("AI draft generated with "+(data.model||"OpenAI")+". Review and rewrite freely, especially your humor. Click Save when ready.");
 }catch(err){note(err.message,true)}finally{setBusy(false)}
}
async function save(){
 if(!current||busy)return;
 const checks=validation();
 const s=collect();
 if(!s.title.trim()||!s.learningObjective.trim()||s.premise.trim().length<75){
  setTab("story");note("Give the episode a title, a clear objective, and a detailed story premise before saving.",true);return;
 }
 setBusy(true);note("Saving your versioned Anthos 4.0 editorial draft…");
 try{
  const data=await request("episode-studio-save",{id:current.id,content_version:current.version,studio:s});
  current.version=data.content_version;current.studio=data.studio;current.dirty=false;current.hasSaved=true;
  $("episodeSavedState").textContent="Saved · v"+current.version;
  $("episodeSavedState").classList.remove("modified");
  note("Saved successfully. This editorial plan is private and does not change any active pilots or send SMS.");
  review();
 }catch(err){note(err.message,true)}finally{setBusy(false)}
}
function setup(){
 if(!$("episodeStudio"))return;
 document.querySelectorAll("[data-episode-tab]").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.episodeTab)));
 document.querySelectorAll("[data-episode-field]").forEach(e=>e.addEventListener("input",changed));
 $("episodePrimary").addEventListener("change",()=>{
  if(!current)return;
  current.studio.primarySkill=$("episodePrimary").value;
  current.studio.supportingSkills=current.studio.supportingSkills.filter(x=>x!==current.studio.primarySkill);
  changed();paintSupports();paintSkills();
 });
 $("episodeGenerate").addEventListener("click",generate);
 $("episodeSave").addEventListener("click",save);
 $("episodeReviewSave").addEventListener("click",save);
 $("episodeValidate").addEventListener("click",()=>{setTab("review");note("Readiness checked. Save at any time; incomplete optional areas can be revised later.")});
 $("episodeBack").addEventListener("click",()=>{
  if(current?.dirty&&!confirm("Leave without saving this 4.0 draft?"))return;
  current=null;$("episodeStudio").hidden=true;$("jj2Browse").hidden=false;
  $("jj2Notice").textContent="Choose a scenario to open the Anthos 4.0 Episode Studio.";
 });
 document.addEventListener("anthos-episode-open",event=>{
  if(!event.detail?.id)return;
  openEditor(event.detail.id,event.detail.petal,event.detail.mode);
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();