(()=>{
"use strict";
const $=id=>document.getElementById(id);
const el=(tag,className="",value)=>{const e=document.createElement(tag);e.className=className;if(value!==undefined)e.textContent=String(value);return e};
let library=null,loaded=false,activeId=null;
const notice=t=>{$("jj2Notice").textContent=t};
async function load(){
 notice("Loading the Anthos 4.0 episode library…");
 try{
  const r=await fetch("/api/admin?view=jj2-library",{credentials:"same-origin",cache:"no-store"});
  const result=await r.json();if(!r.ok||!result.ok)throw Error(result.error||"Could not load library.");
  library=result;loaded=true;
  const select=$("jj2Petal"),old=select.value;select.replaceChildren();
  const all=el("option","","All 12 petals");all.value="";select.append(all);
  for(const p of library.petals){const option=el("option","",p.name);option.value=p.slug;select.append(option)}
  select.value=old;
  $("jj2Controls").hidden=false;
  draw();
  document.dispatchEvent(new CustomEvent("anthos-episode-library",{detail:{scenarios:library.scenarios,petals:library.petals}}));
 }catch(error){notice(error.message)}
}
function filtered(){
 const p=$("jj2Petal").value,m=$("jj2Mode").value,s=$("jj2Status").value,q=$("jj2Search").value.toLowerCase().trim();
 return library.scenarios.filter(x=>(!p||x.petal_slug===p)&&(!m||x.mode===m)&&(!s||x.status===s)&&
  (!q||[x.title,x.opening_scene,x.learning_objective,library.petals.find(y=>y.slug===x.petal_slug)?.name].join(" ").toLowerCase().includes(q)));
}
function draw(){
 if(!library)return;
 for(const [id,key] of [["jj2CountTotal","total"],["jj2CountShared","shared"],["jj2CountIndividual","individual"],["jj2CountReady","beta_ready"]])$(id).textContent=library.counts[key];
 const grid=$("jj2PetalGrid");grid.replaceChildren();
 for(const p of library.petals){
  const subset=library.scenarios.filter(x=>x.petal_slug===p.slug),button=el("button","jj2-petal"+($("jj2Petal").value===p.slug?" active":""));
  button.type="button";
  button.append(el("strong","",String(p.sort_order).padStart(2,"0")+" · "+p.name),
   el("small","",subset.filter(x=>x.mode==="shared").length+" shared · "+subset.filter(x=>x.mode==="individual").length+" individual"));
  button.addEventListener("click",()=>{$("jj2Petal").value=$("jj2Petal").value===p.slug?"":p.slug;draw()});grid.append(button);
 }
 const shown=filtered(),list=$("jj2ScenarioList");list.replaceChildren();
 if(!shown.length)list.append(el("p","jj2-empty","No scenarios match the filters."));
 for(const item of shown){
  const row=el("article","jj2-item"),body=el("div"),top=el("div");
  top.append(el("span","jj2-tag "+item.mode,item.mode==="shared"?"Shared":"Individual"),el("span","jj2-tag",item.status.replace("_"," ")));
  const petal=library.petals.find(x=>x.slug===item.petal_slug)?.name||item.petal_slug;
  body.append(top,el("strong","",item.title),el("p","",item.opening_scene),el("small","",petal+" · "+item.learning_objective));
  const open=el("button","button","Open Episode Studio");open.type="button";
  open.addEventListener("click",()=>{
   activeId=item.id;
   document.dispatchEvent(new CustomEvent("anthos-episode-open",{detail:{id:activeId,petal,mode:item.mode}}));
  });
  row.append(body,open);list.append(row);
 }
 notice("Showing "+shown.length+" of "+library.scenarios.length+" scenarios. Anthos 4.0 editorial drafting is isolated from existing pilot rooms.");
}
function setup(){
 if(!$("jj2Library"))return;
 for(const id of ["jj2Petal","jj2Mode","jj2Status"])$(id).addEventListener("change",draw);
 $("jj2Search").addEventListener("input",draw);
 $("jj2Refresh").addEventListener("click",load);
 document.querySelectorAll('[data-studio-tab="deepdives"]').forEach(b=>b.addEventListener("click",()=>{if(!loaded)load()}));
 document.addEventListener("threefold-auth",e=>{if(e.detail?.authenticated&&!loaded)load()});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();