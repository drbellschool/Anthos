// Anthos 4.0 — one compact, objective-driven storyboard with optional private check-ins.
// Editorial design only: no outgoing SMS and no automatic 3.x pilot launch.
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const node=(tag,cls="",value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
const PHASE_IDS=["hook","conflict","discovery","reattempt","outcome","reflection"];
const CHECKPOINT_IDS=PHASE_IDS.slice(0,-1);
const FOUNDATION_FIELDS=["learningObjective","jackExample","jillExample"];
const SCENE_FIELDS=["sceneSetting","sceneStress","sceneTrigger","toneElement","premise","jackMotivation","jillMotivation","boundaries","creativeDirection"];
let current=null,researcher="Gottman",busy=false,opening=false;
let pilot=null,pilotPlayers=[];
const initiallyDrafted=new Set();
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
 s.toneApproach=$("episodeToneApproach").value;s.toneIntensity=Number($("episodeIntensity").value);
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
function paintSelectedSkills(){
 const box=$("episodeSelectedSkills");if(!box||!current)return;box.replaceChildren();
 const selected=[{id:current.studio.primarySkill,label:"Primary skill"},...Array.from({length:2},(_,i)=>({id:current.studio.supportingSkills[i],label:"Supporting "+(i+1)}))];
 for(const item of selected){
  const skill=current.skills.find(s=>s.id===item.id);
  const card=node("div","episode-selected-card "+(skill?.researcher?.toLowerCase()||"empty")+(item.label==="Primary skill"?" primary":""));
  card.draggable=!!skill;card.dataset.skillId=skill?.id||"";card.append(node("span","episode-drag-handle",skill?"⠿":""),node("span","episode-skill-rank",skill?String(selected.indexOf(item)+1):"+"));const detail=node("span","episode-skill-detail");detail.append(node("small","",item.label+(skill?" · "+skill.researcher:"")),node("strong","",skill?.title||(item.label==="Primary skill"?"Choose a primary skill":"+ Optional skill")));if(skill?.description)detail.append(node("small","episode-selected-description",skill.description));card.append(detail);
  if(skill){card.addEventListener("dragstart",e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",skill.id)});card.addEventListener("dragover",e=>e.preventDefault());card.addEventListener("drop",e=>{e.preventDefault();const from=e.dataTransfer.getData("text/plain");const order=[current.studio.primarySkill,...current.studio.supportingSkills].filter(Boolean);const start=order.indexOf(from),target=order.indexOf(skill.id);if(start<0||target<0||start===target)return;order.splice(start,1);order.splice(target,0,from);current.studio.primarySkill=order[0];current.studio.supportingSkills=order.slice(1);$("episodePrimary").value=order[0];markDirty();paintSkills();paintSupports();});}
  if(skill){const remove=node("button","episode-selected-remove","×");remove.type="button";remove.title="Remove "+skill.title;remove.setAttribute("aria-label","Remove "+skill.title);
   remove.addEventListener("click",()=>{if(item.label==="Primary skill"){current.studio.primarySkill="";$("episodePrimary").value="";}else current.studio.supportingSkills=current.studio.supportingSkills.filter(id=>id!==skill.id);markDirty();paintSkills();paintSupports();});card.append(remove);}
  box.append(card);
 }
}
function paintSupports(){
 paintSelectedSkills();
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
  pick.type="button";pick.setAttribute("aria-pressed",String(isPrimary||isSupporting));
  pick.setAttribute("aria-label",(isPrimary||isSupporting?"Remove selected skill: ":"Select skill: ")+skill.title);
  pick.title=isPrimary||isSupporting?"Remove selected skill":"Select as primary or supporting skill";
  pick.addEventListener("click",()=>{
   if(isPrimary){current.studio.primarySkill=current.studio.supportingSkills.shift()||"";}
   else if(isSupporting){current.studio.supportingSkills=current.studio.supportingSkills.filter(x=>x!==skill.id);}
   else if(!current.studio.primarySkill){current.studio.primarySkill=skill.id;}
   else if(current.studio.supportingSkills.length<2){current.studio.supportingSkills.push(skill.id);}
   else{note("Select up to three skills. Remove one before adding another.",true);return;}
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
  const row=node("article","episode-phase-row");const fold=node("details","episode-phase-fold");if(index===0)fold.open=true;
  const title=node("summary","episode-phase-head");
  title.append(node("span","episode-phase-number",index+1),node("strong","",p.title));
  const body=node("div");
  body.append(node("small","",p.hint));
  const summary=node("textarea");
  summary.dataset.episodePhase=p.id;summary.maxLength=850;summary.rows=2;
  summary.placeholder="AI-drafted story objective and consequence; no scripted texts.";
  summary.setAttribute("aria-label",p.title+" story summary");
  summary.addEventListener("input",markDirty);
  body.append(summary);fold.append(title,body);row.append(fold);root.append(row);
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
  card.append(header,top,detail,empty);fold.append(card);
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
 const status=$("episodeStatusLabel");if(status)status.textContent=(current.status||"draft").replaceAll("_"," ");
 for(const badge of document.querySelectorAll("[data-mode-choice]")){const selected=badge.dataset.modeChoice===(current.mode==="shared"?"shared":s.soloCoach||"jack");badge.classList.toggle("active",selected);badge.setAttribute("aria-pressed",String(selected))}
 $("episodeModeBanner").textContent=current.mode==="shared"?"👥 Couple episode · Sophia introduces both clients; Jack and Jill coach privately.":"👤 Individual episode · Sophia introduces the participating client; private check-ins stay single-recipient.";
 $("episodeToneApproach").value=s.toneApproach||"balanced";$("episodeIntensity").value=s.toneIntensity||3;$("episodeIntensityValue").textContent=$("episodeIntensity").value+" / 5";
 $("episodeFoundationLock").textContent=FOUNDATION_FIELDS.every(k=>(s.locks||[]).includes(k))?"🔓 Unlock foundation":"✓ Approve & lock foundation";
 $("episodeSceneLock").textContent=SCENE_FIELDS.every(k=>(s.locks||[]).includes(k))?"🔓 Unlock scene and tone":"✓ Approve & lock scene and tone";
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
 const headline=$("episodeReadinessHeadline");if(headline)headline.textContent=n+" / "+checks.length+" checks complete · "+(current.mode==="shared"?"Couple":"Individual")+" episode";
 for(const [label,passed] of checks){
  const row=node("div","episode-check"+(passed?" ok":""));
  row.append(node("span","",passed?"✓":"○"),node("span","",label));box.append(row);
 }
 const active=collect().checkpoints.filter(x=>x.audience!=="none").length;
 box.append(node("p","episode-editorial-note",active+" of 5 optional check-ins assigned."));
}
function closePilot(clearRoom=false){
 for(const instance of pilotPlayers)instance?.destroy();
 pilotPlayers=[];
 if(clearRoom)pilot=null;
 const board=$("episodePilotBoard");if(board)board.hidden=true;
}
async function pilotEpisode(reset=false){
 if(!current||busy)return;
 if(current.dirty||!current.hasSaved){
  note("Save your episode first. The pilot uses a snapshot of the last saved six-phase flow and humor.",true);
  return;
 }
 if(!window.Anthos4Player){note("Pilot player failed to load. Refresh the admin page.",true);return}
 if(pilot&&(!confirm("Start a fresh 4.0 test using your SAVED episode edits? The previous husband and wife invitation links will be retired. Its messages remain archived.")))return;
 setBusy(true);$("episodeLaunchPilot").disabled=true;$("episodePilotReset").disabled=true;
 note("Creating a new, private 4.0 episode rehearsal…");
 try{
  const previousRoomId=pilot?.roomId||null;
  const room=await request("episode-studio-pilot-v4",{
   scenarioId:current.id,previousRoomId
  });
  closePilot();
  pilot=room;
  const board=$("episodePilotBoard");
  board.hidden=false;
  const plan=$("episodePilotPlan");
  plan.replaceChildren();
  const snapshot=collect();
  for(const [index,phase] of current.phases.entries()){
   const row=node("li","episode-pilot-plan-item");
   row.append(node("strong","",phase.title+" — "));
   row.append(node("span","",snapshot.phases?.[phase.id]||"No summary saved."));
   if(index<5){
    const cp=snapshot.checkpoints.find(x=>x.afterPhase===phase.id);
    const role=cp?.audience==="both"?"Both private coaches":
      cp?.audience==="jack"?"Jack → husband":cp?.audience==="jill"?"Jill → wife":"No intervention";
    row.append(node("small","",role+" · "+(cp?.purpose||"Story continues")));
   }
   plan.append(row);
  }
  const jack=$("episodeHusbandLink"),jill=$("episodeWifeLink");
  const isSolo=room.mode==="individual";
  jack.parentElement.hidden=!room.invitations.jack;jill.parentElement.hidden=!room.invitations.jill;
  if(room.invitations.jack)jack.href=room.invitations.jack;
  if(room.invitations.jill)jill.href=room.invitations.jill;
  $("episodePilotBoard").querySelector(".episode-pilot-heading h4").textContent=isSolo?"Test this individual episode":"Test this episode with both coaches";
  $("episodePilotStatus").textContent=
   (previousRoomId?(room.previousRetired===true?"Previous test archived and its links retired. ":"New room created, but old invitations may still be valid. "):"")+
   "Fresh "+room.engine+" "+(isSolo?"single-coach":"two-coach")+" private test uses your latest SAVED six-phase plan. "+
   "Each private coach starts at Hook; no SMS is sent. Invitations expire "+new Date(room.expiresAt).toLocaleDateString()+".";
  const husbandPanel=$("episodeHusbandPlayer"),wifePanel=$("episodeWifePlayer");
  husbandPanel.hidden=!room.invitations.jack;wifePanel.hidden=!room.invitations.jill;
  pilotPlayers=[];
  if(room.invitations.jack)pilotPlayers.push(window.Anthos4Player.mount(husbandPanel,new URL(room.invitations.jack).searchParams.get("invite")));
  if(room.invitations.jill)pilotPlayers.push(window.Anthos4Player.mount(wifePanel,new URL(room.invitations.jill).searchParams.get("invite")));
  board.scrollIntoView({behavior:"smooth",block:"start"});
  note("Version 4.0 test room created. Both private coach panels are ready below.");
 }catch(e){note(e.message,true)}
 finally{setBusy(false);$("episodeLaunchPilot").disabled=false;$("episodePilotReset").disabled=false}
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
 closePilot(true);
 const studio=$("episodeStudio");
 studio.hidden=false;$("jj2Browse").hidden=true;
 document.querySelector('[data-studio-page="deepdives"]').classList.add("studio-editing");
 $("episodeStudioTitle").textContent="Loading episode…";note("Loading objectives and story flow…");
 try{
  const data=await request(null,{id});
  current={id,petal:data.scenario.petal_slug||petal,mode:data.scenario.mode||mode,status:data.scenario.status||"draft",studio:data.studio,skills:data.skills,skillUsage:data.skillUsage||{},phases:data.phases,
   version:data.scenario.content_version,hasSaved:data.scenario.episode_saved,dirty:false};
  renderStoryboard();
  const select=$("episodePrimary");select.replaceChildren();
  const blank=node("option","","Choose a relationship objective");blank.value="";select.append(blank);
  for(const skill of current.skills){const o=node("option","",skill.researcher+" · "+skill.title);o.value=skill.id;select.append(o)}
  populate();
  if($("episodeStudioPetal"))$("episodeStudioPetal").value=current.petal;
  document.dispatchEvent(new CustomEvent("anthos-episode-selected",{detail:{id:current.id,petal:current.petal}}));
  if($("episodeStudioPicker"))$("episodeStudioPicker").value=String(id);
  try{localStorage.setItem("anthos.studio.lastEpisodeId",String(id))}catch{}
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
 closePilot(true);
 current=null;
 $("episodeStudio").hidden=true;$("jj2Browse").hidden=false;
 document.querySelector('[data-studio-page="deepdives"]').classList.remove("studio-editing");
 $("jj2Notice").textContent="Choose an episode to open its Objective & Story Flow Studio.";
 window.scrollTo({top:0,behavior:"smooth"});
}
async function generateProblem(){
 if(!current||busy)return;
 const input=field("learningObjective");
 if(collect().locks.includes("learningObjective")){note("Unlock the problem statement before AI drafting.",true);return;}
 if(!collect().primarySkill){note("Choose a primary skill first.",true);return;}
 const before=collect();setBusy(true);$("episodeProblemGenerate").disabled=true;
 note("Drafting the episode problem statement from the selected skills and existing storyline…");
 try{
  const skills=[before.primarySkill,...before.supportingSkills].map(id=>current.skills.find(s=>s.id===id)).filter(Boolean).map(s=>s.researcher+": "+s.title);
  const direction=[before.creativeDirection,"Write a concrete relationship PROBLEM STATEMENT, not a solution or practice instruction, in learningObjective. Preserve the episode title, premise, original storyline, characters and locked direction. Center the tension on: "+skills.join("; ")].filter(Boolean).join("\n");
  const result=await request("episode-studio-generate",{id:current.id,direction,studio:before});
  const candidate=result.studio?.learningObjective?.trim();
  if(!candidate||candidate.length<12)throw Error("AI did not return a usable problem statement.");
  input.value=candidate.slice(0,450);markDirty();
  note("Problem statement drafted; all other fields remain unchanged. Review and save when ready.");
 }catch(error){note(error.message,true)}finally{setBusy(false);$("episodeProblemGenerate").disabled=false;}
}
async function draftOnly(targets,direction){
 if(!current||busy)return;
 const before=collect();const editable=targets.filter(t=>!before.locks.includes(t));if(!editable.length){note("All requested fields are locked. Unlock a field to draft it.",true);return;}
 setBusy(true);
 try{
  const data=await request("episode-studio-generate",{id:current.id,direction,studio:before});
  for(const key of editable){const value=data.studio[key];if(typeof value==="string")field(key).value=value;}
  markDirty();note("AI draft applied only to the requested unlocked fields. Review and save when ready.");
 }catch(e){note(e.message,true)}finally{setBusy(false)}
}
function toggleEditorialLock(fields,button,lockedLabel,unlockedLabel){
 if(!current)return;
 const locks=new Set(collect().locks),all=fields.every(k=>locks.has(k));
 for(const k of fields)all?locks.delete(k):locks.add(k);
 current.studio.locks=[...locks];paintLocks();markDirty();button.textContent=all?unlockedLabel:lockedLabel;
}
function setup(){
 if(!$("episodeStudio"))return;
 // Keep the long-form metadata and character motivations available without pushing the six phases below the fold.
 const basics=document.querySelector(".episode-basics"),scene=document.querySelector(".episode-scene-grid");
 const intro=document.querySelector(".episode-intro"),flow=document.querySelector(".episode-flow-heading");
 flow.after(intro);
 const metaFold=document.createElement("details");metaFold.className="episode-more episode-metadata-fold";
 const metaHeading=document.createElement("summary");metaHeading.textContent="Episode metadata, premise & character motivations";
 metaFold.append(metaHeading);basics.parentNode.removeChild(basics);metaFold.append(basics);scene.after(metaFold);
 // Keep every existing creative/research/readiness field but place it in the wider story column.
 const creative=document.querySelector(".episode-humor");
 const destination=document.createElement("details");destination.className="episode-more episode-creative-fold";
 const heading=document.createElement("summary");heading.textContent="Creative voice, research & episode readiness";
 destination.append(heading);creative.parentNode.removeChild(creative);destination.append(creative);
 document.querySelector(".episode-story").append(destination);
 // Sideways panel navigation: move the existing controls rather than duplicating
 // them, preserving field bindings, editorial locks, and pilot handlers.
 const studio=$("episodeStudio"),layout=studio.querySelector(".episode-layout");
 const rail=studio.querySelector(".episode-workflow");
 const readiness=creative.querySelector("#episodeReadiness");
 const readinessHost=document.createElement("div");
 readinessHost.className="episode-readiness-rail";
 const readinessTitle=document.createElement("strong");readinessTitle.textContent="◎ Episode Goals & Readiness";
 readinessHost.append(readinessTitle,readiness);
 rail.before(readinessHost);
 const nav=document.createElement("nav");nav.className="episode-side-nav";nav.setAttribute("aria-label","Episode editorial panels");
 const stage=document.createElement("div");stage.className="episode-panel-stage";
 const panelSpecs=[
  ["1-1","Relationship Foundation","foundation"],
  ["1-2","Scene, Setting & Situation","scene"],
  ["1-3","Episode Metadata, Premise & Motivations","metadata"],
  ["1-4","Creative Voice","voice"],
  ["2-1","Six-Phase Story Flow","flow"],
  ["3-1","Ending & Reflection Guardrails","ending"]
 ];
 const panels={};
 for(const [number,title,key] of panelSpecs){
  const button=document.createElement("button");button.type="button";button.className="episode-side-tab";button.dataset.panel=key;
  button.innerHTML='<span class="episode-side-number">'+number+'</span><span class="episode-side-label"></span><span aria-hidden="true">›</span>';
  button.querySelector(".episode-side-label").textContent=title;nav.append(button);
  const panel=document.createElement("section");panel.className="episode-side-panel";panel.dataset.panel=key;
  const heading=document.createElement("header");heading.className="episode-side-heading";
  const headingText=document.createElement("h4");headingText.textContent=number+" · "+title;heading.append(headingText);
  panel.append(heading);stage.append(panel);panels[key]=panel;
  button.addEventListener("click",()=>{
   for(const item of nav.querySelectorAll("button")){const selected=item===button;item.classList.toggle("active",selected);item.setAttribute("aria-current",selected?"step":"false");}
   for(const item of stage.children)item.hidden=item!==panel;
   stage.scrollTop=0;
  });
 }
 layout.append(nav,stage);
 const foundation=document.querySelector(".episode-objectives");
 panels.foundation.append(...Array.from(foundation.children).filter(x=>!x.classList.contains("episode-pane-header")));
 panels.scene.append(scene,document.querySelector(".episode-scene-approval"));
 for(const section of scene.querySelectorAll("details"))section.open=true;
 metaFold.open=true;panels.metadata.append(metaFold);
 const mode=document.querySelector(".episode-design-top");
 panels.metadata.insertBefore(mode,metaFold);
 const voiceFields=Array.from(creative.children).filter(x=>!x.classList.contains("episode-pane-header"));
 panels.voice.append(...voiceFields);
 const flowHeading=document.querySelector(".episode-flow-heading"),flowActions=document.querySelector(".episode-flow-actions"),phases=$("episodePhases");
 panels.flow.append(intro,flowHeading,flowActions,phases);
 const ending=document.querySelector(".episode-final-notes");ending.open=true;
 panels.ending.append(ending);
 // Move the scene/flow draft actions to their corresponding panels.
 const sceneDraft=$("episodeSceneDraft"),sceneLock=$("episodeSceneLock"),flowDraft=$("episodeFlowDraft");
 panels.scene.append(sceneDraft,sceneLock);panels.flow.append(flowDraft);
 // Retain all legacy fields in their new panels; no cloneNode.
 for(const old of Array.from(layout.children))if(old!==nav&&old!==stage)old.remove();
 nav.querySelector("button").click();

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
 $("episodeLaunchPilot").addEventListener("click",()=>pilotEpisode(false));
 $("episodePilotReset").addEventListener("click",()=>pilotEpisode(true));
 $("episodePilotClose").addEventListener("click",()=>closePilot(false));
 $("episodeCopyHusband").addEventListener("click",()=>copyPilot("jack"));
 $("episodeCopyWife").addEventListener("click",()=>copyPilot("jill"));
 $("episodeGenerate").addEventListener("click",generate);
 $("episodeIntroDraft").addEventListener("click",()=>draftOnly(["sophiaIntro"],"Write a lively, SHORT Sophia message to the actual clients using literal <<husband>> and <<wife>> tokens in shared episodes (only the applicable token in solo episodes). This message is delivered after scene preparation but before Jack or Jill contacts their coach. Introduce Jack and Jill as characters, describe a vivid awkward moment, and define emotional bid plainly as a little attempt to connect, such as asking to sit together. Avoid academic jargon and bullet points."));
 $("episodeExamplesDraft").addEventListener("click",()=>draftOnly(["jackExample","jillExample"],"Write short, distinct, believable Jack and Jill examples as lived moments: physical action, specific household detail, an awkward misunderstanding and a consequential reaction. No therapy-speak, no skill names, no academic descriptions. Respect boundaries and original premise."));
 $("episodeFoundationLock").addEventListener("click",()=>toggleEditorialLock(FOUNDATION_FIELDS,$("episodeFoundationLock"),"🔓 Unlock foundation","✓ Approve & lock foundation"));
 $("episodeSceneLock").addEventListener("click",()=>toggleEditorialLock(SCENE_FIELDS,$("episodeSceneLock"),"🔓 Unlock scene and tone","✓ Approve & lock scene and tone"));
 $("episodeSceneDraft").addEventListener("click",()=>draftOnly(["sceneSetting","sceneStress","sceneTrigger","toneElement","premise","jackMotivation","jillMotivation","boundaries","creativeDirection"],"Fill all UNLOCKED scene and episode-detail fields with grounded specific circumstances, objects, time, place, pressure and a triggering event. Keep locked canon. Make Jack and Jill flawed and believable; choose humor only when tone supports it. Write plain human language, not research jargon. Preserve title and relationship problem."));
 $("episodeFlowDraft").addEventListener("click",()=>{if(!current)return;const s=collect();if(!FOUNDATION_FIELDS.every(k=>s.locks.includes(k))||!SCENE_FIELDS.every(k=>s.locks.includes(k))){note("Approve and lock the foundation and scene before generating the story flow.",true);return;}generate();});
 $("episodeToneApproach").addEventListener("change",markDirty);$("episodeIntensity").addEventListener("input",()=>{$("episodeIntensityValue").textContent=$("episodeIntensity").value+" / 5";markDirty();});
  $("episodeExpandAll").addEventListener("click",()=>document.querySelectorAll(".episode-phase-fold").forEach(x=>x.open=true));
  $("episodeCollapseAll").addEventListener("click",()=>document.querySelectorAll(".episode-phase-fold").forEach(x=>x.open=false));
  $("episodeProblemGenerate").addEventListener("click",generateProblem);
 $("episodeSave").addEventListener("click",save);
 $("episodeValidate").addEventListener("click",()=>{
  if(!current)return;renderReadiness();note("Readiness reviewed in the right column. The five intervention slots remain optional.");
 });
 $("episodeBack").addEventListener("click",back);
 const picker=$("episodeStudioPicker"),petalPicker=$("episodeStudioPetal");
 let catalog=[];
 const refreshEpisodeOptions=()=>{
  const previous=picker.value;picker.replaceChildren(new Option("Select an episode…",""));
  const matching=catalog.filter(item=>!petalPicker.value||item.petal_slug===petalPicker.value);
  for(const item of matching){const opt=new Option(item.title+" · "+(item.mode==="shared"?"Couple":"Individual"),item.id);opt.dataset.petal=item.petal_slug;opt.dataset.mode=item.mode;picker.append(opt)}
  if(matching.some(item=>String(item.id)===previous))picker.value=previous;
  else if(current&&matching.some(item=>String(item.id)===String(current.id)))picker.value=String(current.id);
 };
 document.addEventListener("anthos-episode-library",event=>{
  catalog=event.detail?.scenarios||[];
  const previousPetal=petalPicker.value;petalPicker.replaceChildren(new Option("All petals",""));
  for(const petal of event.detail?.petals||[]){const opt=new Option(petal.name,petal.slug);petalPicker.append(opt)}
  petalPicker.value=previousPetal;
  refreshEpisodeOptions();
 });
 petalPicker.addEventListener("change",refreshEpisodeOptions);
 picker.addEventListener("change",()=>{
  const opt=picker.selectedOptions[0];if(!picker.value)return;
  openEditor(picker.value,opt.dataset.petal,opt.dataset.mode);
 });
 document.querySelectorAll('[data-studio-tab="deepdives"]').forEach(button=>button.addEventListener("click",()=>{
  studio.hidden=false;$("jj2Browse").hidden=true;
  document.querySelector('[data-studio-page="deepdives"]').classList.add("studio-editing");
  if(!current){$("episodeStudioTitle").textContent="Deep Dive Episode Studio";note("Choose an episode above to begin editing.");}
 }));

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