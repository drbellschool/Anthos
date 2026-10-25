(() => {
"use strict";
// Curated development snapshot, not live GitHub data.
const tasks=[
["A","Repository and admin access","verified","Code and admin access confirmed.","Review session security.",4],
["A","Supabase data and privacy","audit","Schema, consent and permissions need verification.","Audit RLS and per-spouse access.",4],
["A","Telnyx and messaging","audit","Real SMS integration requires end-to-end verification.","Confirm carrier status, webhooks and opt-outs.",4],
["A","Cost telemetry","planned","Per-couple usage tracking for SMS, AI and images.","Specify cost events and admin charts.",4],
["B","Sophia and Paraclete","designed","Companion coaching and concierge handoff.","Implement shared context and privacy rules.",4],
["B","Deep Dives and Whispers","designed","Eight milestones, independent mastery and personal whispers.","Implement story engine and cadence.",4],
["C","Themed Petal Journeys","designing","Deep Dives teach, Whispers reinforce, Adventures practice.","Finalize petal objectives and themed sequencing.",9],
["C","Different spouse priorities","designing","Each spouse can choose, pause and grow independently.","Define fair joint sequencing and mutual opt-in.",9],
["D","A Day Through Our Eyes","designed","Photo prompts across the day with two labeled spouse timelines.","Set photo limits, secure intake and consent.",10],
["D","One collage per petal","designed","A beautiful keepsake with both partners, meaningful moments and marriage duration.","Design templates and partner approval.",10],
["D","Instagram sharing and referrals","designed","4:5 export, optional share and Anthos referral link.","Build approved export and share-sheet flow.",10],
["E","First-couple launch","planned","Pricing, privacy and end-to-end acceptance testing.","Run full customer journey tests.",4]
];
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
  details.append(content);list.append(details);
 }
 if(!rows.length)list.append(node("p","feature-empty","No matching features."));
}
search.addEventListener("input",render);phase.addEventListener("change",render);status.addEventListener("change",render);
document.querySelectorAll(".compact-phase").forEach(row=>{
 row.tabIndex=0;row.setAttribute("role","button");row.title="Filter features by phase";
 const go=()=>{phase.value=row.querySelector("b").textContent;render();list.scrollIntoView({block:"start",behavior:"smooth"});};
 row.addEventListener("click",go);row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}});
});
render();
})();