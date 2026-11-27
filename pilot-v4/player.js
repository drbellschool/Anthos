// Shared storybook reader. One page, with one or two independently authenticated contributions.
(()=>{
"use strict";
const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
function mount(root,invite,options={}){
 const tokens={jack:String(invite||"")};if(options.secondInvite)tokens.jill=String(options.secondInvite);
 const states={},drafts={},safetyNotices={},urls=new Map(),requested=new Set();
 let dead=false,busy=false,failed="",signature="",selected=null,auto=null,refreshing=false,syncEpoch=0;
 root.replaceChildren();root.classList.add("jj44-reader");
 const heading=el("header","jj44-heading"),brand=el("p","jj44-kicker","THE ADVENTURES OF JACK & JILL"),title=el("h2","jj44-chapter","Your storybook"),week=el("nav","jj44-week"),notice=el("p","jj44-notice","Opening your chapter…"),page=el("section","jj44-sheet"),inputs=el("section","jj44-contributions");
 notice.setAttribute("role","status");heading.append(brand,title,week);root.append(heading,notice,page,inputs);
 const say=(s,error=false)=>{notice.textContent=s;notice.classList.toggle("error",error)};
 async function api(key,action,details={}){
  const r=await fetch("/api/jack-jill-v4",{method:action?"POST":"GET",headers:{"x-anthos-v4-invite":tokens[key],...(action?{"Content-Type":"application/json"}:{})},credentials:"omit",cache:"no-store",...(action?{body:JSON.stringify({action,...details})}:{})});
  const data=await r.json().catch(()=>({}));if(!r.ok||!data.ok)throw Error(data.error||"The storybook could not connect.");
  if(data.version!=="4.4.0")throw Error("This archived invitation is no longer part of the storybook. Ask for a new storybook invitation.");
  return data;
 }
 function button(parent,text,fn,primary=false){const b=el("button","jj4-button"+(primary?" primary":""),text);b.type="button";b.onclick=()=>{if(!busy&&!dead)fn()};parent.append(b);return b}
 async function sync(){const epoch=++syncEpoch;const entries=await Promise.all(Object.keys(tokens).map(async k=>[k,await api(k)]));if(dead||epoch!==syncEpoch)return;for(const [k,v] of entries)states[k]=v;render()}
 async function perform(key,action,details={}){
  if(busy||dead)return;busy=true;++syncEpoch;failed="";root.setAttribute("aria-busy","true");
  const labels={advance:"Writing the next page…",illustrate:"Our illustrator is painting this page…",coach:"Saving your contribution…",closure:"Sophia is preparing the final reflection…",join:"Opening your chapter…"};
  say(labels[action]||"Updating the storybook…");
  try{const result=await api(key,action,details);if(result.safetyNotice)safetyNotices[key]=result.safetyNotice;if(action==="resume")delete safetyNotices[key];if(action==="coach"&&result.submitted)delete drafts[key+":"+details.phaseIndex];await sync()}
  catch(e){failed=e.message;try{await sync()}catch{}say(failed,true);signature=""}
  finally{busy=false;root.removeAttribute("aria-busy");if(!dead)render()}
 }
 function queue(key,action,details={}){
  if(busy||dead||failed||auto)return;
  auto=setTimeout(()=>{auto=null;if(!busy&&!dead&&!failed)perform(key,action,details)},250);
 }
 async function image(holder,key,item){
  const img=el("img","jj44-art-image");img.alt="Illustration for "+item.storyTitle;holder.append(img);
  try{if(!urls.has(item.phase_index)){
   const r=await fetch("/api/jack-jill-v4?artDay="+item.phase_index,{headers:{"x-anthos-v4-invite":tokens[key]},credentials:"omit",cache:"no-store"});
   if(!r.ok||!r.headers.get("content-type")?.startsWith("image/jpeg"))throw Error("Artwork unavailable");
   const blob=await r.blob();if(dead)return;const u=URL.createObjectURL(blob);if(urls.has(item.phase_index))URL.revokeObjectURL(u);else urls.set(item.phase_index,u);
  }if(!dead)img.src=urls.get(item.phase_index)}
  catch{if(!dead&&holder.isConnected){holder.replaceChildren(el("p","jj44-art-note","Artwork could not load."));button(holder,"Reload artwork",()=>{holder.replaceChildren();image(holder,key,item)})}}
 }
 function render(){
  if(dead)return;const keys=Object.keys(tokens),key=keys.find(k=>states[k]?.joined)||keys[0],s=states[key];if(!s)return;
  const scenes=(s.scenes||[]).filter(x=>x.kind==="scene"),last=scenes.at(-1),reflection=(s.scenes||[]).find(x=>x.kind==="sophia"),active=s.hasSophia?6:(last?.phase_index??0);
  const view=selected===null?active:selected;const item=scenes.find(x=>x.phase_index===view);
  const fp=JSON.stringify([view,s.title,s.stage,s.phaseIndex,s.canContinue,s.hasSophia,s.closureDue,s.pausedBy,keys.map(k=>safetyNotices[k]),scenes.map(x=>[x.id,x.artState]),keys.map(k=>[states[k]?.joined,states[k]?.firstName,states[k]?.phaseIndex,states[k]?.needsReply,states[k]?.submitted,states[k]?.messages?.filter(m=>m.kind==="prompt").map(m=>m.id)]),failed]);
  if(fp!==signature){
   signature=fp;title.textContent=s.title;week.replaceChildren();
   for(let i=0;i<7;i++){const available=scenes.some(x=>x.phase_index===i)||(i===6&&s.hasSophia);const b=el("button","jj44-day"+(i===view?" active":available?" done":""),days[i].slice(0,3));b.type="button";b.disabled=!available;b.setAttribute("aria-label",days[i]);if(i===view)b.setAttribute("aria-current","page");b.onclick=()=>{selected=i===active?null:i;render()};week.append(b)}
   const focused=document.activeElement;const focusKey=focused?.getAttribute?.("data-draft-key");const selection=focusKey?[focused.selectionStart,focused.selectionEnd]:null;
   page.replaceChildren();inputs.replaceChildren();
   if(view==="chapter"&&reflection){
    page.append(el("p","jj44-kicker","YOUR COMPLETED CHAPTER"));
    for(const scene of scenes){const section=el("article","jj44-chapter-page");section.append(el("p","jj44-kicker",days[scene.phase_index]),el("h3","jj44-page-title",scene.storyTitle));const holder=el("div","jj44-art");section.append(holder);if(scene.artState==="ready")image(holder,key,scene);else holder.append(el("p","jj44-art-note","Illustration unavailable."));section.append(el("p","jj44-story-text",scene.storyText));if(scene.takeawayText)section.append(el("p","jj44-takeaway",scene.takeawayText));page.append(section)}
    page.append(el("h3","jj44-page-title","Sunday · A moment with Sophia"),el("p","jj44-story-text",reflection.body));
   }else if(view===6&&reflection){
    page.append(el("p","jj44-kicker","SUNDAY · YOUR COMPLETED CHAPTER"),el("h3","jj44-page-title","A moment with Sophia"),el("p","jj44-story-text",reflection.body));
    button(page,"Read the complete chapter",()=>{selected="chapter";render()});
   }else if(item){
    page.append(el("p","jj44-kicker",days[view].toUpperCase()+" · PAGE "+(view+1)),el("h3","jj44-page-title",item.storyTitle));
    const holder=el("div","jj44-art");page.append(holder);
    if(item.artState==="ready")image(holder,key,item);
    else{holder.append(el("p","jj44-art-note",item.artState==="unavailable"?"The artwork could not be approved. Your written page is saved.":"The illustrator is preparing this scene…"));
     if(item.artState==="retry"||failed&&item.artState==="missing")button(holder,"Retry illustration",()=>perform(key,"illustrate",{phaseIndex:view}));
    }
    page.append(el("p","jj44-story-text",item.storyText));const notes=el("div","jj44-page-notes"),sophia=el("aside","jj44-sophia");sophia.append(el("strong","","✿ Sophia"),el("p","",item.sophiaText));notes.append(sophia);
    if(item.takeawayText){const takeaway=el("aside","jj44-takeaway");takeaway.append(el("strong","","The Takeaway"),el("p","",item.takeawayText));notes.append(takeaway)}page.append(notes);
   }else page.append(el("p","jj44-story-text",s.joined?"Your opening page is being prepared.":"Welcome! Join the chapter and help Jack and Jill write their story."));
   for(const k of keys){
    const st=states[k];if(!st)continue;
    const character=st.character||(st.role==="jack"?"Jack":"Jill"),card=el("div","jj44-contribution");
    if(safetyNotices[k])card.append(el("p","jj44-notice error",safetyNotices[k]));
    if(!st.joined){card.append(el("strong","","Guide "+character));const name=el("input","jj4-name");name.placeholder="Your first name";name.maxLength=32;name.setAttribute("data-draft-key",k+":name");name.value=drafts[k+":name"]||"";name.oninput=()=>{drafts[k+":name"]=name.value};card.append(name);const join=button(card,"Join the story",()=>{if(name.value.trim())perform(k,"join",{name:name.value.trim()});else say("Enter your first name.",true)},true);name.onkeydown=e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();join.onclick()}};inputs.append(card);continue}
    if(!item||view!==active||s.finished||st.phaseIndex!==s.phaseIndex)continue;
    const prompt=(st.messages||[]).filter(m=>m.kind==="prompt"&&m.phase_index===view).at(-1);
    if(!prompt)continue;
    card.append(el("h4","",(st.firstName||"Your turn")+" — Guide "+character),el("p","jj44-question",prompt.body));
    if(st.submitted||!st.needsReply)card.append(el("p","jj44-saved","✓ Contribution saved"));
    else if(s.pausedBy?.length)card.append(el("p","jj44-art-note","The story is paused."));
    else if(item.artState==="ready"||item.artState==="unavailable"||item.artState==="retry"){
     const field=el("textarea","jj4-advice");field.rows=3;field.maxLength=900;field.placeholder="What should "+character+" do next?";field.setAttribute("aria-label","Your contribution for "+character);
     const dk=k+":"+view;field.setAttribute("data-draft-key",dk);field.value=drafts[dk]||"";field.oninput=()=>{drafts[dk]=field.value};card.append(field);
     button(card,"Contribute to the next page",()=>{if(field.value.trim().length<2){say("Write a suggestion for "+character+".",true);return}perform(k,"coach",{phaseIndex:view,message:field.value.trim(),requestKey:crypto.randomUUID()})},true);
    }else card.append(el("p","jj44-art-note","Your turn opens when the illustration is ready."));
    inputs.append(card);
   }
   if(view!==active)button(inputs,"Return to the current page",()=>{selected=null;render()});
   if(s.pausedBy?.length){for(const k of keys)if(states[k]?.paused)button(inputs,"Resume story",()=>perform(k,"resume"))}
   else if(s.joined&&!s.finished)button(inputs,"Pause story",()=>perform(key,"pause"));
   if(failed&&s.canContinue)button(inputs,"Retry writing the page",()=>perform(key,"advance"),true);
   if(failed&&s.finished&&!s.hasSophia)button(inputs,"Retry Sophia's reflection",()=>perform(key,"closure"),true);
   if(focusKey){const field=Array.from(inputs.querySelectorAll?.("[data-draft-key]")||[]).find(x=>x.getAttribute("data-draft-key")===focusKey);if(field){field.focus();if(selection&&typeof field.setSelectionRange==="function")field.setSelectionRange(...selection)}}
  }
  if(busy)return;
  if(failed){say(failed,true);return}
  if(!s.bothJoined){say("Both co-authors need to join before Monday begins.");return}
  if(s.pausedBy?.length){say("The story is paused.");return}
  const needsArt=scenes.find(x=>x.artState==="missing");
  if(needsArt&&!requested.has(needsArt.phase_index)&&scenes.filter(x=>x.phase_index<needsArt.phase_index).every(x=>["ready","unavailable"].includes(x.artState))){
   requested.add(needsArt.phase_index);say("Creating your illustration…");queue(key,"illustrate",{phaseIndex:needsArt.phase_index});return;
  }
  if(last&&["missing","generating"].includes(last.artState)){say(last.artState==="retry"?"The illustration needs another try.":"The illustrator is preparing your page…");return}
  if(s.finished){if(s.hasSophia)say("Your chapter is complete. Read any page above.");else if(s.closureDue){say("Sophia is preparing Sunday’s reflection…");queue(key,"closure")}else say("Your final reflection opens Sunday.");return}
  if(s.canContinue){say("Writing "+(s.nextStoryDay||days[s.phaseIndex])+"…");queue(key,"advance");return}
  if(s.stage==="generating"){say("The next page is being written…");return}
  say(s.waitingFor?.length?"Both contributions shape tomorrow’s page.":"Your next page will open on "+(s.nextStoryDay||"the scheduled day")+".");
 }
 async function refresh(){if(busy||dead||refreshing)return;refreshing=true;try{await sync()}catch(e){if(!busy&&!dead)say(e.message,true)}finally{refreshing=false}}
 refresh();const timer=setInterval(refresh,4000);
 return {refresh,destroy(){dead=true;clearInterval(timer);clearTimeout(auto);for(const u of urls.values())URL.revokeObjectURL(u);root.replaceChildren()}};
}
window.Anthos4Player={mount};
})();
