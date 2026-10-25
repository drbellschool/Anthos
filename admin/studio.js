// Private Threefold Studio: orchestration previews, fictional analytics, and provider-backed rehearsals.
// Only authenticated admin sessions can expose Studio content or invoke live OpenAI.
(() => {
  "use strict";
  const spec=window.THREEFOLD_STUDIO_BLUEPRINT;
  const $=id=>document.getElementById(id);
  const e=(tag,className,text)=>{
    const n=document.createElement(tag);
    if(className)n.className=className;
    if(text!==undefined)n.textContent=String(text);
    return n;
  };
  const populate=(id,items,asCards=false)=>{
    const box=$(id);box.replaceChildren();
    for(const str of items){
      const row=e("div",asCards?"brief-item":"quiet-item",str);
      box.append(row);
    }
  };
  function showTab(tab) {
    if($("dashboard").hidden || !["overview","sophia","paraclete","threefold","deepdives","couples","progress"].includes(tab))return;
    document.querySelectorAll("[data-studio-page]").forEach(el=>el.hidden=el.dataset.studioPage!==tab);
    document.querySelectorAll("[data-studio-tab]").forEach(button=>{
      const active=button.dataset.studioTab===tab;
      button.classList.toggle("active",active);
      if(active)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
    });
    $("studioIntro").hidden=tab!=="overview";
    $("studioBreadcrumb").textContent=tab==="overview"?"PRIVATE STUDIO":
      ({sophia:"SOPHIA",paraclete:"PARACLETE",threefold:"THREEFOLD",deepdives:"DEEP DIVE OBJECTIVES",couples:"COUPLE INSIGHTS",progress:"IMPLEMENTATION PROGRESS"})[tab];
    window.scrollTo(0,0);
  }
  const personaNames=["sophia","paraclete","threefold"];
  function setupPersonas(){
    personaNames.forEach(id=>{
      const person=spec.personas[id];
      $(id+"Prompt").value=person.sample;
      if(id!=="threefold"){
        populate(id+"Brief",person.responsibilities,true);
        populate(id+"Limits",person.limits);
      }
    });
    const flows=$("sophiaHandoff");
    flows.replaceChildren();
    for(const [moment,owner,detail,tracking] of spec.orchestrator.decisions.filter(x=>x[1]==="Sophia")){
      const row=e("div","handoff-row");
      row.append(e("strong","",moment),e("span","",detail),e("small","",tracking));
      flows.append(row);
    }
    const router=$("routerRows");router.replaceChildren();
    for(const [moment,owner,work,guard] of spec.orchestrator.decisions){
      const tr=e("tr");
      for(const val of [moment,owner,guard])tr.append(e("td","",val));
      router.append(tr);
    }
    populate("privacyRules",spec.orchestrator.privacy,true);
  }
  function deepDive(){
    const dive=spec.dive,lesson=$("objectiveCards");
    lesson.replaceChildren();
    for(const goal of dive.measurableObjectives){
      const card=e("article","objective-card");
      card.append(e("span","objective-code",goal.id),e("strong","",goal.title),e("p","",goal.definition));
      lesson.append(card);
    }
    const select=$("chapterSelector");select.replaceChildren();
    for(const c of dive.chapters){
      const option=e("option","",String(c.n).padStart(2,"0")+" · "+c.title);
      option.value=String(c.n);
      select.append(option);
    }
    select.addEventListener("change",renderChapter);
    const mastery=$("masteryChoice");mastery.replaceChildren();
    const intro=e("option","","Choose one of six fictional responses");intro.value="";
    mastery.append(intro);
    // The existing couple demo contains these exact fixed options and their authored consequences.
    const story=window.THREEFOLD_CONTENT?.dive?.chapters?.[6];
    if(!story||!Array.isArray(story.options)||story.options.length!==6){
      $("scoreMastery").disabled=true;
      $("masteryOutcome").textContent="Mastery source missing: no grade can be inferred.";
    }else story.options.forEach((choice,index)=>{
      const option=e("option","",String.fromCharCode(65+index)+". "+choice.text);
      option.value=String(index);mastery.append(option);
    });
    const guards=$("diveGuardrails");
    populate("diveGuardrails",dive.guardrails);
    const tracking=$("diveTracking");tracking.replaceChildren();
    for(const tag of dive.tracking)tracking.append(e("span","tracking-tag",tag));
    $("scoreMastery").addEventListener("click",scoreMastery);
    renderChapter();
  }
  function renderChapter(){
    const chapter=spec.dive.chapters.find(x=>String(x.n)===$("chapterSelector").value)||spec.dive.chapters[0];
    const box=$("chapterInspector");box.replaceChildren();
    box.append(e("span","eyebrow","CHAPTER "+chapter.n+" / "+spec.dive.milestones));
    box.append(e("h3","mini-title",chapter.title));
    box.append(e("p","inspector-goal",chapter.objective));
    box.append(e("strong","metric-head","Observable evidence"));
    box.append(e("p","soft-text",chapter.evidence));
    box.append(e("strong","metric-head","Interaction"));
    box.append(e("p","soft-text",chapter.type==="mastery"?"Independent, hint-free choice":chapter.type==="guided"?"Six-choice guided decision":"Narrative/story milestone"));
    if(chapter.focus?.length)box.append(e("p","focus-codes","Objective IDs: "+chapter.focus.join(", ")));
  }
  function scoreMastery(){
    const value=$("masteryChoice").value;
    const story=window.THREEFOLD_CONTENT?.dive?.chapters?.[6];
    const index=Number(value);
    const out=$("masteryOutcome");out.replaceChildren();
    if(!/^[0-5]$/.test(value)||!story?.options?.[index]){
      out.append(e("p","","Select one choice before previewing its result."));return;
    }
    const choice=story.options[index];
    const score=spec.dive.choiceGrades[choice.quality];
    out.append(e("span","eyebrow","FICTIONAL DECISION • "+score.label.toUpperCase()));
    out.append(e("p","",choice.impact));
    out.append(e("strong","","Objective-aligned coaching"));
    out.append(e("p","",choice.coach));
    out.append(e("p","soft-text",score.description));
    out.append(e("small","soft-text","Fixed authored score: "+choice.quality+"/2. This is not a real participant's result and not a rating of any couple's marriage."));
  }
  function setupAnalytics(){
    const sample=spec.sampleCohort,stat=$("sampleStats");
    const figures=[
      ["SAMPLE COUPLES",sample.length,"Fictional, not customers"],
      ["BOTH OPTED IN",sample.filter(x=>x.status==="Both opted in").length,"Illustrative enrollment"],
      ["TOTAL WHISPERS",sample.reduce((n,x)=>n+x.whispers,0),"Sample activity count"],
      ["DATES COMPLETED",sample.reduce((n,x)=>n+x.dates,0),"Sample activity count"],
      ["COMPLETED STORIES",sample.filter(x=>x.dive===8).length,"Sample Deep Dives"],
      ["MASTERY DEMONSTRATED",sample.filter(x=>x.mastery==="Demonstrated").length,"Fictional decision mastery"]
    ];
    stat.replaceChildren();
    for(const [label,value,note] of figures){
      const card=e("article","stat");
      card.append(e("span","stat-caption",label),e("div","stat-value",value),e("small","",note));
      stat.append(card);
    }
    const tbody=$("sampleCoupleRows");tbody.replaceChildren();
    for(const row of sample){
      const tr=e("tr");
      for(const value of [row.label,row.status,row.whispers,row.dates,row.dive+"/8",row.mastery,row.next])
        tr.append(e("td","",value));
      tbody.append(tr);
    }
    $("showLiveStats").addEventListener("click",()=>analyticsTab(false));
    $("showDemoStats").addEventListener("click",()=>analyticsTab(true));
  }
  function analyticsTab(demo){
    $("demoCouples").hidden=!demo;$("liveCouples").hidden=demo;
    $("showDemoStats").setAttribute("aria-pressed",String(demo));
    $("showLiveStats").setAttribute("aria-pressed",String(!demo));
    $("showDemoStats").classList.toggle("secondary",!demo);
    $("showLiveStats").classList.toggle("secondary",demo);
  }
  async function rehearsePersona(name,button){
    const prompt=$(name+"Prompt").value.trim();
    const output=$(name+"Reply");
    if(prompt.length<3||prompt.length>600){
      output.textContent="Use a fictional prompt between 3 and 600 characters.";return;
    }
    button.disabled=true;output.textContent="Asking "+spec.personas[name].title+"…";
    try{
      const response=await fetch("/api/admin",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json","X-Threefold-Admin":"1"},
        body:JSON.stringify({action:"rehearse-persona",persona:name,prompt})
      });
      const result=await response.json();
      if(response.status===401){output.textContent="Admin session expired. Please sign in again.";return;}
      output.textContent=result.ok?(result.output||"No written response"):
        result.message||result.error||"Couldn't run this rehearsal.";
    }catch{
      output.textContent="The API could not be reached. No text message was sent.";
    }finally{button.disabled=false;}
  }
  function start(){
    document.querySelectorAll("[data-studio-tab]").forEach(button=>
      button.addEventListener("click",()=>showTab(button.dataset.studioTab)));
    document.querySelectorAll(".persona-run").forEach(button=>
      button.addEventListener("click",()=>rehearsePersona(button.dataset.persona,button)));
    setupPersonas();deepDive();setupAnalytics();
    document.addEventListener("threefold-auth",event=>{
      const ok=Boolean(event.detail?.authenticated);
      $("studioNav").hidden=!ok;
      if(ok)showTab("overview");
    });
    // An asynchronous admin session check may finish before this listener
    // in unusual host order. Reconcile without exposing secured panels.
    if(!$("dashboard").hidden){$("studioNav").hidden=false;showTab("overview");}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();