// Anthos 4.0 — one compact, objective-driven storyboard with optional private check-ins.
// Editorial design only: no outgoing SMS and no automatic 3.x pilot launch.
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const node=(tag,cls="",value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
const PHASE_IDS=["hook","conflict","discovery","reattempt","outcome","reflection"];
const CHECKPOINT_IDS=PHASE_IDS.slice(0,-1);
let current=null,researcher="Gottman",busy=false,opening=false;
let pilot=null,pilotPlayers=[];
const skillSymbols={"g-bids":"♡","g-toward":"☏","g-start":"▤","g-patterns":"⚠","g-repair":"↻","g-influence":"◎","g-appreciation":"♧","g-world":"◉","g-meaning":"⌂"};
function lockPath(input){
 if(input.dataset.episodeField)return input.dataset.episodeField;
 if(input.dataset.episodePhase)return "phases."+input.dataset.episodePhase;
 if(input.dataset.checkpointPurpose)return "checkpoints."+input.dataset.checkpointPurpose+".purpose";
 if(input.dataset.checkpointHumor)return "checkpoints."+input.dataset.checkpointHumor+".humorCue";
 return "";
}
function wireLocks(){
 for(const input of document.querySelectorAll("[data-episode-field],[data-episode-phase],[data-checkpoint-purpose],[data-checkpoint-humor]")){
  const key=lockPath(input);
  if(!key||input.parentElement?.classList.contains("episode-lock-wrap"))continue;
  const wrap=node("span","episode-lock-wrap");
  input.parentNode.insertBefore(wrap,input);wrap.append(input);
  const btn=node("button","episode-field-lock","🔓");btn.type="button";btn.dataset.lockPath=key;
  btn.addEventListener("click",()=>{
   if(!current)return;
   const locks=new Set(current.studio.locks||[]);
   if(locks.has(key))locks.delete(key);else locks.add(key);
   current.studio.locks=[...locks];paintLocks();markDirty();
  });
  wrap.append(btn);
 }
 paintLocks();
}
function paintLocks(){
 if(!current)return;
 const selected=new Set(current.studio.locks||[]);
 for(const btn of document.querySelectorAll("[data-lock-path]")){
  const locked=selected.has(btn.dataset.lockPath);
  const input=btn.parentNode.querySelector("textarea,input");
  btn.classList.toggle("active",locked);
  btn.textContent=locked?"🔒":"🔓";
  btn.setAttribute("aria-pressed",String(locked));
  btn.setAttribute("aria-label",(locked?"Unlock ":"Lock ")+btn.dataset.lockPath.replaceAll("."," "));
  btn.title=locked?"Locked against AI changes. Click to unlock.":"Click to keep this exact text when AI rewrites the episode.";
  if(input)input.readOnly=locked;
  btn.parentNode.classList.toggle("is-locked",locked);
 }
}
const note=(msg,isError=false)=>{const n=$("episodeNotice");n.textContent=msg;n.classList.toggle("error",isError)};
const markDirty=()=>{
 if(!current||opening)return;
 current.dirty=true;
 $("episodeSavedState").textContent="Unsaved edits";
 $("episodeSavedState").classList.add("modified");
 renderReadiness();
};
function setBusy(on){
 busy=on;
 for(const id of ["episodeGenerate","episodeSave","episodeValidate"])$(id).disabled=on;
}
async function request(action,data={}){
 const params=new URLSearchParams();
 if(!action){params.set("view","episode-studio");params.set("id",data.id)}
 const res=await fetch("/api/admin"+(action?"":"?"+params),{
  method:action?"POST":"GET",credentials:"same-origin",cache:"no-store",
  headers:action?{"Content-Type":"application/json","x-threefold-admin":"1"}:{},
  ...(action?{body:JSON.stringify({action,...data})}:{})
 });
 const body=await res.json().catch(()=>({error:"Invalid server response."}));
 if(!res.ok||!body.ok)throw Error(body.error||"Episode Studio request failed.");
 return body;
}
const field=name=>document.querySelector('[data-episode-field="'+name+'"]');
const phaseField=name=>document.querySelector('[data-episode-phase="'+name+'"]');
const checkField=(phase,kind)=>document.querySelector('[data-checkpoint-'+kind+'="'+phase+'"]');
function collect(){
 if(!current)return null;
 const s={...current.studio,phases:{...current.studio.phases}};
 for(const item of document.querySelectorAll("[data-episode-field]"))s[item.dataset.episodeField]=item.value;
 for(const p of PHASE_IDS)s.phases[p]=phaseField(p).value;
 s.primarySkill=$("episodePrimary").value;
 s.soloCoach=$("episodeSoloRole").value;
 s.locks=[...new Set(current.studio.locks||[])];
 s.supportingSkills=[...current.studio.supportingSkills].filter(x=>x!==s.primarySkill).slice(0,2);
 s.checkpoints=CHECKPOINT_IDS.map(afterPhase=>({
  afterPhase,
  audience:checkField(afterPhase,"audience").value,
  waitForReply:checkField(afterPhase,"wait").checked&&checkField(afterPhase,"audience").value!=="none",
  purpose:checkField(afterPhase,"purpose").value,
  humorCue:checkField(afterPhase,"humor").value
 }));
 return s;
}
function paintResearchers(){
 const panel=$("episodeResearchers");panel.replaceChildren();
 const symbols={Gottman:"♡",Schnarch:"◇",Aron:"♧"};
 const descriptions={Gottman:"Connection & Conflict",Schnarch:"Differentiation & Growth",Aron:"Discovery & Expansion"};
 for(const name of ["Gottman","Schnarch","Aron"]){
  const button=node("button","episode-researcher"+(researcher===name?" active":""));
  button.type="button";button.setAttribute("aria-pressed",String(researcher===name));
  button.append(node("span","episode-researcher-icon",symbols[name]),node("strong","",name),
    node("small","",descriptions[name]));
  button.addEventListener("click",()=>{researcher=name;paintResearchers();paintSkills()});
  panel.append(button);
 }
}
function paintSupports(){
 const box=$("episodeSupports");box.replaceChildren();
 if(!current.studio.supportingSkills.length){box.append(node("span","","Choose from the skill library."));return}
 for(const id of current.studio.supportingSkills){
  const skill=current.skills.find(x=>x.id===id);if(!skill)continue;
  const button=node("button","episode-support-pill",skill.title+" ×");
  button.type="button";button.title="Remove supporting skill";
  button.addEventListener("click",()=>{
   current.studio.supportingSkills=current.studio.supportingSkills.filter(x=>x!==id);
   markDirty();paintSkills();paintSupports();
  });
  box.append(button);
 }
}
function paintSkills(){
 if(!current)return;
 const box=$("episodeSkillList");box.replaceChildren();
 for(const skill of current.skills.filter(x=>x.researcher===researcher)){
  const isPrimary=current.studio.primarySkill===skill.id;
  const isSupporting=current.studio.supportingSkills.includes(skill.id);
  const card=node("article","episode-skill"+(isPrimary?" primary":"")+(isSupporting?" supporting":""));
  const pick=node("button","episode-skill-check",isPrimary?"✓":isSupporting?"＋":"");
  pick.type="button";pick.setAttribute("aria-pressed",String(isPrimary));
  pick.setAttribute("aria-label",(isPrimary?"Clear primary objective: ":"Choose primary objective: ")+skill.title);
  pick.title=isPrimary?"Clear primary skill":"Make primary skill";
  pick.addEventListener("click",()=>{
   current.studio.primarySkill=isPrimary?"":skill.id;
   current.studio.supportingSkills=current.studio.supportingSkills.filter(x=>x!==skill.id);
   $("episodePrimary").value=current.studio.primarySkill;
   markDirty();paintSkills();paintSupports();
  });
  const icon=node("span","episode-skill-icon",skillSymbols[skill.id]||(skill.researcher==="Schnarch"?"◇":"♧"));
  icon.setAttribute("aria-hidden","true");
  const desc=node("div","episode-skill-text");
  desc.append(node("strong","",skill.title),node("small","",skill.description));
  const entries=current.skillUsage?.[skill.id]||[];
  const tools=node("div","episode-skill-tools");
  const count=node("span","episode-usage-count",String(entries.length));
  count.title=entries.length+" saved 4.0 episode"+(entries.length===1?"":"s");
  const infoWrap=node("span","episode-info-wrap"),info=node("button","episode-skill-info","i");
  info.type="button";info.setAttribute("aria-label","Episodes using "+skill.title);
  info.setAttribute("aria-expanded","false");
  const placeTooltip=()=>{
   const rect=info.getBoundingClientRect();
   tooltip.style.left=Math.max(8,Math.min(window.innerWidth-252,rect.right-230))+"px";
   tooltip.style.top=Math.max(8,Math.min(window.innerHeight-230,rect.bottom+7))+"px";
  };
  info.addEventListener("mouseenter",placeTooltip);
  info.addEventListener("focus",placeTooltip);
  info.addEventListener("click",()=>{
   placeTooltip();
   const open=infoWrap.classList.toggle("open");
   info.setAttribute("aria-expanded",String(open));
  });
  info.addEventListener("blur",()=>{
   infoWrap.classList.remove("open");info.setAttribute("aria-expanded","false");
  });
  const tooltip=node("span","episode-info-tooltip");
  tooltip.append(node("strong","",entries.length+" saved 4.0 "+(entries.length===1?"episode":"episodes")));
  if(entries.length){for(const episode of entries)tooltip.append(node("span","episode-usage-item",episode.title))}
  else tooltip.append(node("span","episode-usage-item","No saved episode uses this objective yet."));
  infoWrap.append(info,tooltip);
  const support=node("button","episode-skill-add"+(isSupporting?" added":""),isSupporting?"−":"+");
  support.type="button";support.disabled=isPrimary;
  support.setAttribute("aria-pressed",String(isSupporting));
  support.setAttribute("aria-label",(isSupporting?"Remove supporting skill: ":"Add supporting skill: ")+skill.title);
  support.title=isSupporting?"Remove supporting objective":"Add supporting objective";
  support.addEventListener("click",()=>{
   if(isSupporting)current.studio.supportingSkills=current.studio.supportingSkills.filter(x=>x!==skill.id);
   else if(current.studio.supportingSkills.length>=2){
    note("Choose at most two supporting skills. Remove one first.",true);return;
   }else current.studio.supportingSkills=[...current.studio.supportingSkills,skill.id];
   markDirty();paintSkills();paintSupports();
  });
  tools.append(count,infoWrap,support);
  card.append(pick,icon,desc,tools);box.append(card);
 }
}
function labeledTextarea(labelText,datasetKey,value,max,placeholder){
 const label=node("label","",labelText),area=node("textarea");
 area.rows=2;area.maxLength=max;area.placeholder=placeholder||"";
 area.dataset[datasetKey]=value;area.addEventListener("input",markDirty);
 label.append(area);return label;
}
function renderStoryboard(){
 const root=$("episodePhases");root.replaceChildren();
 for(const [index,p] of current.phases.entries()){
  const row=node("article","episode-phase-row");
  const title=node("div","episode-phase-head");
  title.append(node("span","episode-phase-number",index+1),node("strong","",p.title));
  const body=node("div");
  body.append(node("small","",p.hint));
  const summary=node("textarea");
  summary.dataset.episodePhase=p.id;summary.maxLength=850;summary.rows=2;
  summary.placeholder="AI-drafted story objective and consequence; no scripted texts.";
  summary.setAttribute("aria-label",p.title+" story summary");
  summary.addEventListener("input",markDirty);
  body.append(summary);row.append(title,body);root.append(row);
  if(index===current.phases.length-1)continue;
  const next=current.phases[index+1];
  const card=node("section","episode-intervention");
  card.dataset.audience="none";
  const header=node("div","episode-intervention-head");
  header.append(node("strong","","✉ Check-in "+(index+1)),node("small","",p.title+" → "+next.title));
  const top=node("div","episode-intervention-top");
  const audienceLabel=node("label","","Who should text privately?");
  const select=node("select");
  select.dataset.checkpointAudience=p.id;
  select.setAttribute("aria-label","Recipients for check-in after "+p.title);
  const choices=[
   ["none","No intervention — story continues"],
   ["jack","Jack → husband only"],
   ["both","Jack + Jill → both, separately"],
   ["jill","Jill → wife only"]
  ];
  for(const [value,label] of choices){
   const option=node("option","",label);option.value=value;
   if(current.mode==="individual"&&value!=="none"&&value!==current.studio.soloCoach)option.disabled=true;
   select.append(option);
  }
  audienceLabel.append(select);
  const wait=node("label","episode-wait");
  const input=document.createElement("input");input.type="checkbox";input.dataset.checkpointWait=p.id;
  wait.append(input,node("span","","Wait for reply"));
  top.append(audienceLabel,wait);
  const detail=node("div","episode-intervention-details");
  detail.append(
   labeledTextarea("Why this is a meaningful turning point","checkpointPurpose",p.id,600,
      "A concrete dilemma requiring a useful coaching decision."),
   labeledTextarea("Your humor cue at this moment (optional)","checkpointHumor",p.id,700,
      "A funny complication or callback; never a forced SMS punchline.")
  );
  const empty=node("span","episode-intervention-empty","No pause here. Jack and Jill carry the story forward autonomously.");
  select.addEventListener("change",()=>{
   card.dataset.audience=select.value;
   detail.hidden=select.value==="none";
   empty.hidden=select.value!=="none";
   wait.classList.toggle("muted",select.value==="none");
   input.disabled=select.value==="none";
   if(select.value==="none")input.checked=false;
   markDirty();
  });
  input.addEventListener("change",markDirty);
  card.append(header,top,detail,empty);root.append(card);
 }
 wireLocks();
}
function populate(){
 if(!current)return;
 opening=true;
 const s=current.studio;
 for(const item of document.querySelectorAll("[data-episode-field]"))item.value=s[item.dataset.episodeField]||"";
 for(const p of PHASE_IDS)phaseField(p).value=s.phases?.[p]||"";
 for(const item of s.checkpoints||[]){
  const select=checkField(item.afterPhase,"audience");
  if(!select)continue;
  select.value=item.audience||"none";
  const parent=select.closest(".episode-intervention");
  if(!select.value)select.value="none";
  parent.dataset.audience=select.value;
  const enabled=select.value!=="none";
  parent.querySelector(".episode-intervention-details").hidden=!enabled;
  parent.querySelector(".episode-intervention-empty").hidden=enabled;
  const wait=checkField(item.afterPhase,"wait");
  wait.checked=!!item.waitForReply&&enabled;wait.disabled=!enabled;
  checkField(item.afterPhase,"purpose").value=item.purpose||"";
  checkField(item.afterPhase,"humor").value=item.humorCue||"";
 }
 $("episodePrimary").value=s.primarySkill||"";
 $("episodeSoloWrap").hidden=current.mode!=="individual";
 $("episodeSoloRole").value=s.soloCoach||"jack";
 $("episodeStudioTitle").textContent=s.title||"Untitled episode";
 $("episodeMeta").textContent=(current.mode==="shared"?"SHARED · Jack and Jill / two private coaches":
 "INDIVIDUAL · one private coach; two-coach check-ins unavailable")+
 " · Editorial version 4.0";
 $("episodePetal").textContent=current.petal;
 $("episodeSavedState").textContent=current.dirty?"Unsaved edits":current.hasSaved?"Saved draft":"New draft";
 $("episodeSavedState").classList.toggle("modified",current.dirty);
 wireLocks();
 const primary=current.skills.find(x=>x.id===s.primarySkill);
 if(primary)researcher=primary.researcher;
 paintResearchers();paintSkills();paintSupports();
 opening=false;renderReadiness();
}
function validation(){
 const s=collect();if(!s)return [];
 const active=s.checkpoints.filter(x=>x.audience!=="none");
 return [
  ["Primary skill assigned",!!s.primarySkill],
  ["Clear title and story premise",s.title.trim().length>=5&&s.premise.trim().length>=75],
  ["Learning target defined",s.learningObjective.trim().length>=12],
  ["Characters have separate motivations",s.jackMotivation.trim().length>=20&&s.jillMotivation.trim().length>=20],
  ["Six story phases outlined",PHASE_IDS.every(x=>(s.phases[x]||"").trim().length>=30)],
  ["Check-in purposes are actionable",active.every(x=>x.purpose.trim().length>=20)],
  ["Story closes its original dilemma",s.closureCriteria.trim().length>=20],
  ["Research-informed notes present",s.researchNotes.trim().length>=15],
  ["Reflection invitation present",s.reflectionPrompt.trim().length>=15]
 ];
}
function renderReadiness(){
 if(!current)return;
 const checks=validation(),box=$("episodeReadiness");box.replaceChildren();
 const n=checks.filter(x=>x[1]).length;
 box.append(node("p","episode-summary",n+" of "+checks.length+" editorial checks complete"));
 for(const [label,passed] of checks){
  const row=node("div","episode-check"+(passed?" ok":""));
  row.append(node("span","",passed?"✓":"○"),node("span","",label));box.append(row);
 }
 const active=collect().checkpoints.filter(x=>x.audience!=="none").length;
 box.append(node("p","episode-editorial-note",active+" of 5 optional check-ins assigned."));
}
function closePilot(){
 for(const instance of pilotPlayers)instance?.destroy();
 pilotPlayers=[];pilot=null;
 const board=$("episodePilotBoard");if(board)board.hidden=true;
}
async function pilotEpisode(){
 if(!current||busy)return;
 if(current.mode!=="shared"){note("The two-coach 4.0 browser pilot currently supports shared episodes.",true);return}
 if(current.dirty||!current.hasSaved){
  note("Save your episode first. The pilot uses a snapshot of the last saved six-phase flow and humor.",true);
  return;
 }
 if(!window.Anthos4Player){note("Pilot player failed to load. Refresh the admin page.",true);return}
 setBusy(true);$("episodeLaunchPilot").disabled=true;
 note("Creating a new, private 4.0 episode rehearsal…");
 try{
  const room=await request("episode-studio-pilot-v4",{scenarioId:current.id});
  closePilot();
  pilot=room;
  const board=$("episodePilotBoard");
  board.hidden=false;
  const jack=$("episodeHusbandLink"),jill=$("episodeWifeLink");
  jack.href=room.invitations.jack;jill.href=room.invitations.jill;
  $("episodePilotStatus").textContent=
   "Fresh "+room.engine+" private test created. Each side has independent coaching. Only scenes are shared; no SMS is sent. Invitations expire "+new Date(room.expiresAt).toLocaleDateString()+".";
  const jToken=new URL(room.invitations.jack).searchParams.get("invite");
  const wToken=new URL(room.invitations.jill).searchParams.get("invite");
  pilotPlayers=[
   window.Anthos4Player.mount($("episodeHusbandPlayer"),jToken),
   window.Anthos4Player.mount($("episodeWifePlayer"),wToken)
  ];
  board.scrollIntoView({behavior:"smooth",block:"start"});
  note("Version 4.0 test room created. Both private coach panels are ready below.");
 }catch(e){note(e.message,true)}
 finally{setBusy(false);$("episodeLaunchPilot").disabled=false}
}
async function copyPilot(which){
 const url=pilot?.invitations?.[which];
 if(!url)return;
 try{await navigator.clipboard.writeText(url);
  $("episodePilotStatus").textContent=(which==="jack"?"Husband":"Wife")+" private invitation copied.";
 }catch{$("episodePilotStatus").textContent="Copy unavailable. Use the invitation link above."}
}
async function openEditor(id,petal,mode){
 if(busy)return;
 if(current?.dirty&&!confirm("Discard unsaved changes and open another episode?"))return;
 closePilot();
 const studio=$("episodeStudio");
 studio.hidden=false;$("jj2Browse").hidden=true;
 document.querySelector('[data-studio-page="deepdives"]').classList.add("studio-editing");
 $("episodeStudioTitle").textContent="Loading episode…";note("Loading objectives and story flow…");
 try{
  const data=await request(null,{id});
  current={id,petal,mode,studio:data.studio,skills:data.skills,skillUsage:data.skillUsage||{},phases:data.phases,
   version:data.scenario.content_version,hasSaved:data.scenario.episode_saved,dirty:false};
  renderStoryboard();
  const select=$("episodePrimary");select.replaceChildren();
  const blank=node("option","","Choose a relationship objective");blank.value="";select.append(blank);
  for(const skill of current.skills){const o=node("option","",skill.researcher+" · "+skill.title);o.value=skill.id;select.append(o)}
  populate();
  note(data.scenario.episode_saved?"Saved 4.0 draft loaded. Edit and save whenever you're ready.":"Episode seed loaded. Use ✦ AI fill episode, then revise the narrative and check-ins.");
  window.scrollTo({top:0,behavior:"smooth"});
 }catch(error){note(error.message,true);current=null}
}
async function generate(){
 if(!current||busy)return;
 if(current.dirty&&!confirm("AI will rewrite the UNLOCKED fields and keep locked text unchanged. Continue?"))return;
 setBusy(true);note("AI is preparing six story phases and targeted private interventions. Nothing will save automatically.");
 try{
  const before=collect();
  const data=await request("episode-studio-generate",{
   id:current.id,direction:field("creativeDirection").value,studio:before
  });
  current.studio=data.studio;current.dirty=true;renderStoryboard();populate();
  note("AI revised unlocked fields with "+(data.model||"OpenAI")+". "+
   (current.studio.locks?.length||0)+" locked text boxes remain unchanged. Save when ready.");
 }catch(error){note(error.message,true)}finally{setBusy(false)}
}
async function save(){
 if(!current||busy)return;
 const s=collect();
 if(s.title.trim().length<5||s.premise.trim().length<75||s.learningObjective.trim().length<12){
  note("Before saving, add a clear title, a descriptive premise, and a learning objective.",true);
  return;
 }
 setBusy(true);note("Saving the editable Anthos 4.0 episode draft…");
 try{
  const result=await request("episode-studio-save",{id:current.id,content_version:current.version,studio:s});
  current.version=result.content_version;current.studio=result.studio;current.hasSaved=true;current.dirty=false;
  current.skillUsage=result.skillUsage||current.skillUsage;paintSkills();
  $("episodeSavedState").textContent="Saved · v"+current.version;
  $("episodeSavedState").classList.remove("modified");
  note("Saved. The episode and all five optional intervention settings are stored. No SMS or pilot was launched.");
  renderReadiness();
 }catch(error){note(error.message,true)}finally{setBusy(false)}
}
function back(){
 if(busy)return;
 if(current?.dirty&&!confirm("Leave without saving your episode changes?"))return;
 closePilot();
 current=null;
 $("episodeStudio").hidden=true;$("jj2Browse").hidden=false;
 document.querySelector('[data-studio-page="deepdives"]').classList.remove("studio-editing");
 $("jj2Notice").textContent="Choose an episode to open its Objective & Story Flow Studio.";
 window.scrollTo({top:0,behavior:"smooth"});
}
function setup(){
 if(!$("episodeStudio"))return;
 document.querySelectorAll("[data-episode-field]").forEach(input=>input.addEventListener("input",markDirty));
 $("episodeSoloRole").addEventListener("change",()=>{
  if(!current||current.mode!=="individual")return;
  const copy=collect();copy.soloCoach=$("episodeSoloRole").value;
  copy.checkpoints=copy.checkpoints.map(p=>p.audience==="none"||p.audience===copy.soloCoach?p:
   {...p,audience:"none",waitForReply:false});
  current.studio=copy;renderStoryboard();populate();markDirty();
  note("Solo coach updated. Interventions for the other role were disabled.");
 });
 $("episodePrimary").addEventListener("change",()=>{
  if(!current)return;
  current.studio.primarySkill=$("episodePrimary").value;
  current.studio.supportingSkills=current.studio.supportingSkills.filter(x=>x!==current.studio.primarySkill);
  markDirty();paintSkills();paintSupports();
 });
 $("episodeLaunchPilot").addEventListener("click",pilotEpisode);
 $("episodePilotClose").addEventListener("click",closePilot);
 $("episodeCopyHusband").addEventListener("click",()=>copyPilot("jack"));
 $("episodeCopyWife").addEventListener("click",()=>copyPilot("jill"));
 $("episodeGenerate").addEventListener("click",generate);
 $("episodeSave").addEventListener("click",save);
 $("episodeValidate").addEventListener("click",()=>{
  if(!current)return;renderReadiness();note("Readiness reviewed in the right column. The five intervention slots remain optional.");
 });
 $("episodeBack").addEventListener("click",back);
 $("episodeAddHumor").addEventListener("click",()=>{
  const area=field("humorNotes");area.value=area.value.trimEnd()+(area.value.trim()?"\n":"");
  markDirty();area.focus();area.setSelectionRange(area.value.length,area.value.length);
 });
 document.addEventListener("anthos-episode-open",event=>{
  if(event.detail?.id)openEditor(event.detail.id,event.detail.petal,event.detail.mode);
 });
 window.addEventListener("beforeunload",event=>{
  if(current?.dirty){event.preventDefault();event.returnValue="";}
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);
else setup();
})();