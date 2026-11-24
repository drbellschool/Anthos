// Anthos 4.0 browser-only couple preview. Each mounted player is isolated by its invitation token.
(()=>{
"use strict";
function el(tag,cls,value){const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value);return x}
function mount(root,invite,options={}){
 const token=String(invite||"");
 let current=null,inFlight=false,lastFingerprint="",destroyed=false,autoFailed=false,autoTimer=null;
 // Polling must never destroy an in-progress message or move keyboard focus.
 // Keep drafts scoped to this private participant; do not send or disclose until Submit.
 let controlsKey="",draftName=options.defaultName||"",draftAdvice="",draftPhase=-1;
 root.replaceChildren();
 root.classList.add("jj4-player");
 const top=el("div","jj4-top"),status=el("div","jj4-state","Connecting…");
 const title=el("strong","jj4-player-title","Private Coach"),phase=el("span","jj4-phase","");
 top.append(title,phase);root.append(top,status);
 const area=el("div","jj4-scroll");area.setAttribute("aria-live","polite");root.append(area);
 const controls=el("div","jj4-controls");root.append(controls);
 function message(text,isError=false){status.textContent=text;status.classList.toggle("error",isError)}
 async function api(action,details={}){
  const isGet=!action;
  const response=await fetch("/api/jack-jill-v4",{method:isGet?"GET":"POST",
   headers:{"x-anthos-v4-invite":token,...(isGet?{}:{"Content-Type":"application/json"})},
   credentials:"omit",cache:"no-store",
   ...(isGet?{}:{body:JSON.stringify({action,...details})})
  });
  const result=await response.json().catch(()=>({error:"The pilot did not respond."}));
  if(!response.ok||!result.ok)throw Error(result.error||"Pilot unavailable");
  return result;
 }
 function oneAction(text,callback,primary=false){
  const btn=el("button","jj4-button"+(primary?" primary":""),text);btn.type="button";
  // render() can run before refresh()/act() clear inFlight. Never leave a freshly
  // created Join button permanently disabled after a successful initial fetch.
  btn.disabled=false;
  btn.addEventListener("click",()=>{if(!inFlight&&!destroyed)callback()});
  controls.append(btn);return btn;
 }
 function joinPanel(){
  controls.replaceChildren();
  const label=el("label","jj4-label","Your first name");
  const inp=el("input","jj4-name");
  inp.type="text";inp.maxLength=32;inp.placeholder="First name";
  inp.value=draftName;
  inp.addEventListener("input",()=>{draftName=inp.value});
  label.append(inp);controls.append(label);
  const join=oneAction("Join "+(current?.role==="jack"?"Jack":"Jill")+"'s private conversation",async()=>{
   const name=inp.value.trim();
   if(!name){message("Enter your first name to join.",true);inp.focus();return}
   await act("join",{name});
  },true);
  // The name field isn't inside a form, so Enter must explicitly activate Join.
  inp.addEventListener("keydown",event=>{
   if(event.key==="Enter"&&!event.isComposing){
    event.preventDefault();
    join.click();
   }
  });
 }
 function transcript(state){
  const seen=new Set(),entries=[];
  for(const x of [...state.scenes,...state.messages].sort((a,b)=>state.openConversation?
   (a.phase_index-b.phase_index)||((a.kind==="prompt"?0:a.kind==="sophia"?2:1)-(b.kind==="prompt"?0:b.kind==="sophia"?2:1))||String(a.created_at).localeCompare(String(b.created_at))||String(a.id).localeCompare(String(b.id)):
   a.id-b.id)){
   if(seen.has(x.id+"-"+x.kind))continue;
   seen.add(x.id+"-"+x.kind);entries.push(x);
  }
  const presented=state.version==="4.1.0"?entries.filter(x=>x.kind!=="coach"):entries;
  const fp=presented.map(x=>x.id+":"+x.body.length).join("|");
  if(fp===lastFingerprint)return;
  lastFingerprint=fp;
  area.replaceChildren();
  if(!entries.length)area.append(el("div","jj4-empty","The episode begins once both coaches join."));
  const questionCounts=new Map();
  for(const item of presented){
   let questionLabel="YOUR PRIVATE QUESTION";
   if(state.version==="4.1.0"&&item.kind==="question"){
    const count=(questionCounts.get(item.phase_index)||0)+1;
    questionCounts.set(item.phase_index,count);
    questionLabel=count===1?"YOUR COACHING CHOICE":"YOUR FOLLOW-UP";
   }
   const isScene=item.kind==="scene",isSophia=item.kind==="sophia",isIntro=item.kind==="introduction";
   const row=el("article","jj4-entry "+(isScene?"scene":isSophia||isIntro?"sophia":["coach","question","reply"].includes(item.kind)?item.kind:"prompt"));
   row.append(el("span","jj4-entry-label",isIntro?"SOPHIA · YOUR EPISODE OBJECTIVE":isSophia?"SOPHIA · THE RESEARCH & THE TAKEAWAY":
    isScene?(state.version==="4.4.0"?["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][item.phase_index]:"SCENE · "+(item.phase_index+1)):item.kind==="coach"?"YOUR PRIVATE ADVICE":
    item.kind==="question"?questionLabel:item.kind==="reply"?(state.character||"Character").toUpperCase()+" · PRIVATE ANSWER":
    (state.character||"Character").toUpperCase()+" → "+
    (state.role==="jack"?"HUSBAND":"WIFE")+" · PRIVATE MESSAGE"));
   if(state.version==="4.4.0"&&isScene){
    row.append(el("h3","jj44-page-title",item.storyTitle||""),el("p","jj44-story-text",item.storyText||""),el("div","jj44-sophia","Sophia · "+(item.sophiaText||"")));
   }else row.append(el("p","",item.body));
   if(isSophia&&Array.isArray(state.researchSources)){
    const sourceList=el("div","jj4-sources");
    for(const source of state.researchSources){
     if(!/^https:\/\//.test(source.url||""))continue;
     const anchor=el("a","jj4-source",source.label);
     anchor.href=source.url;anchor.target="_blank";anchor.rel="noopener noreferrer";
     sourceList.append(anchor);
    }
    row.append(sourceList);
   }
   area.append(row);
  }
  if(entries.length)area.scrollTop=area.scrollHeight;
 }
 function render(state){
  current=state;
  title.textContent=state.version==="4.4.0"?"The Adventures of Jack & Jill":(state.role==="jack"?"Husband · coaching Jack":"Wife · coaching Jill");
  phase.textContent=state.version==="4.4.0"?state.weekDay+" · Day "+(state.hasSophia?7:state.phaseIndex+1)+"/7":["4.2.0","4.3.0"].includes(state.version)?state.weekDay+" · Day "+(state.phaseIndex+1)+"/6":
   state.phase+" · "+(state.phaseIndex+1)+"/6";
  transcript(state);
  // A background status poll can return every five seconds while a participant
  // is typing. Only rebuild controls when their *meaningful* state changes;
  // rebuilding on every poll erased drafts and stole focus mid-sentence.
  const nextKey=[
   state.role,state.version,state.selectedOption,state.joined,state.bothJoined,state.phaseIndex,state.stage,
   state.needsReply,state.submitted,state.finished,state.canContinue,state.canText,
   !!state.paused,(state.pausedBy||[]).join(","),
   // Another coach submitting is not a reason to steal this coach's focus.
   state.needsReply?"":(state.waitingFor?.join(",")||""),state.scenes?.length||0,
   state.hasSophia,state.closing,state.closureDue,state.nextStoryDay,autoFailed
  ].join("|");
  if(nextKey===controlsKey)return;
  controlsKey=nextKey;
  controls.replaceChildren();
  if(!state.joined){message("Private browser rehearsal. Your advice stays on your side.");joinPanel();return}
  if(!state.bothJoined){message("Waiting for the other coach to join…");oneAction("Refresh",refresh);return}
  if(state.paused){
   message(state.safetyNotice||"You paused this episode. No new scene will start until you resume.");
   oneAction("Resume episode",async()=>act("resume"),true);return;
  }
  if(state.finished){
   draftAdvice="";
   if(!state.hasSophia){
    if(state.version==="4.4.0"&&!state.closureDue){message("Your chapter is complete. Sophia’s reflection unlocks Sunday.");oneAction("Refresh",refresh);return;}
    message(state.closing?"Sophia is preparing your research-based closing reflection…":
     "The six scenes are finished. Sophia's separate closing reflection is next.");
    oneAction("Hear Sophia's closing reflection",async()=>act("closure"),true);
    if(!state.closing&&!autoTimer)autoTimer=setTimeout(()=>{
     autoTimer=null;
     if(!destroyed&&!inFlight&&current?.finished&&!current?.hasSophia)act("closure");
    },1200);
    return;
   }
   message("Episode complete · Sophia's research-based reflection is below.");
   return;
  }
  if(state.stage==="generating"){message("Jack and Jill are moving the story forward…");return}
  if(state.openConversation){
   if(state.pausedBy?.length){message("The story is paused.");oneAction("Refresh",refresh);return}
   if(state.canText){
    const character=state.character||"your friend";
    message("Text "+character+" whenever you want. Your advice and questions can change the story.");
    const field=el("textarea","jj4-advice");field.rows=3;field.maxLength=900;field.placeholder="Text "+character+"…";
    field.setAttribute("aria-label","Private text to "+character);
    field.value=draftAdvice;field.addEventListener("input",()=>{draftAdvice=field.value});
    controls.append(field);
    const send=oneAction("Send text",async()=>{
     const words=field.value.trim();if(words.length<2){message("Write your private message.",true);return}
     await act("text",{message:words,requestKey:crypto.randomUUID()});
    },true);
    field.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();send.click()}});
   }
   if(state.canContinue)oneAction(state.stage==="needs_scene"?(state.phaseIndex===0?"Start Monday":"Retry check-in"):"Advance to next day",async()=>act("advance"));
   if(!state.canText&&!state.canContinue)message("The next check-in will follow when the fictional day begins.");
   oneAction("Refresh",refresh);oneAction("Pause episode",async()=>act("pause"));return;
  }
  if(state.needsReply){
   if(state.version==="4.1.0"&&!state.selectedOption){
    message((state.character||"Your character")+" needs your first coaching decision.");
    for(const option of state.coachChoices||[]){
     oneAction(option.label,async()=>act("choice",{
      optionId:option.id,requestKey:crypto.randomUUID()
     }),true);
    }
    oneAction("Pause episode",async()=>act("pause"));
    return;
   }
   message(state.version==="4.4.0"?"Guide your character. Both contributions shape the next page.":["4.2.0","4.3.0"].includes(state.version)?
    "Text "+(state.character||"your character")+" privately. Your advice will shape what happens next.":
    state.version==="4.1.0"?"Respond to your character's concern. Their reply and your coaching will shape the next scene.":
    (state.character||"Your character")+" needs your advice before the next phase.");
   const field=el("textarea","jj4-advice");field.rows=3;field.maxLength=900;
   field.placeholder=state.version==="4.1.0"?"What would you say after that objection?":
    ["4.2.0","4.3.0"].includes(state.version)?"Text "+(state.character||"your character")+" like a friend. What should they do next?":
    "Reply privately to "+(state.character||"your character")+
    ". Your advice can change what happens next.";
   field.setAttribute("aria-label","Private coaching advice");
   if(draftPhase!==state.phaseIndex){draftPhase=state.phaseIndex;draftAdvice=""}
   field.value=draftAdvice;
   field.addEventListener("input",()=>{draftAdvice=field.value});
   controls.append(field);
   const send=oneAction(state.version==="4.4.0"?"Submit story contribution":"Send private advice",async()=>{
    const words=field.value.trim();
    if(words.length<2){message("Write a suggestion or question to your character.",true);return}
    await act("coach",{message:words,requestKey:crypto.randomUUID(),...(state.version==="4.4.0"?{phaseIndex:state.phaseIndex}:{})});
   },true);
   if(state.version!=="4.1.0"&&!["4.2.0","4.3.0","4.4.0"].includes(state.version))oneAction("Ask "+(state.character||"character"),async()=>{
    const words=field.value.trim();
    if(words.length<2){message("Enter a private question first.",true);return}
    await act("ask",{message:words,requestKey:crypto.randomUUID()});
   });
   if(state.version!=="4.1.0"&&!["4.2.0","4.3.0","4.4.0"].includes(state.version))oneAction("No advice this time",async()=>
    act("coach",{message:"I have no advice right now.",requestKey:crypto.randomUUID()}));
   oneAction("Pause episode",async()=>act("pause"));
   field.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();send.click()}});
   return;
  }
  if(state.stage==="awaiting"){
   if(state.submitted&&draftPhase===state.phaseIndex)draftAdvice="";
   message(["4.2.0","4.3.0"].includes(state.version)?
    (state.submitted?"Your advice is recorded. The next private check-in will follow.":"Waiting for the current day's private coaching."):
    state.submitted?"Your advice is recorded. Waiting for the other coach.":
    "Waiting for "+state.waitingFor.join(" and ")+" to advise their character.");
   oneAction("Refresh",refresh);return;
  }
  if(state.pausedBy?.length&&!state.needsReply){
   message("The other coach has paused. The story will resume when they return.");
   oneAction("Refresh",refresh);
   oneAction("Pause episode",async()=>act("pause"));return;
  }
  if(state.canContinue){
   message(["4.2.0","4.3.0"].includes(state.version)?
    (autoFailed?"The next private check-in needs a retry.":"Fast-forwarding to "+state.weekDay+"…"):
    autoFailed?"Story needs a retry. Click to continue.":
    state.scenes.length?"The next scene begins automatically…":"Both coaches joined. Starting the episode…");
   oneAction(["4.2.0","4.3.0"].includes(state.version)?(state.phaseIndex?"Continue to "+state.weekDay:"Start Monday"):
    state.scenes.length?"Continue / retry scene":"Start episode",async()=>{
    autoFailed=false;await act("advance");
   },true);
   oneAction("Pause episode",async()=>act("pause"));
   if(!autoFailed&&!autoTimer)autoTimer=setTimeout(()=>{
    autoTimer=null;if(!inFlight&&!destroyed&&current?.canContinue)act("advance");
   },1200);
   return;
  }
  if(["4.2.0","4.3.0","4.4.0"].includes(state.version)&&state.nextAvailableAt&&["flow","needs_scene"].includes(state.stage)){
   message(state.version==="4.4.0"?"Next story page: "+state.nextStoryDay+". Both contributions are saved.":"Next private check-in: "+state.weekDay+". The story will not skip ahead until that day.");
   oneAction("Refresh",refresh);return;
  }
  message("Updating the episode…");
 }
 async function refresh(){
  if(inFlight||destroyed)return;
  inFlight=true;
  try{const result=await api();if(!destroyed)render(result)}
  catch(e){if(!destroyed)message(e.message,true)}
  finally{
   inFlight=false;
   // A response can have the same UI state as before (e.g. another coach is
   // still pending). If controls were intentionally reused, restore the buttons.
   if(!destroyed)controls.querySelectorAll("button").forEach(x=>x.disabled=false);
  }
 }
 async function act(action,details={}){
  if(inFlight||destroyed)return;
  inFlight=true;
  const buttons=controls.querySelectorAll("button");
  buttons.forEach(x=>x.disabled=true);
  message(action==="advance"?"Writing the next scene…":
   action==="coach"?"Saving your advice…":
   action==="text"?"Sending your private text…":
   action==="ask"?"Asking privately…":
   action==="pause"?"Pausing episode…":
   action==="resume"?"Resuming episode…":
   action==="closure"?"Sophia is connecting the story to relationship research…":"Joining…");
  try{
   const result=await api(action,details);
   autoFailed=false;
   if(["coach","ask","text"].includes(action)){
    draftAdvice="";
    for(const field of controls.querySelectorAll("textarea"))field.value="";
   }
   if(!destroyed)render(result);
  }catch(e){if(!destroyed){
   if(action==="advance")autoFailed=true;
   message(e.message,true);buttons.forEach(x=>x.disabled=false)
  }}
  finally{
   inFlight=false;
   if(!destroyed)controls.querySelectorAll("button").forEach(x=>x.disabled=false);
  }
 }
 refresh();
 const timer=setInterval(()=>{
  if(destroyed||inFlight||!current?.joined||(current.finished&&current.hasSophia))return;
  if(current.version==="4.4.0"||current.openConversation||current.stage==="generating"||current.stage==="awaiting"||!current.bothJoined||
     (current.finished&&!current.hasSophia))refresh();
 },5000);
 return {destroy(){destroyed=true;clearInterval(timer);clearTimeout(autoTimer);root.replaceChildren()},refresh};
}
window.Anthos4Player={mount};
})();