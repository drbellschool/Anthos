/* Threefold Stage 1 couple-facing prototype.
   Demo only: no real account, AI, SMS, payments or database writes.
   No real relationship messages should be entered into this browser-only prototype. */
(() => {
  "use strict";
  const CONTENT = window.THREEFOLD_CONTENT;
  const KEY = "threefold_stage1_demo_v1";
  const $ = id => document.getElementById(id);
  const pageNames = {
    home:"OUR BEGINNING",whispers:"LOVE WHISPERS",dates:"DATE ADVENTURES",
    dive:"DEEP DIVES",journey:"OUR STORY GROWS"
  };
  const emptyState = () => ({
    version:1,whisperIndex:0,whispers:[],datesCompleted:[],
    datePlan:{id:"first-braid",checked:[],childcare:"not-needed",mood:"romantic",location:""},
    diveCompleted:0,diveChapter:0,choices:{},repairs:{}
  });
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!d || d.version !== 1 || !Array.isArray(d.whispers) || !Array.isArray(d.datesCompleted) ||
        !Number.isInteger(d.diveCompleted) || d.diveCompleted<0 || d.diveCompleted>8 ||
        !d.choices || !d.repairs) return emptyState();
      d.whisperIndex = Math.max(0,Math.min(CONTENT.whispers.length-1,Number(d.whisperIndex)||0));
      d.diveChapter = Math.max(0,Math.min(7,Number(d.diveChapter)||0));
      return d;
    } catch {return emptyState();}
  }
  let state=load();
  const DiveEngine=window.ANTHOS_DEEP_DIVE_ENGINE;
  const diveStory=DiveEngine.storyCheck(CONTENT.dive);
  let diveState=DiveEngine.restore(diveStory,state.deepDive || {
    version:1,storyKey:diveStory.id,storyVersion:diveStory.storyVersion||1,
    chapter:state.diveChapter,completed:state.diveCompleted,
    choices:state.choices,repairs:state.repairs
  });
  function syncDiveState() {
    state.deepDive=diveState;
    state.diveCompleted=diveState.completed;
    state.diveChapter=diveState.chapter;
    state.choices=diveState.choices;
    state.repairs=diveState.repairs;
  }
  syncDiveState();
  function applyDive(action) {
    const result=DiveEngine.transition(diveStory,diveState,action);
    if(result.changed){
      diveState=result.state;
      syncDiveState();
      store();
      renderDive();
    }
    return result;
  }
  let activeView="home";
  let pendingShare=null;
  const escape = val => String(val??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
  function store() {
    try {localStorage.setItem(KEY,JSON.stringify(state));}
    catch {announce("Your browser is not saving demo changes. You can still explore the experience.");}
    refreshCounters();
  }
  function announce(text) {
    const el = $("statusAnnouncer") || $("whisperFeedback");
    if(el)el.textContent=text;
  }
  function goto(view) {
    if(!pageNames[view])return;
    activeView=view;
    document.querySelectorAll(".view").forEach(el=>{el.hidden=el.dataset.page!==view;});
    document.querySelectorAll(".nav-link").forEach(el=>{
      const selected=el.dataset.view===view;el.classList.toggle("active",selected);
      if(selected)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
    });
    $("breadcrumb").textContent=pageNames[view];
    document.querySelector(".sidebar").classList.remove("open");
    $("menuToggle").setAttribute("aria-expanded","false");
    if(view==="whispers")renderWhispers();
    if(view==="dates")renderDate();
    if(view==="dive")renderDive();
    if(view==="journey")renderJourney();
    if(view==="home")renderHome();
    window.scrollTo({top:0,behavior:"auto"});
  }
  const polar = (radius,degrees) => {
    const a=degrees*Math.PI/180;
    return [(210+radius*Math.cos(a)).toFixed(2),(210+radius*Math.sin(a)).toFixed(2)];
  };
  function arc(radius,start,end) {
    const [sx,sy]=polar(radius,start),[ex,ey]=polar(radius,end);
    return "M "+sx+" "+sy+" A "+radius+" "+radius+" 0 0 1 "+ex+" "+ey;
  }
  function flowerSvg() {
    const palette=["#ac834d","#a97578","#728872"];
    const petalTypes = [
      ...state.whispers.map(()=>"whisper"),
      ...state.datesCompleted.map(()=>"date")
    ].slice(0,8);
    let layers='<circle cx="210" cy="210" r="195" fill="none" stroke="#e4dbcd" stroke-width=".9"/>';
    for(let i=0;i<8;i++){
      const angle=i*45,active=petalTypes[i];
      const fill=active?(active==="whisper"?"#bd9362":"#b78380"):"#eae4d9";
      const opacity=active?".90":".72";
      layers+='<g transform="rotate('+angle+' 210 210)"><path d="M 210 145 C 176 128 180 75 210 44 C 240 75 244 128 210 145 Z" fill="'+fill+'" opacity="'+opacity+'" stroke="#fffcf7" stroke-width="2"/><path d="M210 138 Q211 95 210 59" fill="none" stroke="'+(active?"#ffffff8c":"#d8ccbd")+'" stroke-width="1.1"/></g>';
    }
    for(let segment=0;segment<8;segment++){
      const done=segment<state.diveCompleted,start=-90+segment*45+3,end=start+39;
      for(let s=0;s<3;s++){
        const r=171+s*4,stroke=done?palette[s]:"#d8d1c5";
        layers+='<path d="'+arc(r,start,end)+'" fill="none" stroke="'+stroke+'" stroke-width="'+(done?3.6:2.3)+'" stroke-linecap="round" opacity="'+(done?"1":".7")+'"/>';
      }
      if(done) {
        const middle=-90+segment*45+22;
        const a=polar(169,middle-1.5),b=polar(183,middle+1.5);
        layers+='<path d="M'+a.join(" ")+' L'+b.join(" ")+'" stroke="#f6eee0" stroke-width="2.5" stroke-linecap="round"/>';
      }
    }
    layers+='<circle cx="210" cy="210" r="61" fill="#fffcf5" stroke="#e1d4c0" stroke-width="1.6"/>';
    layers+='<circle cx="210" cy="210" r="53" fill="none" stroke="#e3d9cc" stroke-dasharray="1.3 5" stroke-width="1"/>';
    layers+='<text x="210" y="205" text-anchor="middle" font-family="Georgia,serif" fill="#405646" font-size="24" letter-spacing="-1">threefold</text>';
    layers+='<text x="210" y="225" text-anchor="middle" font-family="Arial,sans-serif" fill="#ac8560" font-size="8.5" letter-spacing="2.2">OUR STORY</text>';
    return '<svg viewBox="0 0 420 420" role="img" aria-label="'+petalTypes.length+' petals opened and '+state.diveCompleted+' of eight Deep Dive crossings woven." xmlns="http://www.w3.org/2000/svg">'+layers+'</svg>';
  }
  function progress(){
    return {petals:Math.min(8,state.whispers.length+state.datesCompleted.length),crossings:state.diveCompleted};
  }
  function refreshCounters(){
    renderHome();
    renderJourney();
  }
  function renderHome(){
    const p=progress();
    $("homeArt").innerHTML=flowerSvg();
    $("homePetalCount").textContent=p.petals;
    $("homeBraidCount").textContent=p.crossings+" / 8";
  }
  function renderJourney(){
    const p=progress();
    $("journeyArt").innerHTML=flowerSvg();
    $("journeyPetals").textContent=p.petals+" / 8";
    $("journeyBraid").textContent=p.crossings+" / 8";
    $("journeyWhispers").textContent=state.whispers.length;
    $("journeyDates").textContent=state.datesCompleted.length;
  }
  function renderWhispers(){
    const item=CONTENT.whispers[state.whisperIndex];
    $("whisperTheme").textContent=item.theme.toUpperCase();
    $("whisperQuestion").textContent=item.question;
    $("whisperNudge").textContent=item.nudge;
    $("wordCount").textContent=$("whisperAnswer").value.length+" / 900 characters";
    const box=$("whisperHistory");
    if(!state.whispers.length){
      box.innerHTML='<div class="empty">The best words are still ahead of you.</div>';
    }else{
      box.innerHTML=state.whispers.slice().reverse().map(w=>
        '<div class="history-entry"><div class="stamp">'+escape(w.theme).toUpperCase()+
        ' · '+(w.shared?"SHARED IN DEMO":"PRIVATE")+'</div><p>'+escape(w.answer)+'</p>'+
        (w.shared?'<small>Marked shared in this demo only</small>':
         '<button class="share-whisper" type="button" data-share-id="'+escape(w.id)+'">Preview sharing ↗</button>')+
        '</div>').join("");
    }
  }
  function saveWhisper() {
    const answer=$("whisperAnswer").value.trim();
    if(!answer){$("whisperFeedback").textContent="Write a thought before saving it.";return;}
    const prompt=CONTENT.whispers[state.whisperIndex];
    state.whispers.push({
      id:crypto.randomUUID?crypto.randomUUID():String(Date.now())+"-"+String(Math.random()),
      theme:prompt.theme,question:prompt.question,answer:answer.slice(0,900),
      shared:false,created:new Date().toISOString()
    });
    $("whisperAnswer").value="";
    $("whisperFeedback").textContent="Saved privately in this demo browser. Nobody was contacted.";
    state.whisperIndex=(state.whisperIndex+1)%CONTENT.whispers.length;
    store();renderWhispers();
  }
  function previewShare(id) {
    const w=state.whispers.find(x=>x.id===id&&!x.shared);
    if(!w)return;
    pendingShare=id;
    $("shareText").textContent=w.answer;
    $("shareOverlay").hidden=false;
    $("confirmShare").focus();
  }
  function closeShare(){
    pendingShare=null;$("shareOverlay").hidden=true;
  }
  function confirmShare(){
    const w=state.whispers.find(x=>x.id===pendingShare&&!x.shared);
    if(w){
      w.shared=true;store();
      $("whisperFeedback").textContent="Marked shared locally. This demo does not send messages.";
    }
    closeShare();renderWhispers();
  }
  const getDate=id=>CONTENT.dates.find(x=>x.id===id)||CONTENT.dates[0];
  function chooseDate(mood,budget) {
    const budgetNumber=Math.max(0,Number(budget)||0);
    const candidates=CONTENT.dates.filter(d=>d.baseCost<=budgetNumber&&d.mood.includes(mood));
    const alternative=CONTENT.dates.filter(d=>d.baseCost<=budgetNumber);
    const list=(candidates.length?candidates:alternative).slice();
    if(!list.length)return CONTENT.dates[0];
    const unseen=list.find(d=>!state.datesCompleted.some(c=>c.id===d.id));
    return unseen||list[0];
  }
  function dateChecks(plan){
    const d=getDate(plan.id),extra=plan.childcare==="needed"?
      ["Arrange childcare together and confirm the details."]:[];
    return [...extra,...d.steps];
  }
  function renderDate() {
    const plan=state.datePlan||emptyState().datePlan,d=getDate(plan.id),steps=dateChecks(plan);
    $("dateTitle").textContent=d.title;
    $("dateIntro").textContent=d.intro;
    $("dateCost").textContent=d.baseCost===0?"Free (optional treats extra)":"Up to approximately $"+d.baseCost;
    $("dateTime").textContent=d.minutes+" minutes";
    $("dateSupplies").textContent=d.supplies;
    $("childcareNote").textContent=plan.childcare==="needed"?
      "Childcare is not arranged by this demo. Your first checklist step is to coordinate it together.":
      plan.childcare==="arranged"?"Childcare already arranged—make sure both partners know the time and plan.":
      "No childcare arrangements requested.";
    $("dateSteps").innerHTML=steps.map((step,i)=>
      '<label class="step '+(plan.checked.includes(i)?"completed":"")+'">'+
      '<input type="checkbox" class="date-check" data-step="'+i+'" '+(plan.checked.includes(i)?"checked":"")+'>'+
      '<span>'+escape(step)+'</span></label>').join("");
    const completed=state.datesCompleted.some(x=>x.id===d.id);
    $("finishDate").disabled=completed;
    $("finishDate").innerHTML=completed?'Adventure remembered <span>✓</span>':'Complete this adventure <span>✦</span>';
    $("dateFeedback").textContent=completed?"You've already marked this adventure complete in the demo. Plan a different one next.":"";
  }
  function planDate(){
    const mood=$("dateMood").value,budget=$("dateBudget").value;
    const d=chooseDate(mood,budget);
    state.datePlan={id:d.id,mood,checked:[],childcare:$("dateChildcare").value,
      location:$("dateLocation").value.trim().slice(0,80)};
    store();renderDate();
    $("dateFeedback").textContent="Plan created. Nothing has been booked or sent to a partner.";
  }
  function checkDate(i,checked){
    const plan=state.datePlan||emptyState().datePlan;
    plan.checked=(plan.checked||[]).filter(x=>x!==i);
    if(checked)plan.checked.push(i);
    state.datePlan=plan;
    store();renderDate();
  }
  function finishDate(){
    const plan=state.datePlan||emptyState().datePlan,d=getDate(plan.id);
    if(state.datesCompleted.some(x=>x.id===d.id))return;
    const count=dateChecks(plan).length;
    if(count>plan.checked.length || Array.from({length:count},(_,i)=>i).some(i=>!plan.checked.includes(i))){
      $("dateFeedback").textContent="Complete the planning and experience checklist first.";return;
    }
    state.datesCompleted.push({id:d.id,title:d.title,at:new Date().toISOString()});
    store();renderDate();
    $("dateFeedback").textContent="One more petal opened. Your memory has been added to the demo journey.";
  }
  function renderDive(){
    const v=DiveEngine.view(diveStory,diveState);
    const i=v.index,c=v.chapter,chosen=v.choiceIndex;
    $("chapterTitle").textContent=c.title;
    $("chapterLocation").textContent=c.location;
    $("chapterStory").textContent=v.storyText;
    $("chapterTransition").textContent=c.transition||"";
    $("diveFraction").textContent=String(i+1).padStart(2,"0")+" / 08";
    $("milestoneRail").innerHTML=diveStory.chapters.map((chapter,n)=>{
      const done=n<diveState.completed,here=n===i;
      return '<button type="button" data-milestone="'+n+'" '+(n>diveState.completed?"disabled":"")+
        ' aria-label="Chapter '+(n+1)+': '+escape(chapter.title)+(done?", completed":"")+'" '+
        'class="'+(done?"complete ":"")+(here?"current":"")+'"></button>';
    }).join("");
    $("braidCount").textContent=diveState.completed+
      (diveState.completed===1?" crossing woven":" crossings woven");
    $("choiceBlock").hidden=!c.options;
    $("choiceOutcome").hidden=true;
    $("choiceOutcome").querySelectorAll(".repair-action,.repair-note,.repair-choice-list").forEach(node=>node.remove());
    $("storyLesson").hidden=Boolean(c.options);
    if(c.options){
      $("chapterPrompt").textContent=c.prompt;
      $("choiceOptions").innerHTML=c.options.map((opt,j)=>
        '<button type="button" class="option '+(j===chosen?"chosen":"")+'" data-choice-index="'+j+'" '+
        (!v.canChoose?"disabled":"")+
        '><span class="option-number">'+String.fromCharCode(65+j)+'</span><span>'+escape(opt.text)+'</span></button>'
      ).join("");
      if(v.choice){
        $("choiceOutcome").hidden=false;
        $("outcomeLabel").textContent=c.mastery?"INDEPENDENT CHOICE · REFLECTION":"THE CONSEQUENCE";
        $("consequence").textContent=v.outcome;
        $("coaching").textContent=v.coaching+(c.mastery && v.mastery?
          " Independent mastery: "+(v.mastery.status==="demonstrated"?"Demonstrated.":
            v.mastery.status==="developing"?"Developing.":"Not yet demonstrated.")+
          " "+v.mastery.summary:"");
        if(v.needsRepair){
          const note=document.createElement("p");
          note.className="soft repair-note";
          note.textContent="A hurtful choice calls for practice before you continue. Choose one repair. This does not erase the original consequence.";
          $("choiceOutcome").appendChild(note);
          const options=document.createElement("div");
          options.className="repair-choice-list";
          v.repairOptions.forEach(item=>{
            const button=document.createElement("button");
            button.type="button";button.className="button ghost repair-action";
            button.dataset.repairId=item.id;
            button.textContent=item.text;
            options.appendChild(button);
          });
          $("choiceOutcome").appendChild(options);
        }else if(v.repair){
          const item=v.repairOptions.find(x=>x.id===v.repair.selected);
          if(item){
            const note=document.createElement("p");
            note.className="soft repair-note";
            note.textContent="Repair practice: "+item.consequence+" "+item.coach+
              (v.repair.guided?" Sophia offers a clear model: 'I blamed you instead of owning my choice. I'm sorry. I want to listen and try again.'":"");
            $("choiceOutcome").appendChild(note);
          }
        }
      }else{
        $("chapterTransition").textContent=c.mastery?
          "Choose without advance hints. Your first response will determine the independent mastery result.":
          "Choose a response to see its consequence and research-informed coaching.";
      }
    }else{
      $("lessonText").textContent=i===7 && v.mastery?
        "Independent mastery: "+(v.mastery.status==="demonstrated"?"Demonstrated":
          v.mastery.status==="developing"?"Developing":"Not yet demonstrated")+
        ". "+c.takeaway+" "+v.mastery.summary:
        c.takeaway||"";
    }
    const reviewing=v.readOnly;
    $("nextChapter").textContent=v.complete?"Deep Dive complete ✓":
      reviewing?"Return to your next chapter ↗":
      v.canChoose?"Choose a response above":
      v.needsRepair?"Practice a repair before continuing":
      v.finishLabel+(i===7?" ✦":" ↗");
    $("nextChapter").disabled=v.complete || (!reviewing && !v.canAdvance);
    $("diveStatus").textContent=v.complete?
      "All eight milestones are finished. Completion does not guarantee mastery.":
      v.mastery && i===7?
      "Independent result: "+v.mastery.status.replaceAll("-"," ")+". You may continue with the realistic ending.":
      "Each completed milestone adds one crossing. Private demo data stays in this browser.";
  }
  function chooseResponse(index){
    const result=applyDive({type:"choose",index});
    if(result.changed)$("choiceOutcome").scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  function repairResponse(id){
    const result=applyDive({type:"repair",repair:id});
    if(result.changed)$("choiceOutcome").scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  function completeChapter(){
    const v=DiveEngine.view(diveStory,diveState);
    if(v.readOnly){
      applyDive({type:"navigate",chapter:Math.min(7,diveState.completed)});
      return;
    }
    const result=applyDive({type:"advance"});
    if(result.changed)$("chapterTitle").scrollIntoView({behavior:"smooth",block:"center"});
  }
  function resetDemo() {
    if(!window.confirm("Erase only this browser's Threefold demonstration progress? No live account will be changed."))return;
    state=emptyState();
    diveState=DiveEngine.fresh(diveStory);
    syncDiveState();
    $("whisperAnswer").value="";
    $("whisperFeedback").textContent="";
    store();goto("home");
  }
  function initialize(){
    document.addEventListener("click",ev=>{
      const link=ev.target.closest("[data-go]");
      if(link)goto(link.dataset.go);
      const nav=ev.target.closest("[data-view]");
      if(nav)goto(nav.dataset.view);
      const share=ev.target.closest("[data-share-id]");
      if(share)previewShare(share.dataset.shareId);
      const choice=ev.target.closest("[data-choice-index]");
      if(choice)chooseResponse(Number(choice.dataset.choiceIndex));
      const repair=ev.target.closest("[data-repair-id]");
      if(repair && !repair.disabled)repairResponse(repair.dataset.repairId);
      const milestone=ev.target.closest("[data-milestone]");
      if(milestone && !milestone.disabled)
        applyDive({type:"navigate",chapter:Number(milestone.dataset.milestone)});
    });
    $("menuToggle").addEventListener("click",()=>{
      const nav=document.querySelector(".sidebar");
      const opened=nav.classList.toggle("open");
      $("menuToggle").setAttribute("aria-expanded",String(opened));
    });
    $("resetDemo").addEventListener("click",resetDemo);
    $("saveWhisper").addEventListener("click",saveWhisper);
    $("nextWhisper").addEventListener("click",()=>{
      state.whisperIndex=(state.whisperIndex+1)%CONTENT.whispers.length;
      $("whisperFeedback").textContent="";
      $("whisperAnswer").value="";store();renderWhispers();
    });
    $("whisperAnswer").addEventListener("input",()=>{
      $("wordCount").textContent=$("whisperAnswer").value.length+" / 900 characters";
    });
    $("planDate").addEventListener("click",planDate);
    $("finishDate").addEventListener("click",finishDate);
    $("dateSteps").addEventListener("change",ev=>{
      const check=ev.target.closest(".date-check");
      if(check)checkDate(Number(check.dataset.step),check.checked);
    });
    $("nextChapter").addEventListener("click",completeChapter);
    $("confirmShare").addEventListener("click",confirmShare);
    $("cancelShare").addEventListener("click",closeShare);
    $("shareOverlay").addEventListener("click",ev=>{
      if(ev.target===$("shareOverlay"))closeShare();
    });
    document.addEventListener("keydown",ev=>{
      if(ev.key==="Escape"&&!$("shareOverlay").hidden)closeShare();
    });
    if(!state.datePlan)state.datePlan=emptyState().datePlan;
    renderHome();renderWhispers();renderDate();renderDive();renderJourney();
    goto("home");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize);
  else initialize();
})();