(()=>{
"use strict";
const $=id=>document.getElementById(id);
const storedKey="anthos_jj3_private_invitation";
const url=new URL(location.href);
const supplied=url.searchParams.get("invite")||"";
if(/^[A-Za-z0-9_-]{43}$/.test(supplied)){
 sessionStorage.setItem(storedKey,supplied);
 url.searchParams.delete("invite");history.replaceState(null,"",url.pathname+url.search+url.hash);
}
const token=supplied||sessionStorage.getItem(storedKey)||"";
let state=null,busy=false,openingStep=null,queuedKey=null,queuedText="",historyOpen=false,lastProgressTry=0;
const error=t=>{$("error").textContent=t||""};
const busySet=v=>{busy=v;for(const id of ["send","commit","check","saveReflection"])$(id).disabled=v};
async function api(action,body={}){
 const option={headers:{"x-anthos-pilot-token":token},credentials:"same-origin",cache:"no-store"};
 if(action){option.method="POST";option.headers["Content-Type"]="application/json";option.body=JSON.stringify({action,...body})}
 let response;
 try{response=await fetch("/api/jack-jill-v3",option)}catch{throw Error("Couldn't reach Anthos. Your message is still here; try again.")}
 const data=await response.json().catch(()=>({error:"The server returned an incomplete response. Please retry."}));
 if(!response.ok||!data.ok)throw Error(data.error||"The pilot could not complete that request.");
 return data;
}
function messageBubble(entry){
 const kind=entry.author==="coach"?"coach":entry.author==="sophia"?"sophia":"character";
 const b=document.createElement("article");b.className="bubble "+kind;
 const who=document.createElement("span");who.className="who";
 who.textContent=kind==="coach"?"You":kind==="sophia"?"Sophia":state.character;
 b.append(who,document.createTextNode(entry.body));return b;
}
function render(s){
 state=s;
 $("welcome").hidden=s.consent;$("experience").hidden=!s.consent;
 $("welcomeTitle").textContent="Meet "+s.character;
 $("welcomeText").textContent=s.character==="Jack"
  ?"Jack is funny, restless, and trying to be a good husband without losing his sense of adventure. He has something on his mind, and he's chosen you as his sounding board."
  :"Jill is witty, independent, and tired of being the person who always has to make everything work. She trusts you enough to say what she's actually thinking.";
 $("introCharacter").textContent=s.character+" · Your new fictional friend";
 $("introIdentity").textContent=s.identity||"Your character has an inner life, not just a problem to solve.";
 $("introPortrait").textContent=s.character[0];
 $("joinForm").hidden=s.consent;
 $("missing").hidden=!!token;
 document.body.classList.toggle("jill",s.role==="jill");
 if(!s.consent)return;
 const completed=s.status==="complete";
 $("adventureLine").textContent=s.mode==="individual"?"Private solo adventure":"Two private friendships · One shared adventure";
 $("storyTitle").textContent=s.title||"An Anthos Adventure";
 $("moment").textContent=completed?"Adventure complete":"Moment "+s.step+" of 5";
 const prog=$("storyProgress");prog.replaceChildren();
 for(let n=1;n<=5;n++){const d=document.createElement("span");d.className=n<s.step||completed?"done":n===s.step?"current":"";prog.append(d)}
 $("sceneText").textContent=s.scene?.scene||"An entirely new adventure is about to begin.";
 $("chatName").textContent=s.character;
 $("chatAvatar").textContent=s.character[0];
 $("chatSubtitle").textContent=s.character==="Jack"?"Your mountain-loving, slightly chaotic friend":"Your sharp-witted friend with a lot on her mind";
 $("composeLabel").textContent="Message "+s.character;
 $("message").placeholder=s.character==="Jack"?"Talk to Jack like an actual friend…":"Talk to Jill like an actual friend…";
 const shared=s.shared||[],latest=shared.at(-1);
 $("sharedSection").hidden=!latest;
 if(latest){
  $("sharedText").textContent=latest.body;
  $("sharedLabel").textContent=s.mode==="shared"?"What Jack & Jill actually did":"Your character's story outcome";
  $("historyToggle").hidden=shared.length<2;
  $("historyToggle").textContent=historyOpen?"Hide earlier outcomes":"Show earlier outcomes ("+(shared.length-1)+")";
  const history=$("sharedHistory");history.hidden=!historyOpen;history.replaceChildren();
  if(historyOpen)for(const event of shared.slice(0,-1)){
   const p=document.createElement("p");p.className="historyitem";p.textContent="Moment "+event.step+": "+event.body;history.append(p);
  }
 }
 const log=$("chatLog");
 const wasNearBottom=log.scrollTop+log.clientHeight>=log.scrollHeight-100;
 log.replaceChildren();
 const visible=(s.messages||[]).filter(m=>m.step===s.step||(completed&&m.step===6));
 if(!visible.length){const bubble=document.createElement("div");bubble.className="bubble pending";bubble.textContent=s.character+" is putting their thoughts into words…";log.append(bubble)}
 else for(const m of visible)log.append(messageBubble(m));
 if(wasNearBottom||!log.dataset.initialized)log.scrollTop=log.scrollHeight;
 log.dataset.initialized="yes";
 $("compose").hidden=completed||s.submitted;
 $("decision").hidden=completed||s.submitted||!s.action;
 if(s.action)$("decisionText").textContent=s.action;
 $("waiting").hidden=completed||!s.submitted;
 if(s.submitted){
  $("waitingText").textContent=s.otherSubmitted?"Both moves are in. The shared story is being written.":"Your friend has made their move. We're waiting for the other private coach; nobody sees your messages.";
 }
 $("reflectionPanel").hidden=!completed;
 $("reflection").hidden=!!s.reflectionComplete;
 $("saveReflection").hidden=!!s.reflectionComplete;
 $("reflectionDone").hidden=!s.reflectionComplete;
}
async function load(quiet=false){
 if(busy)return;
 busySet(true);
 try{
  const s=await api();render(s);
  if(s.consent&&s.status==="active"&&!s.submitted&&!s.hasIntro&&openingStep!==s.step){
   openingStep=s.step;
   try{render(await api("begin"))}catch(e){openingStep=null;if(!quiet)error(e.message)}
  }
  if(s.consent&&s.submitted&&s.otherSubmitted&&!s.processing&&s.status==="active"&&Date.now()-lastProgressTry>12000){
   lastProgressTry=Date.now();
   try{render(await api("progress"))}catch(e){if(!quiet)error(e.message)}
  }
  if(!quiet)error("");
 }catch(e){if(!quiet)error(e.message)}finally{busySet(false)}
}
async function afterAction(action,data={}){
 if(busy)return false;
 busySet(true);error("");
 try{render(await api(action,data));return true}
 catch(e){error(e.message);return false}
 finally{busySet(false)}
}
$("joinForm").addEventListener("submit",async event=>{
 event.preventDefault();if(!token)return;
 if(!$("joinConsent").checked){error("Please confirm your participation before joining.");return}
 const success=await afterAction("join",{name:$("joinName").value});
 if(success)await load();
});
$("send").addEventListener("click",async()=>{
 if(busy)return;
 const text=$("message").value.trim();
 if(text.length<2){error("Write something to your character first.");return}
 if(text!==queuedText){queuedText=text;queuedKey=crypto.randomUUID()}
 const result=await afterAction("talk",{message:text,requestKey:queuedKey});
 if(result){$("message").value="";queuedKey=null;queuedText="";const log=$("chatLog");log.scrollTop=log.scrollHeight}
});
$("commit").addEventListener("click",async()=>{
 if(!state?.action||busy)return;
 if(!confirm("Let "+state.character+" try this move?\n\n"+state.action+"\n\nOnly the fictional action becomes part of the shared adventure. Your private dialogue remains private."))return;
 const ok=await afterAction("submit");
 if(!ok)await load();
});
$("check").addEventListener("click",async()=>{
 if(busy)return;
 if(state?.otherSubmitted&&state?.status==="active"){
  const ok=await afterAction("progress");if(!ok)await load();
 }else await load();
});
$("saveReflection").addEventListener("click",async()=>{
 const reflection=$("reflection").value.trim();
 if(reflection.length<12){error("Write a specific takeaway you'd like to try.");return}
 const success=await afterAction("reflect",{reflection});
 if(success)$("reflection").value="";
});
$("historyToggle").addEventListener("click",()=>{historyOpen=!historyOpen;if(state)render(state)});
document.addEventListener("keydown",event=>{
 if(event.target===$("message")&&event.key==="Enter"&&(event.ctrlKey||event.metaKey)){
  event.preventDefault();$("send").click();
 }
});
if(token){load();setInterval(()=>{if(!busy&&state?.consent&&state.status==="active")load(true)},14000)}
else{$("missing").hidden=false;$("joinForm").hidden=true;error("Open your fresh private invitation to join Jack & Jill 3.0.")}
})();