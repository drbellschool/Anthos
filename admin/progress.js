(() => {
"use strict";
// Curated development snapshot, not live GitHub data.
const tasks=[
["A","Repository and admin access","verified","Code and admin access confirmed.","Review session security.",4],
["A","Supabase data and privacy","audit","Schema, consent and permissions need verification.","Audit RLS and per-spouse access.",4],
["A","Telnyx and messaging","audit","Real SMS integration requires end-to-end verification.","Confirm carrier status, webhooks and opt-outs.",4],
["A","Cost telemetry","planned","Per-couple usage tracking for SMS, AI and images.","Specify cost events and admin charts.",4],
["B","Sophia and Paraclete","designed","Companion coaching and concierge handoff.","Implement shared context and privacy rules.",4],
["B","Monthly journey: survey → team dive → solo dive → adventure","designing","New local-only /journey/ prototype follows the monthly cadence. No live spouse accounts, SMS or concierge booking.","Test prototype, then connect individually authenticated couples and consent boundaries.",31],
["B","Live interactive eight-chapter Team Deep Dive beta","designing","Compact shared dialogue, Sophia responding across fresh exchanges, two-spouse readiness before AI story consequences, responsive branching scenes and private beta comments. Automated checks pass; real couple QA for conversation pacing and readiness is pending.","Pilot repeated Sophia replies and both-spouse ready/keep-talking flow; review whether dialogue feels natural and consent remains clear.",31],
["B","Team Deep Dive and personality discovery","designing","Real pilot captures a shared conversation, but structured relationship insights and Paraclete handoff are not yet wired.","Design consented shared preference extraction and separate partner-private profiles.",31],
["B","Private solo Deep Dive and Love Whispers","designing","Three options plus fourth free-text choice are demonstrated locally. Solo replies are not revealed.","Implement individualized private delivery and editable AI boundaries.",31],
["B","Deep Dives and Whispers","designed","Eight-chapter story reviewer exists, but the customer flow is being redesigned around two shorter weekly dives.","Do not treat the legacy eight-chapter engine as the customer-ready experience.",4],
["C","Themed Petal Journeys","designing","Deep Dives teach, Whispers reinforce, Adventures practice.","Finalize petal objectives and themed sequencing.",9],
["C","Different spouse priorities","designing","Each spouse can choose, pause and grow independently.","Define fair joint sequencing and mutual opt-in.",9],
["D","A Day Through Our Eyes","designed","Photo prompts across the day with two labeled spouse timelines.","Set photo limits, secure intake and consent.",10],
["D","One collage per petal","designed","A beautiful keepsake with both partners, meaningful moments and marriage duration.","Design templates and partner approval.",10],
["D","Instagram sharing and referrals","designed","4:5 export, optional share and Anthos referral link.","Build approved export and share-sheet flow.",10],
["E","First-couple launch","planned","Pricing, privacy and end-to-end acceptance testing.","Run full customer journey tests.",4]
];
// Versioned, scope-weighted planning estimates. Add a new workstream or increase
// an existing workstream's scope weight when a new approved feature expands the product.
// Do not mark progress without implementation/test evidence.
const workstreams=[
 {name:"Website and brand",weight:12,progress:85},
 {name:"Admin and development tracking",weight:10,progress:75},
 {name:"Product experience design",weight:19,progress:63},
 {name:"Database and couple accounts",weight:20,progress:14},
 {name:"Real SMS and AI delivery",weight:20,progress:18},
 {name:"Payments and subscriptions",weight:10,progress:0},
 {name:"Testing and customer launch",weight:13,progress:9},
 {name:"Monthly orchestration and planning",weight:13,progress:15}
];
function scoreReadiness(){
 const total=workstreams.reduce((sum,w)=>sum+w.weight,0);
 const earned=workstreams.reduce((sum,w)=>sum+w.weight*w.progress/100,0);
 const score=total?Math.round(earned/total*100):0;
 const product=document.getElementById("productCompletion");
 const scope=document.getElementById("readinessScope");
 if(product)product.textContent=score+"%";
 if(scope)scope.textContent=workstreams.length+" workstreams · "+total+" weighted scope points · Updated: 31 Oct 2026 · Scoped planning estimates, not live completion";
}
scoreReadiness();
const labels={verified:"VERIFIED",audit:"AUDIT NEEDED",planned:"PLANNED",designed:"DESIGNED",designing:"DESIGNING"};
const list=document.getElementById("featureList"),summary=document.getElementById("featureSummary"),search=document.getElementById("featureSearch"),phase=document.getElementById("featurePhase"),status=document.getElementById("featureStatus");
if(!list||!summary||!search||!phase||!status)return;
function node(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;}
function render(){
 const q=search.value.trim().toLowerCase();
 const rows=tasks.filter(t=>(phase.value==="all"||t[0]===phase.value)&&(status.value==="all"||t[2]===status.value)&&(!q||t.join(" ").toLowerCase().includes(q)));
 list.replaceChildren();
 summary.textContent=rows.length+" / "+tasks.length+" features · "+tasks.filter(t=>t[2]==="verified").length+" verified · no inferred completion percentages";
 for(const t of rows){
  const details=node("details","feature-row"),head=node("summary","feature-row-head");
  head.append(node("span","feature-code",t[0]),node("strong","",t[1]),node("span","progress-status "+(t[2]==="verified"?"progress-done":t[2]==="audit"?"progress-review":t[2]==="designing"?"progress-active":""),labels[t[2]]));
  details.append(head);
  const content=node("div","feature-detail");
  content.append(node("p","",t[3]),node("h4","","Next action"),node("p","",t[4]));
  const a=node("a","feature-link","View detailed GitHub specification #"+t[5]+" ↗");
  a.href="https://github.com/drbellschool/Anthos/issues/"+t[5];a.target="_blank";a.rel="noopener noreferrer";content.append(a);
  const checklists={
   "Themed Petal Journeys":["Petal objectives and completion criteria","Themed Deep Dives, Whispers and Adventures","Revisit history and one collage per petal"],
   "Different spouse priorities":["Private priorities from both partners","Mutual opt-in for shared adventures","Individual progress when the other spouse pauses"],
   "A Day Through Our Eyes":["Photo schedule agreed by both","Two separate labeled timelines","Secure upload, retention and deletion"],
   "One collage per petal":["Both partners represented","Marriage duration calculated from confirmed wedding date","Joint review and approval"],
   "Instagram sharing and referrals":["Legible 4:5 export","Explicit approval from both partners","Optional referral attribution; never auto-post"]
  };
  if(checklists[t[1]]){
   content.append(node("h4","","Acceptance criteria · not yet completed"));
   const ul=node("ul","feature-checklist");
   for(const check of checklists[t[1]])ul.append(node("li","",check));
   content.append(ul);
  }
  details.dataset.issue=String(t[5]);
  details.append(content);list.append(details);
 }
 if(!rows.length)list.append(node("p","feature-empty","No matching features."));
}
search.addEventListener("input",render);phase.addEventListener("change",render);status.addEventListener("change",render);
document.querySelectorAll(".compact-phase").forEach(row=>{
 row.tabIndex=0;row.setAttribute("role","button");row.title="Filter features by phase";
 const go=()=>{phase.value=row.querySelector("b").textContent;phase.dispatchEvent(new Event("change"));list.scrollIntoView({block:"start",behavior:"smooth"});};
 row.addEventListener("click",go);row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}});
});
render();
async function refreshGitHub(){
 const live=document.getElementById("featureLiveStatus");
 if(!live)return;
 try{
  const res=await fetch("/api/admin?view=development",{credentials:"same-origin",cache:"no-store"});
  if(!res.ok)throw new Error("unavailable");
  const data=await res.json();
  if(!data.ok)throw new Error("unavailable");
  const byNumber=new Map(data.issues.map(i=>[i.number,i]));
  const updated=new Date(data.checkedAt).toLocaleString();
  live.textContent="GitHub issues synced "+updated+" · "+data.issues.filter(i=>i.state==="open").length+" open / "+data.issues.length+" tracked. Issue closure does not prove a feature is shipped.";
  const apply=()=>{
   for(const row of list.querySelectorAll("[data-issue]")){
    const issue=byNumber.get(Number(row.dataset.issue));
    if(!issue)continue;
    let info=row.querySelector(".feature-issue-status");
    if(!info){info=node("p","feature-issue-status");row.querySelector(".feature-detail").prepend(info);}
    info.textContent="GitHub #"+issue.number+" · "+issue.state.toUpperCase()+" · Updated "+new Date(issue.updatedAt).toLocaleDateString();
   }
  };
  // Refresh status labels after every search/filter render.
  search.addEventListener("input",apply);
  phase.addEventListener("change",apply);
  status.addEventListener("change",apply);
  apply();
 }catch{
  live.textContent="Live GitHub status unavailable. Showing the dated planning snapshot; no statuses have been inferred.";
 }
}
document.addEventListener("threefold-auth",event=>{if(event.detail?.authenticated)refreshGitHub();});
})();