(()=>{
"use strict";
const $=id=>document.getElementById(id);
const node=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=String(text);return e};
let library=null,chosen=null,loaded=false;
const info=t=>{$("jj2Notice").textContent=t};
async function api(action,data={}){
 const url=action?"/api/admin":"/api/admin?view=jj2-library";
 const res=await fetch(url,{method:action?"POST":"GET",credentials:"same-origin",cache:"no-store",
  headers:action?{"Content-Type":"application/json","x-threefold-admin":"1"}:{},
  ...(action?{body:JSON.stringify({action,...data})}:{})});
 const out=await res.json().catch(()=>({error:"Invalid server response"}));
 if(!res.ok||!out.ok)throw Error(out.error||"Library request failed");
 return out;
}
function filters(){
 const petal=$("jj2Petal").value,mode=$("jj2Mode").value,status=$("jj2Status").value,q=$("jj2Search").value.trim().toLowerCase();
 return library.scenarios.filter(x=>(!petal||x.petal_slug===petal)&&(!mode||x.mode===mode)&&(!status||x.status===status)&&
  (!q||[x.title,x.opening_scene,x.learning_objective,library.petals.find(p=>p.slug===x.petal_slug)?.name].join(" ").toLowerCase().includes(q)));
}
function petalName(slug){return library.petals.find(p=>p.slug===slug)?.name||slug}
function render(){
 if(!library)return;
 const n=library.counts;$("jj2CountTotal").textContent=n.total;$("jj2CountShared").textContent=n.shared;
 $("jj2CountIndividual").textContent=n.individual;$("jj2CountReady").textContent=n.beta_ready;
 const grid=$("jj2PetalGrid");grid.replaceChildren();
 for(const p of library.petals){
  const subset=library.scenarios.filter(s=>s.petal_slug===p.slug);
  const card=node("button","jj2-petal"+($("jj2Petal").value===p.slug?" active":""),"");
  card.type="button";card.append(node("strong","",String(p.sort_order).padStart(2,"0")+" · "+p.name),node("small","",subset.filter(x=>x.mode==="shared").length+" shared · "+subset.filter(x=>x.mode==="individual").length+" individual"));
  card.addEventListener("click",()=>{$("jj2Petal").value=$("jj2Petal").value===p.slug?"":p.slug;render()});
  grid.append(card);
 }
 const shown=filters(),list=$("jj2ScenarioList");list.replaceChildren();
 if(!shown.length)list.append(node("p","jj2-empty","No scenarios match these filters."));
 for(const item of shown){
  const article=node("article","jj2-item"),body=node("div");
  const top=node("div");top.append(node("span","jj2-tag "+item.mode,item.mode==="shared"?"Two coaches":"Individual"));
  top.append(node("span","jj2-tag"+(item.status==="beta_ready"?" ready":""),item.status.replace("_"," ")));
  body.append(top,node("strong","",item.title),node("p","",item.opening_scene),node("small","",petalName(item.petal_slug)+" · "+item.learning_objective));
  const button=node("button","button","Review / Trial");button.type="button";button.addEventListener("click",()=>edit(item.id));
  article.append(body,button);list.append(article);
 }
 info("Showing "+shown.length+" of "+library.scenarios.length+" scenarios · All entries are curriculum seeds until reviewed for beta.");
}
function edit(id){
 chosen=library.scenarios.find(x=>x.id===id);if(!chosen)return;
 $("jj2Editor").hidden=false;$("jj2PilotLinks").hidden=true;
 $("jj2SoloRoleLabel").hidden=chosen.mode!=="individual";
 $("jj2EditorTitle").textContent=chosen.title;
 $("jj2EditorMeta").textContent=petalName(chosen.petal_slug)+" · "+(chosen.mode==="shared"?"Two-person shared adventure":"One-person private adventure")+" · Slot "+chosen.slot+" · version "+chosen.content_version;
 $("jj2EditTitle").value=chosen.title;$("jj2EditOpening").value=chosen.opening_scene;
 $("jj2EditObjective").value=chosen.learning_objective;$("jj2EditStatus").value=chosen.status;
 $("jj2Editor").scrollIntoView({behavior:"smooth",block:"start"});
}
async function reload(){
 info("Loading the 12 petals…");
 try{
  library=await api();
  const prior=$("jj2Petal").value,select=$("jj2Petal");select.replaceChildren(node("option","","All 12 petals"));select.firstChild.value="";
  for(const p of library.petals){const opt=node("option","",p.name);opt.value=p.slug;select.append(opt)}
  select.value=prior;
  $("jj2Controls").hidden=false;loaded=true;
  render();
 }catch(e){info(e.message);$("jj2Controls").hidden=true}
}
async function save(){
 if(!chosen)return;
 $("jj2Save").disabled=true;info("Saving editorial changes…");
 try{
  const output=await api("jj2-scenario-save",{id:chosen.id,content_version:chosen.content_version,
    title:$("jj2EditTitle").value,opening_scene:$("jj2EditOpening").value,
    learning_objective:$("jj2EditObjective").value,status:$("jj2EditStatus").value});
  const ix=library.scenarios.findIndex(x=>x.id===chosen.id);library.scenarios[ix]=output.scenario;
  chosen=output.scenario;
  library.counts.beta_ready=library.scenarios.filter(s=>s.status==="beta_ready").length;
  library.counts.draft=library.scenarios.filter(s=>s.status==="draft").length;
  $("jj2EditorMeta").textContent=petalName(chosen.petal_slug)+" · "+chosen.mode+" · version "+chosen.content_version;
  render();info("Saved "+chosen.title+" (version "+chosen.content_version+").");
 }catch(e){info(e.message)}finally{$("jj2Save").disabled=false}
}
async function trial(){
 if(!chosen)return;
 if(["draft","retired"].includes(chosen.status)&&!confirm("This scenario is still "+chosen.status+". Create a private internal pilot anyway? No customer content will be published."))return;
 $("jj2Try").disabled=true;info("Creating isolated test room…");
 try{
  const output=await api("pilot-create-jack-jill",{scenarioId:chosen.id,soloRole:$("jj2SoloRole").value});
  $("jj2PilotA").value=output.invitations.a;
  $("jj2PilotB").value=output.invitations.b||"";
  $("jj2PilotBLabel").hidden=!output.invitations.b;$("jj2CopyB").hidden=!output.invitations.b;
  $("jj2PilotLinks").hidden=false;
  info("New "+chosen.mode+" room created. Copy the private invitation"+(chosen.mode==="shared"?"s":"")+".");
 }catch(e){info(e.message)}finally{$("jj2Try").disabled=false}
}
function setup(){
 if(!$("jj2Library"))return;
 for(const id of ["jj2Petal","jj2Mode","jj2Status"])$(id).addEventListener("change",render);
 $("jj2Search").addEventListener("input",()=>{if(library)render()});
 $("jj2Refresh").addEventListener("click",reload);
 $("jj2EditorClose").addEventListener("click",()=>{$("jj2Editor").hidden=true;chosen=null});
 $("jj2Save").addEventListener("click",save);
 $("jj2Try").addEventListener("click",trial);
 for(const suffix of ["A","B"])$("jj2Copy"+suffix).addEventListener("click",async()=>{
  const input=$("jj2Pilot"+suffix);try{await navigator.clipboard.writeText(input.value);info("Invitation copied.")}
  catch{input.select();info("Clipboard unavailable; select and copy the link.");}
 });
 document.querySelectorAll('[data-studio-tab="deepdives"]').forEach(b=>b.addEventListener("click",()=>{if(!loaded&&!$("dashboard").hidden)reload()}));
 document.addEventListener("threefold-auth",event=>{if(event.detail?.authenticated&&!loaded&&location.hash==="#deepdives")reload()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();