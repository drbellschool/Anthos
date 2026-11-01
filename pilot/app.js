(()=>{
"use strict";
const $=id=>document.getElementById(id);
const STATE_KEY="anthos_pilot_invitation_v1";
const params=new URLSearchParams(location.search);
const provided=params.get("invite");
if(provided&&/^[A-Za-z0-9_-]{43}$/.test(provided)){
 try{sessionStorage.setItem(STATE_KEY,provided)}catch{}
 try{history.replaceState(null,"",location.pathname)}catch{}
}
let token=provided||"";if(!token)try{token=sessionStorage.getItem(STATE_KEY)||""}catch{}
let state=null,busy=false,seen="",showProposal=false,lastScene=0;
const text=(id,v)=>{$(id).textContent=String(v??"")};
function error(value){text("feedback",value)}
function blocked(reason){$("blocked").hidden=false;text("blockedReason",reason);$("consent").hidden=true;$("waiting").hidden=true;$("conversation").hidden=true;$("proposalPanel").hidden=true}
async function request(action,payload={}){
 const headers={"x-anthos-pilot-token":token};
 let res;
 if(action==="status")res=await fetch("/api/pilot",{credentials:"same-origin",cache:"no-store",headers});
 else res=await fetch("/api/pilot",{method:"POST",credentials:"same-origin",
  headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({action,...payload}),cache:"no-store"});
 const data=await res.json().catch(()=>({error:"Unexpected server response."}));
 if(!res.ok)throw Object.assign(new Error(data.error||"Request failed."),{status:res.status});
 return data;
}
let commentTarget={kind:"general",chapter:1,index:null};
function openComment(kind,chapter,index=null,excerpt=""){
 if(!state?.myConsent){error("Accept the pilot consent before leaving feedback.");return}
 commentTarget={kind,chapter,index};
 text("commentTarget",excerpt?excerpt.slice(0,350):"General pilot experience");
 $("commentText").value="";text("commentStatus","");
 if(typeof $("commentDialog").showModal==="function")$("commentDialog").showModal();
 else $("commentDialog").setAttribute("open","");
}
function makeCommentButton(label,kind,chapter,index,excerpt){
 const button=document.createElement("button");button.type="button";
 button.className="comment-chip";button.textContent=label;
 button.addEventListener("click",()=>openComment(kind,chapter,index,excerpt));
 return button;
}
function renderChoices(scene,chapter){
 const host=$("choiceOptions");host.replaceChildren();
 const options=Array.isArray(scene.options)?scene.options:[];
 $("choicesBlock").hidden=!options.length;
 options.forEach((option,i)=>{
  const row=document.createElement("div");row.className="choice-row";
  const button=document.createElement("button");button.type="button";
  button.className="choice-option";button.textContent=(i+1)+". "+option;
  button.disabled=state.roomStatus!=="active";
  button.addEventListener("click",()=>{
   $("message").value=option;
   $("message").focus();
   $("message").scrollIntoView({block:"nearest"});
  });
  row.append(button,makeCommentButton("✎ Comment","option",chapter,i,option));host.append(row);
 });
 $("customChoice").disabled=state.roomStatus!=="active";
}
function renderHistory(revealed){
 const history=$("historyChapters"),list=Array.isArray(revealed)?revealed:[];
 $("chapterHistory").hidden=list.length<2;history.replaceChildren();
 for(let i=0;i<list.length-1;i++){
  const scene=list[i],card=document.createElement("article");card.className="history-entry";
  const h=document.createElement("h3");h.textContent="Chapter "+(i+1)+": "+scene.title;
  const p=document.createElement("p");p.textContent=scene.story;
  card.append(h,p,makeCommentButton("✎ Comment on chapter","chapter",i+1,null,scene.story));
  if(Array.isArray(scene.options)){
   scene.options.forEach((option,n)=>{
    const line=document.createElement("div");line.className="history-option";
    line.append(document.createTextNode((n+1)+". "+option+" "),
     makeCommentButton("✎","option",i+1,n,option));card.append(line);
   });
  }
  history.append(card);
 }
}

function renderMessages(list){
 const signature=list.length+":"+(list.at(-1)?.id||"")+":"+(state?.displayName||"")+":"+(state?.partnerName||"");
 if(seen===signature)return;
 seen=signature;const host=$("thread");const wasNearEnd=host.scrollHeight-host.scrollTop-host.clientHeight<120;
 host.replaceChildren();
 if(!list.length){const empty=document.createElement("div");empty.className="empty";empty.textContent="Start by telling your spouse whose side you're on. Sophia will join when you invite her.";host.append(empty)}
 for(const m of list){
  const bubble=document.createElement("div");
  const mine=m.author===state.role;
  bubble.className="bubble "+(m.author==="sophia"?"sophia":mine?"me":"partner");
  const label=document.createElement("small");
  label.textContent=m.author==="sophia"?"SOPHIA":mine?(state.displayName||"YOU").toUpperCase():(state.partnerName||"YOUR SPOUSE").toUpperCase();
  bubble.append(label,document.createTextNode(m.body));
  bubble.append(makeCommentButton("✎ Comment","message",m.chapter_number||1,m.id,m.body));
  host.append(bubble);
 }
 if(wasNearEnd||list.length<5)host.scrollTop=host.scrollHeight;
}
function render(){
 if(!state)return;
 $("blocked").hidden=true;
 text("connection",state.roomStatus==="completed"?"Complete":state.ready?"Connected · both spouses joined":"Waiting for consent");
 const isReady=state.ready,isActive=state.roomStatus==="active";
 $("consent").hidden=state.myConsent;
 $("waiting").hidden=!state.myConsent||state.partnerConsent;
 if(state.myConsent&&!state.partnerConsent)text("consentStatus","You agreed. Waiting for the other invitation.");
 if(!state.myConsent)text("consentStatus",state.partnerConsent?"Your spouse has agreed. Your consent is needed.":"Both spouses must agree to begin.");
 $("conversation").hidden=!isReady;
 $("storyMoment").hidden=!isReady;
 $("chapterHistory").hidden=!isReady||!(state?.revealedChapters?.length>1);
 document.querySelector(".room").classList.toggle("is-live",isReady);
 if(!isReady){$("proposalPanel").hidden=true;return}
 const scene=state.scene||{};
 text("momentCount",(state.storyFormat==="full"?"CHAPTER ":"MOMENT ")+(state.storyBeat||1)+" OF "+(state.storyBeatCount||3));
 text("momentTitle",scene.title||"The Saturday Surprise");
 text("momentStory",scene.story||"");
 text("momentQuestion",scene.prompt||"");
 if(lastScene!==(state.storyBeat||1)){lastScene=state.storyBeat||1;$("choicesBlock").open=false;$("storyMoment").scrollTop=0;}
 const outcome=state.chapterOutcome;
 $("outcomeCard").hidden=!outcome;
 text("outcomeText",outcome?.consequence||"");
 renderChoices(scene,state.storyBeat||1);
 renderHistory(state.revealedChapters);
 text("generalComment","✎ Comment"+(state.myComments?.length?" ("+state.myComments.length+")":""));
 text("identity",(state.displayName||("Spouse "+state.role.toUpperCase()))+" · with "+(state.partnerName||"your spouse"));
 text("nameButton",state.displayName?"✎ "+state.displayName:"✎ Add your name");
 text("remaining",state.aiRepliesLeft+" Sophia replies left");
 $("connection").title="Sophia may join after both people speak in this chapter.";
 renderMessages(state.messages);
 const countA=state.messages.filter(m=>m.author==="a").length;
 const countB=state.messages.filter(m=>m.author==="b").length;
 $("send").disabled=busy||!isActive;
 $("message").disabled=busy||!isActive;
 $("ask").disabled=busy||!isActive||!state.messages.some(m=>m.chapter_number===(state.storyBeat||1)&&m.author==="a")||!state.messages.some(m=>m.chapter_number===(state.storyBeat||1)&&m.author==="b")||state.aiRepliesLeft===0||state.messages.at(-1)?.author==="sophia";
 $("proposeButton").disabled=busy||(!isActive&&state.roomStatus!=="proposed")||(isActive&&(countA<1||countB<1));
 $("proposeButton").textContent=state.roomStatus==="active"?"We have an answer":"View our answer";
 $("proposeButton").hidden=state.roomStatus==="active"&&state.storyFormat==="full"&&((state.storyBeat||1)<8||!state.chapterOutcome);
 const full=state.storyFormat==="full";
 const current=state.messages.filter(m=>m.chapter_number===(state.storyBeat||1));
 const bothCurrent=current.some(m=>m.author==="a")&&current.some(m=>m.author==="b");
 $("resolve").hidden=!isActive||!full||!!state.chapterOutcome;
 $("resolve").disabled=busy||!bothCurrent;
 $("resolve").textContent=bothCurrent?"✧ See what happens":"Both spouses respond first";
 $("nextMoment").hidden=!isActive||(state.storyBeat||1)>=(state.storyBeatCount||3)||(full&&!state.chapterOutcome);
 $("nextMoment").disabled=busy||!isActive;
 const inReview=showProposal||state.roomStatus!=="active";
 $("proposalPanel").hidden=!inReview;
 if(!inReview)return;
 const proposed=state.proposal;
 $("proposeForm").hidden=state.roomStatus!=="active";
 $("confirmAnswer").hidden=state.roomStatus!=="proposed";
 $("finished").hidden=state.roomStatus!=="completed";
 const proposer=Boolean(proposed&&proposed.by===state.role);
 text("proposalText",proposed?.text||"");
 text("proposalHeading",state.roomStatus==="completed"?"Your answer is confirmed":state.roomStatus==="proposed"?(proposer?"Waiting for your spouse":"Please review your spouse’s answer"):"Ready to finish together?");
 text("proposalStep",state.roomStatus==="completed"?"DEEP DIVE COMPLETE":state.roomStatus==="proposed"?"FINAL CONFIRMATION":"YOUR SHARED ANSWER");
 text("proposalInstruction",state.roomStatus==="completed"?"You both agreed on this response.":state.roomStatus==="proposed"?(proposer?"You submitted this answer. Your spouse can approve it or reopen the discussion on their own screen.":"Read the answer below. Confirm if it reflects what you both agreed on, or continue discussing it."):"Write the answer you reached together. Your spouse will confirm it.");
 if(proposed){
  text("approvalMessage",proposer?"No action needed from you right now.":"Your confirmation will complete the Deep Dive.");
  $("approveAnswer").hidden=proposer;
  $("reopen").hidden=proposer;
 }
 $("backChat").hidden=state.roomStatus!=="active";
 $("answerComment").hidden=!proposed;
}
async function refresh(){
 if(busy||!token)return;
 try{state=await request("status");error("");render()}
 catch(e){if(e.status===401||e.status===410)blocked(e.message);else error(e.message)}
}
async function act(action,payload={}){
 if(busy||!token)return false;
 busy=true;error(action==="resolve"?"Writing Jack and Jill's next scene…":"Working…");render();
 let succeeded=false;
 try{state=await request(action,payload);error("");render();succeeded=true}
 catch(e){error(e.message)}
 finally{busy=false;render()}
 return succeeded;
}
function init(){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)){blocked("Your personal invitation link must include an invitation token. Ask the pilot administrator for a new link.");return}
 $("consentCheck").addEventListener("change",()=>{$("agree").disabled=!$("consentCheck").checked||!$("consentName").value.trim()});
 $("consentName").addEventListener("input",()=>{$("agree").disabled=!$("consentCheck").checked||!$("consentName").value.trim()});
 $("agree").addEventListener("click",()=>{
  const name=$("consentName").value.trim();
  if(!name){error("Enter the name or nickname Sophia should use.");$("consentName").focus();return;}
  act("consent",{name});
 });
 $("nameButton").addEventListener("click",()=>{
  $("editName").value=state?.displayName||"";
  text("nameFeedback","");
  $("nameDialog").showModal();
 });
 $("closeName").addEventListener("click",()=>$("nameDialog").close());
 $("cancelName").addEventListener("click",()=>$("nameDialog").close());
 $("saveName").addEventListener("click",async()=>{
  const name=$("editName").value.trim();
  if(!name){text("nameFeedback","Enter your first name or nickname.");return}
  const ok=await act("name",{name});
  if(ok)$("nameDialog").close();
  else text("nameFeedback",$("feedback").textContent);
 });
 $("send").addEventListener("click",async()=>{
  const value=$("message").value.trim();if(!value)return;
  if(await act("send",{message:value}))$("message").value="";
 });
 $("message").addEventListener("keydown",e=>{
  if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();$("send").click()}
 });
 $("generalComment").addEventListener("click",()=>openComment("general",state?.storyBeat||1));
 $("chapterComment").addEventListener("click",()=>openComment("chapter",state?.storyBeat||1,null,state?.scene?.story||""));
 $("customChoice").addEventListener("click",()=>{$("message").value="";$("message").focus();$("message").scrollIntoView({block:"nearest"})});
 $("answerComment").addEventListener("click",()=>openComment("answer",state?.storyBeat||1,null,state?.proposal?.text||""));
 $("closeComment").addEventListener("click",()=>$("commentDialog").close());
 $("cancelComment").addEventListener("click",()=>$("commentDialog").close());
 $("submitComment").addEventListener("click",async()=>{
  if(busy)return;
  const feedback=$("commentText").value.trim();
  if(feedback.length<3){text("commentStatus","Please write at least 3 characters.");return}
  text("commentStatus","Saving your comment…");
  await act("comment",{...commentTarget,feedback});
  if($("feedback").textContent){text("commentStatus",$("feedback").textContent);return}
  text("commentStatus","Saved privately for Anthos beta review.");
  $("commentText").value="";
  $("submitComment").textContent="Saved ✓";
  setTimeout(()=>{$("submitComment").textContent="Save comment";$("commentDialog").close()},650);
 });
 $("ask").addEventListener("click",()=>act("ask"));
 $("resolve").addEventListener("click",async()=>{if(await act("resolve")){$("storyMoment").scrollTop=$("storyMoment").scrollHeight;}});
 $("outcomeComment").addEventListener("click",()=>openComment("outcome",state?.storyBeat||1,null,state?.chapterOutcome?.consequence||""));
 $("nextMoment").addEventListener("click",async()=>{
  await act("next");
  if(state) $("storyMoment").scrollTop=0;
 });
 $("proposeButton").addEventListener("click",()=>{showProposal=true;render();$("proposalPanel").scrollIntoView({block:"nearest"})});
 $("submitAnswer").addEventListener("click",()=>{const value=$("answer").value.trim();if(value.length<3){error("Write a shared answer before submitting.");return}act("propose",{answer:value})});
 $("approveAnswer").addEventListener("click",()=>act("accept"));
 $("reopen").addEventListener("click",async()=>{await act("reopen");showProposal=false;render()});
 $("backChat").addEventListener("click",()=>{showProposal=false;render();$("conversation").scrollIntoView({block:"nearest"})});
 refresh();setInterval(refresh,4500);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();