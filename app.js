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
    if(!state.datePlan)state.datePlan=emptyState().datePlan;
    renderHome();renderWhispers();renderDate();renderDive();renderJourney();
    goto("home");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize);
  else initialize();
})();