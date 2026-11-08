(()=>{
"use strict";
const $=id=>document.getElementById(id);
const key="anthos_jj2_invite";
const params=new URLSearchParams(location.search);
const supplied=params.get("invite")||"";
if(/^[A-Za-z0-9_-]{43}$/.test(supplied)){sessionStorage.setItem(key,supplied);history.replaceState(null,"",location.pathname)}
const token=supplied||sessionStorage.getItem(key)||"";
let current=null,busy=false,signature="";
function error(e=""){$("error").textContent=e}
async function api(action,data={}){
 const opt={headers:{"x-anthos-pilot-token":token},cache:"no-store",credentials:"same-origin"};
 if(action){opt.method="POST";opt.headers["Content-Type"]="application/json";opt.body=JSON.stringify({action,...data})}
 const r=await fetch("/api/jack-jill-pilot",opt);
 const j=await r.json().catch(()=>({error:"Unexpected response"}));
 if(!r.ok||!j.ok)throw new Error(j.error||"Could not reach Sophia.");
 return j;
}
function busySet(v){busy=v;$("send").disabled=v;$("advance").disabled=v||!current?.ready||current?.submitted;$("check").disabled=v}
function addBubble(host,who,body,you=false){
 const div=document.createElement("div");div.className="bubble "+(you?"you":"sophia");
 const span=document.createElement("span");span.className="who";span.textContent=who;
 div.append(span,document.createTextNode(body));host.append(div);
}
function render(s){
 current=s;
 $("welcome").hidden=s.consent;
 $("welcomeTitle").textContent=(s.title||"An Anthos Adventure").replace(/^Jack & Jill:\s*/,"");
 $("trial").hidden=!s.consent;
 $("consentForm").hidden=s.consent;
 $("missing").hidden=!!token;
 $("roleTag").textContent=s.role==="jack"?"JACK'S COACH":"JILL'S COACH";
 $("welcomeDescription").textContent=s.role==="jack"?"You'll privately advise Jack; Sophia will help you explore his decisions.":"You'll privately advise Jill; Sophia will help you explore her decisions.";
 if(!s.consent)return;
 const finished=s.roomStatus==="complete";
 $("reflectionPanel").hidden=!finished;
 $("reflection").hidden=!!s.reflectionComplete;
 $("saveReflection").hidden=!!s.reflectionComplete;
 $("reflectionStatus").textContent=s.reflectionComplete?"Your reflection has been saved privately.":"";
 $("sceneTitle").textContent=finished?"A story worth remembering":s.shared?.length?"Meanwhile, with Jack and Jill…":(s.title||"It begins…").replace(/^Jack & Jill:\s*/,"");
 $("scene").textContent=s.canon?.scene||"Sophia is preparing your story.";
 const host=$("messages");const last=host.scrollTop+host.clientHeight>=host.scrollHeight-80;
 host.replaceChildren();
 if(!s.transcript.length)addBubble(host,"Sophia",s.role==="jack"?"Jack has a situation on his hands—and you get to advise him. What would you tell him to do?":"Jill has a decision to make, and you are coaching her. What would you suggest she do?",false);
 for(const m of s.transcript)addBubble(host,m.author==="participant"?"You":"Sophia",m.body,m.author==="participant");
 if(last)host.scrollTop=host.scrollHeight;
 const sh=$("shared");sh.replaceChildren();
 for(const m of s.shared){const div=document.createElement("div");div.className="storycard";div.textContent=m.body;sh.append(div)}
 $("sharedEmpty").hidden=s.shared.length>0;
 $("entry").hidden=s.submitted||finished;
 $("waiting").hidden=!s.submitted||finished;
 if(s.submitted)$("waitText").textContent="Your decision is locked. "+(s.otherSubmitted?"Sophia is preparing the outcome.":"Your spouse's character is still being coached.")+" Your private messages are never shared.";
 $("advance").disabled=busy||!s.ready||s.submitted;
 $("advance").textContent=s.ready?"See what happens →":"Keep talking with Sophia";
 if(finished){const msg=document.createElement("p");msg.textContent="You have reached the end of this adventure. Reflect on one relationship skill you could apply in real life.";sh.append(msg)}
 const sig=s.checkpoint+":"+s.shared.length+":"+s.submitted+":"+s.transcript.length;
 signature=sig;
}
async function refresh(quiet=false){
 if(busy)return;
 busySet(true);try{const next=await api();render(next);if(!quiet)error("")}catch(e){if(!quiet)error(e.message)}finally{busySet(false)}
}
$("consentForm").addEventListener("submit",async e=>{
 e.preventDefault();if(busy)return;busySet(true);error("");
 try{render(await api("consent",{name:$("name").value}));}catch(e){error(e.message)}finally{busySet(false)}
});
$("send").addEventListener("click",async()=>{
 if(busy)return;const msg=$("response").value.trim();if(msg.length<2){error("Tell Sophia what you're thinking first.");return}
 busySet(true);error("");
 try{const result=await api("talk",{message:msg});$("response").value="";render(result)}
 catch(e){error(e.message)}finally{busySet(false)}
});
$("advance").addEventListener("click",async()=>{
 if(busy||!current?.draft)return;
 if(!confirm("Commit this latest advice to your character? Your spouse will not see this private message, but the character's actions will shape the shared story."))return;
 busySet(true);error("");
 try{render(await api("submit"))}catch(e){error(e.message)}finally{busySet(false)}
});
$("check").addEventListener("click",async()=>{if(current?.otherSubmitted&&!current?.processing){busySet(true);try{render(await api("submit"))}catch(e){error(e.message)}finally{busySet(false)}}else refresh()});
$("saveReflection").addEventListener("click",async()=>{const v=$("reflection").value.trim();if(v.length<12){error("Write one specific action or reflection first.");return}busySet(true);error("");try{render(await api("reflect",{reflection:v}))}catch(e){error(e.message)}finally{busySet(false)}});
if(token){refresh();setInterval(()=>{if(current?.consent&&current.roomStatus==="active"&&!busy)refresh(true)},12000)}
else{$("missing").hidden=false;$("consentForm").hidden=true;error("A private invitation is required.")}
})();