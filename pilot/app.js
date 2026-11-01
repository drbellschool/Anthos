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
let state=null,busy=false,seen="",showProposal=false;
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
function renderMessages(list){
 const signature=list.length+":"+(list.at(-1)?.id||"");
 if(seen===signature)return;
 seen=signature;const host=$("thread");const wasNearEnd=host.scrollHeight-host.scrollTop-host.clientHeight<120;
 host.replaceChildren();
 if(!list.length){const empty=document.createElement("div");empty.className="empty";empty.textContent="Start by telling your spouse whose side you're on. Sophia will join when you invite her.";host.append(empty)}
 for(const m of list){
  const bubble=document.createElement("div");
  const mine=m.author===state.role;
  bubble.className="bubble "+(m.author==="sophia"?"sophia":mine?"me":"partner");
  const label=document.createElement("small");
  label.textContent=m.author==="sophia"?"SOPHIA":mine?"YOU":"YOUR SPOUSE";
  bubble.append(label,document.createTextNode(m.body));host.append(bubble);
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
 if(!isReady){$("proposalPanel").hidden=true;return}
 text("identity",state.role==="a"?"Spouse A · shared room":"Spouse B · shared room");
 text("remaining",state.aiRepliesLeft+" Sophia replies left");
 renderMessages(state.messages);
 const countA=state.messages.filter(m=>m.author==="a").length;
 const countB=state.messages.filter(m=>m.author==="b").length;
 $("send").disabled=busy||!isActive;
 $("message").disabled=busy||!isActive;
 $("ask").disabled=busy||!isActive||countA<1||countB<1||state.aiRepliesLeft===0||state.messages.at(-1)?.author==="sophia";
 $("proposeButton").disabled=busy||(!isActive&&state.roomStatus!=="proposed")||(isActive&&(countA<1||countB<1));
 $("proposeButton").textContent=state.roomStatus==="active"?"We have an answer":"View our answer";
 const inReview=showProposal||state.roomStatus!=="active";
 $("proposalPanel").hidden=!inReview;
 if(!inReview)return;
 const proposed=state.proposal;
 $("proposeForm").hidden=state.roomStatus!=="active";
 $("confirmAnswer").hidden=state.roomStatus!=="proposed";
 $("finished").hidden=state.roomStatus!=="completed";
 text("proposalText",proposed?.text?"Your proposed shared answer: “"+proposed.text+"”":"Write what you've decided together. The other spouse will confirm before the session ends.");
 if(proposed){
  const isProposer=proposed.by===state.role;
  text("approvalMessage",isProposer?"Your spouse needs to confirm before the session is marked complete.":"Your spouse proposed this answer. Does it capture what you both agreed?");
  $("approveAnswer").hidden=isProposer;
  $("reopen").hidden=false;
 }
 $("backChat").hidden=state.roomStatus==="completed";
}
async function refresh(){
 if(busy||!token)return;
 try{state=await request("status");error("");render()}
 catch(e){if(e.status===401||e.status===410)blocked(e.message);else error(e.message)}
}
async function act(action,payload={}){
 if(busy||!token)return;
 busy=true;error("Working…");render();
 try{state=await request(action,payload);error("");render()}
 catch(e){error(e.message)}
 finally{busy=false;render()}
}
function init(){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)){blocked("Your personal invitation link must include an invitation token. Ask the pilot administrator for a new link.");return}
 $("consentCheck").addEventListener("change",e=>$("agree").disabled=!e.target.checked);
 $("agree").addEventListener("click",()=>act("consent"));
 $("send").addEventListener("click",async()=>{
  const value=$("message").value.trim();if(!value)return;
  await act("send",{message:value});
  if(state&&state.messages.at(-1)?.author===state.role)$("message").value="";
 });
 $("message").addEventListener("keydown",e=>{
  if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();$("send").click()}
 });
 $("ask").addEventListener("click",()=>act("ask"));
 $("proposeButton").addEventListener("click",()=>{showProposal=true;render();$("proposalPanel").scrollIntoView({block:"nearest"})});
 $("submitAnswer").addEventListener("click",()=>{const value=$("answer").value.trim();if(value.length<3){error("Write a shared answer before submitting.");return}act("propose",{answer:value})});
 $("approveAnswer").addEventListener("click",()=>act("accept"));
 $("reopen").addEventListener("click",async()=>{await act("reopen");showProposal=false;render()});
 $("backChat").addEventListener("click",()=>{showProposal=false;render();$("conversation").scrollIntoView({block:"nearest"})});
 refresh();setInterval(refresh,4500);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();