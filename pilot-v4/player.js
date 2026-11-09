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
  for(const x of [...state.scenes,...state.messages].sort((a,b)=>a.id-b.id)){
   if(seen.has(x.id+"-"+x.kind))continue;
   seen.add(x.id+"-"+x.kind);entries.push(x);
  }
  const fp=entries.map(x=>x.id+":"+x.body.length).join("|");
  if(fp===lastFingerprint)return;
  lastFingerprint=fp;
  area.replaceChildren();
  if(!entries.length)area.append(el("div","jj4-empty","The episode begins once both coaches join."));
  for(const item of entries){
   const isScene=item.kind==="scene";
   const row=el("article","jj4-entry "+(isScene?"scene":item.kind==="coach"?"coach":"prompt"));
   row.append(el("span","jj4-entry-label",isScene?"SCENE · "+(item.phase_index+1):item.kind==="coach"?"YOUR PRIVATE ADVICE":
    (state.character||"Character").toUpperCase()+" · PRIVATE"));
   row.append(el("p","",item.body));area.append(row);
  }
  if(entries.length)area.scrollTop=area.scrollHeight;
 }
 function render(state){
  current=state;
  title.textContent=(state.role==="jack"?"Husband · Jack":"Wife · Jill");
  phase.textContent=state.phase+" · "+(state.phaseIndex+1)+"/6";
  transcript(state);
  // A background status poll can return every five seconds while a participant
  // is typing. Only rebuild controls when their *meaningful* state changes;
  // rebuilding on every poll erased drafts and stole focus mid-sentence.
  const nextKey=[
   state.role,state.joined,state.bothJoined,state.phaseIndex,state.stage,
   state.needsReply,state.submitted,state.finished,state.canContinue,
   // Another coach submitting is not a reason to steal this coach's focus.
   state.needsReply?"":(state.waitingFor?.join(",")||""),state.scenes?.length||0,autoFailed
  ].join("|");
  if(nextKey===controlsKey)return;
  controlsKey=nextKey;
  controls.replaceChildren();
  if(!state.joined){message("Private browser rehearsal. Your advice stays on your side.");joinPanel();return}
  if(!state.bothJoined){message("Waiting for the other coach to join…");oneAction("Refresh",refresh);return}
  if(state.finished){draftAdvice="";message("Episode complete · six-phase story finished.");return}
  if(state.stage==="generating"){message("Jack and Jill are moving the story forward…");return}
  if(state.needsReply){
   message((state.character||"Your character")+" needs your advice before the next phase.");
   const field=el("textarea","jj4-advice");field.rows=3;field.maxLength=900;
   field.placeholder="What should your character consider doing next?";
   field.setAttribute("aria-label","Private coaching advice");
   if(draftPhase!==state.phaseIndex){draftPhase=state.phaseIndex;draftAdvice=""}
   field.value=draftAdvice;
   field.addEventListener("input",()=>{draftAdvice=field.value});
   controls.append(field);
   const send=oneAction("Send private advice",async()=>{
    const words=field.value.trim();
    if(words.length<2){message("Write a suggestion to your character.",true);return}
    await act("coach",{message:words,requestKey:crypto.randomUUID()});
   },true);
   field.addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();send.click()}});
   return;
  }
  if(state.stage==="awaiting"){
   if(state.submitted&&draftPhase===state.phaseIndex)draftAdvice="";
   message(state.submitted?"Your advice is recorded. Waiting for the other coach.":"Waiting for "+state.waitingFor.join(" and ")+" to advise their character.");
   oneAction("Refresh",refresh);return;
  }
  if(state.canContinue){
   message(autoFailed?"Story needs a retry. Click to continue.":
    state.scenes.length?"The next scene begins automatically…":"Both coaches joined. Starting the episode…");
   oneAction(state.scenes.length?"Continue / retry scene":"Start episode",async()=>{
    autoFailed=false;await act("advance");
   },true);
   if(!autoFailed&&!autoTimer)autoTimer=setTimeout(()=>{
    autoTimer=null;if(!inFlight&&!destroyed&&current?.canContinue)act("advance");
   },1200);
   return;
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
  message(action==="advance"?"Writing the next scene…":action==="coach"?"Saving your advice…":"Joining…");
  try{
   const result=await api(action,details);
   autoFailed=false;
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
  if(destroyed||inFlight||!current?.joined||current.finished)return;
  if(current.stage==="generating"||current.stage==="awaiting"||!current.bothJoined)refresh();
 },5000);
 return {destroy(){destroyed=true;clearInterval(timer);clearTimeout(autoTimer);root.replaceChildren()},refresh};
}
window.Anthos4Player={mount};
})();