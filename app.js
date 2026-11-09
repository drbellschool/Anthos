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

  // Browser-only colors until per-spouse login and shared progress are implemented.
  const ROPE_KEY="anthos_rope_colors_v1";
  const defaultColors=["#b47b69","#648575","#c4a065"];
  const colorOK=x=>typeof x==="string"&&/^#[0-9a-f]{6}$/i.test(x);
  let ropeColors=(()=>{
    try{const v=JSON.parse(localStorage.getItem(ROPE_KEY)||"null");if(Array.isArray(v)&&v.length===3&&v.every(colorOK))return v;}catch{}
    return defaultColors.slice();
  })();
  function ropePath(a,b,k){
    let d="";
    for(let z=0;z<=8;z++){
      const angle=(a+(b-a)*z/8)*Math.PI/180;
      const r=173+7.8*Math.sin((angle+Math.PI/2)*18+k*Math.PI*2/3);
      d+=(z?"L":"M")+(210+r*Math.cos(angle)).toFixed(2)+" "+(210+r*Math.sin(angle)).toFixed(2)+" ";
    }
    return d;
  }
  function flowerSvg(){
    const p=progress();
    const petalTypes=[...state.whispers.map(()=>"whisper"),...state.datesCompleted.map(()=>"date")].slice(0,12);
    let svg='<defs><filter id="cord-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#6c5c43" flood-opacity=".18"/></filter></defs>';
    svg+='<circle cx="210" cy="210" r="191" stroke="#e8dfd2" fill="none"/>';
    svg+='<circle cx="210" cy="210" r="150" stroke="#e4dbcf" fill="none" stroke-dasharray="1 8"/>';
    for(let i=0;i<12;i++){
      const active=petalTypes[i],fill=active?(active==="whisper"?"#b99266":"#b7807c"):"#e9e2d7";
      svg+='<g transform="rotate('+(i*30)+' 210 210)"><path d="M210 145 C190 132 191 107 210 85 C229 107 230 132 210 145Z" fill="'+fill+'" stroke="#fffaf3" stroke-width="1.7"/><path d="M210 136 Q210 109 210 99" fill="none" stroke="#fff8ee" opacity=".8"/></g>';
    }
    const pieces=72,completed=Math.round(p.crossings/8*pieces);
    for(let i=0;i<pieces;i++){
      const a=-90+i*5-.4,b=a+5.8,active=i<completed;
      const order=[i%3,(i+1)%3,(i+2)%3];
      for(const k of order){
        const d=ropePath(a,b,k);
        const atTip=active&&i>=completed-3;
        const tipScale=atTip?.45+.55*(completed-i)/3:1;
        const width=(active?10.8*tipScale:10.2).toFixed(2);
        svg+='<path d="'+d+'" fill="none" stroke="#fffcf7" stroke-width="'+(Number(width)+3.4)+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+(active?1:.55)+'"/>';
        svg+='<path d="'+d+'" fill="none" stroke="'+ropeColors[k]+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+(active?(atTip?.7:1):.50)+'" filter="url(#cord-shadow)"/>';
        svg+='<path d="'+d+'" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="'+(active?.25:.14)+'"/>';
      }
    }
    svg+='<circle cx="210" cy="210" r="60" fill="#fffcf6" stroke="#e7d8c7" stroke-width="1.6"/>';
    svg+='<circle cx="210" cy="210" r="54" fill="none" stroke="#e2d6c7" stroke-dasharray="1 5"/>';
    svg+='<text x="210" y="207" text-anchor="middle" font-family="Georgia,serif" fill="#344d3e" font-size="29" letter-spacing="-1.4">anthos</text>';
    svg+='<text x="210" y="228" text-anchor="middle" font-family="Arial,sans-serif" fill="#9b7d55" font-size="7.4" letter-spacing="1.6">OUR THREEFOLD STORY</text>';
    svg+='<text x="210" y="245" text-anchor="middle" font-family="Arial,sans-serif" fill="#858a7d" font-size="9">'+p.crossings+' OF 8 CROSSINGS</text>';
    return '<svg viewBox="0 0 420 420" role="img" aria-label="Interwoven threefold cord, '+p.crossings+' of eight crossings completed, '+p.petals+' petals opened" xmlns="http://www.w3.org/2000/svg">'+svg+'</svg>';
  }
  function progress(){return {petals:Math.min(12,state.whispers.length+state.datesCompleted.length),crossings:state.diveCompleted};}
  function refreshCounters(){renderHome();renderJourney();}
  function renderHome(){
    const p=progress();
    $("homeArt").innerHTML=flowerSvg();
    $("homePetalCount").textContent=p.petals+" / 12";
    $("homeBraidCount").textContent=p.crossings+" / 8";
  }
  function renderJourney(){
    const p=progress();
    $("journeyArt").innerHTML=flowerSvg();
    $("journeyPetals").textContent=p.petals+" / 12";
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
    const chapters=CONTENT.dive.chapters;
    state.diveChapter=Math.min(Math.max(state.diveChapter,0),7);
    const i=state.diveChapter,c=chapters[i],v=state.choices[String(i)];
    $("chapterTitle").textContent=c.title;
    $("chapterLocation").textContent=c.location;
    // The final chapter respects the earlier independent mastery choice.
    const finalChoice=state.choices["6"];
    const finalPaths=[
      "Christmas morning belongs to Jack and Jill's home, as they agreed. The cinnamon rolls burn, and his mother is still disappointed. Jack checks on Jill and they laugh over breakfast, knowing holding a boundary doesn't erase other people's feelings.",
      "Christmas morning at home feels quieter than either hoped. Jack's sharp words on the phone hang over the day. He apologizes to his mother for the insult without withdrawing the shared plan, and tells Jill that defending her should not mean escalating conflict. The repair has begun, but trust needs follow-through.",
      "Jack and Jill stay home for Christmas morning, but Jill feels exposed after being blamed. Jack admits he made her carry a decision they had made together. He offers to correct that with his mother. Their morning isn't magically repaired, yet they're finally naming the real hurt.",
      "Jack follows through on the promised second conversation before Christmas. His mother remains disappointed but hears a clear, kind boundary. Jill appreciates the follow-through. Their quiet morning is imperfect, and progress depends on repeating that choice next time.",
      "Jack and Jill go to his mother's breakfast after he changed their plan alone. Jill is hurt. Later, Jack acknowledges that he let pressure undo a joint decision and listens instead of demanding instant forgiveness. They agree to revisit the next holiday together. Repair is possible, not automatic.",
      "Jack and Jill spend Christmas morning at home, keeping their shared plan. His mother remains sad, but Jack is both warm and clear. After the cinnamon rolls burn, he and Jill laugh and begin a small tradition of their own. It isn't perfect, but it belongs to them."
    ];
    $("chapterStory").textContent=i===7 && typeof finalChoice==="number"?
      finalPaths[finalChoice]||c.story:c.story;
    $("chapterTransition").textContent=c.transition||"";
    $("diveFraction").textContent=String(i+1).padStart(2,"0")+" / 08";
    const rail=$("milestoneRail");
    rail.innerHTML=chapters.map((chapter,n)=>{
      const done=n<state.diveCompleted,here=n===i;
      return '<button type="button" data-milestone="'+n+'" '+(n>state.diveCompleted?"disabled":"")+
        ' aria-label="Chapter '+(n+1)+': '+escape(chapter.title)+(done?", completed":"")+'" '+
        'class="'+(done?"complete ":"")+(here?"current":"")+'"></button>';
    }).join("");
    $("braidCount").textContent=state.diveCompleted+(state.diveCompleted===1?" crossing woven":" crossings woven");
    const choices=!!c.options;
    $("choiceBlock").hidden=!choices;
    $("choiceOutcome").hidden=true;
    $("choiceOutcome").querySelectorAll(".repair-action,.repair-note").forEach(node=>node.remove());
    $("storyLesson").hidden=choices;
    if(choices){
      $("chapterPrompt").textContent=c.prompt;
      $("choiceOptions").innerHTML=c.options.map((opt,j)=>
        '<button type="button" class="option '+(j===v?"chosen":"")+'" data-choice-index="'+j+'" '+
        (typeof v==="number"?"disabled":"")+
        '><span class="option-number">'+String.fromCharCode(65+j)+'</span><span>'+escape(opt.text)+'</span></button>').join("");
      if(typeof v==="number"){
        const o=c.options[v],mastery=c.mastery;
        $("choiceOutcome").hidden=false;
        $("outcomeLabel").textContent=mastery?"INDEPENDENT CHOICE · REFLECTION":"THE CONSEQUENCE";
        $("consequence").textContent=o.impact;
        let feedback=o.coach;
        if(mastery)feedback+=" "+(o.quality===2?
          "This choice meets the chapter's core objective.":
          o.quality===1?"This shows partial mastery; consistent follow-through still matters.":
          "This choice did not demonstrate the chapter's goal yet. The next step is a respectful repair.");
        $("coaching").textContent=feedback;
        if(o.quality===0&&!mastery){
          const repaired=state.repairs[String(i)]===true;
          const repair=document.createElement("button");
          repair.type="button";repair.className="button ghost";
          repair.id="repairChoice";repair.classList.add("repair-action");repair.textContent=repaired?
            "Repair practiced ✓":"Practice a respectful repair";
          repair.disabled=repaired;
          repair.addEventListener("click",()=>{
            if(state.repairs[String(i)])return;
            state.repairs[String(i)]=true;
            store();renderDive();
          });
          $("choiceOutcome").appendChild(repair);
          if(repaired){
            const note=document.createElement("p");
            note.className="soft repair-note";
            note.textContent="Jack returns to the conversation: 'I was unfair. I'm sorry for blaming you. Can we try that again?' The original hurt still matters, but he's taking responsibility.";
            $("choiceOutcome").appendChild(note);
          }
        }
      } else {
        $("chapterTransition").textContent=c.mastery?
          "Choose before reading any feedback. This moment is yours to consider.":"Choose a response to see a realistic consequence.";
      }
    }else{
      if(i===7 && typeof finalChoice==="number"){
        const mastery=CONTENT.dive.chapters[6].options[finalChoice].quality;
        const label=mastery===2?"Demonstrated":mastery===1?"Developing":"Not yet demonstrated";
        $("lessonText").textContent="Independent mastery: "+label+". "+c.takeaway+
          (mastery===2?" The choice showed respectful joint ownership under pressure.":
           " The story offers a path toward repair, but repair requires accountability and real follow-through.");
      } else {
        $("lessonText").textContent=c.takeaway;
      }
    }
    let label;
    if(state.diveCompleted===8){
      label="Deep Dive complete ✓";
    }else if(i<state.diveCompleted){
      label="Return to your next chapter ↗";
    }else if(choices && typeof v!=="number"){
      label="Choose a response above";
    }else{
      label=i===7?"Finish this Deep Dive ✦":"Complete chapter "+(i+1)+" ↗";
    }
    $("nextChapter").textContent=label;
    $("nextChapter").disabled=state.diveCompleted===8 || (i===state.diveCompleted&&choices&&typeof v!=="number");
    $("diveStatus").textContent=state.diveCompleted===8?
      "You've finished all eight story milestones. Your cord is complete for this Deep Dive.":
      "Every completed milestone adds one visible crossing.";
  }
  function chooseResponse(index){
    const i=state.diveChapter,c=CONTENT.dive.chapters[i],key=String(i);
    if(i!==state.diveCompleted||!c.options||state.choices[key]!==undefined||
      !Number.isInteger(index)||index<0||index>=c.options.length)return;
    state.choices[key]=index;
    store();renderDive();
    $("choiceOutcome").scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  function completeChapter() {
    const i=state.diveChapter,c=CONTENT.dive.chapters[i];
    if(state.diveCompleted===8)return;
    if(i<state.diveCompleted){state.diveChapter=Math.min(7,state.diveCompleted);store();renderDive();return;}
    if(i!==state.diveCompleted||(c.options&&typeof state.choices[String(i)]!=="number"))return;
    state.diveCompleted=Math.min(8,i+1);
    state.diveChapter=Math.min(7,state.diveCompleted);
    store();renderDive();
    $("chapterTitle").scrollIntoView({behavior:"smooth",block:"center"});
  }
  function resetDemo() {
    if(!window.confirm("Erase only this browser's Threefold demonstration progress? No live account will be changed."))return;
    state=emptyState();
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
      const milestone=ev.target.closest("[data-milestone]");
      if(milestone && !milestone.disabled){
        const chapter=Number(milestone.dataset.milestone);
        if(chapter>=0&&chapter<=state.diveCompleted&&chapter<=7){
          state.diveChapter=chapter;store();renderDive();
        }
      }
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

    document.querySelectorAll(".rope-color").forEach(input=>{
      const k=Number(input.dataset.strand);input.value=ropeColors[k];
      input.addEventListener("input",()=>{
        if(!colorOK(input.value))return;
        ropeColors[k]=input.value;
        try{localStorage.setItem(ROPE_KEY,JSON.stringify(ropeColors));}catch{}
        renderHome();renderJourney();
      });
    });
    if(!state.datePlan)state.datePlan=emptyState().datePlan;
    renderHome();renderWhispers();renderDate();renderDive();renderJourney();
    goto("home");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize);
  else initialize();
})();