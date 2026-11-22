// Sophia's Insight Atlas customer view. Preview/demo remains separate.
// Auth tokens are held ONLY in memory. Source text is always textContent.
(()=>{
"use strict";
const $=id=>document.getElementById(id),status=(s)=>{$("atlasAuthStatus").textContent=s};
let config=null,accessToken=null,catalog=[],annual={movements:[],evidence:[],skills:[]},lastEpisode=null;
const api=async(path,body)=>{
 if(!accessToken)throw Error("Sign in to access your private couple record.");
 const res=await fetch("/api/insight-atlas"+path,{method:body?"POST":"GET",
  headers:{"Authorization":"Bearer "+accessToken,...(body?{"Content-Type":"application/json"}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),cache:"no-store"});
 const data=await res.json().catch(()=>({error:"Could not read the Atlas response."}));
 if(!res.ok)throw Error(data.error||"Atlas could not complete the request.");
 return data;
};
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function message(into,text){$(into).replaceChildren(el("p",text,"tiny muted"))}
async function init(){
 const fragment=new URLSearchParams(location.hash.replace(/^#/,""));
 const returned=fragment.get("access_token");
 if(returned&&/^[A-Za-z0-9._-]{40,}$/.test(returned)){
  accessToken=returned;
  history.replaceState(null,"",location.pathname+location.search);
 }
 try{
  const r=await fetch("/api/atlas-public-config",{cache:"no-store"});
  config=await r.json();
 }catch{config={available:false}}
 if(!config?.available){
  text("atlasAuthOff","Secure couple sign-in isn't configured for this preview yet. Fictional Atlas demonstration remains available below.");
  return;
 }
 $("atlasAuthOff").hidden=true;
 $("atlasAuthArea").hidden=!!accessToken;
 $("atlasConnected").hidden=!accessToken;
 if(accessToken)await loadEpisodes().catch(e=>{signOut();status(e.message)});
}
function text(id,value){$(id).textContent=value}
function signOut(){
 accessToken=null;$("atlasAuthArea").hidden=false;$("atlasConnected").hidden=true;
 $("atlasLiveReview").hidden=true;
}
async function sendMagicLink(){
 if(!config?.available)throw Error("Account sign-in is not available yet.");
 const email=$("atlasEmail").value.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error("Enter your account email.");
 const res=await fetch(config.authOrigin+"/auth/v1/otp",{
  method:"POST",headers:{"apikey":config.publishableKey,"Content-Type":"application/json"},
  body:JSON.stringify({email,create_user:false,email_redirect_to:location.origin+"/insight-atlas/"})
 });
 if(!res.ok)throw Error("Unable to request a sign-in message. Confirm that your Anthos account is activated.");
 status("If this email belongs to an activated Anthos account, check your inbox for a secure sign-in link or code.");
}
async function verifyCode(){
 const email=$("atlasEmail").value.trim(),code=$("atlasCode").value.trim();
 if(!email||!/^[0-9]{6,8}$/.test(code))throw Error("Enter the email address and verification code.");
 const res=await fetch(config.authOrigin+"/auth/v1/verify",{
  method:"POST",headers:{"apikey":config.publishableKey,"Content-Type":"application/json"},
  body:JSON.stringify({email,token:code,type:"email"})
 });
 const data=await res.json().catch(()=>({}));
 if(!res.ok||!data.access_token)throw Error("This code is invalid or expired.");
 accessToken=data.access_token;$("atlasAuthArea").hidden=true;$("atlasConnected").hidden=false;
 await loadEpisodes();
}
async function loadEpisodes(){
 const [results,skills]=await Promise.all([api("?mode=episodes"),api("?mode=catalog")]);
 catalog=skills.skills||[];
 const target=$("atlasEpisodes");target.replaceChildren();
 if(!results.episodes?.length)target.append(el("p","No verified Deep Dives are linked yet.","tiny muted"));
 for(const ep of results.episodes||[]){
  const line=el("div",undefined,"live-episode"),label=el("div");
  label.append(el("strong",ep.title),el("div",ep.status==="complete"?"Completed":"In progress","tiny muted"));
  const button=el("button","View our story");
  button.type="button";
  button.onclick=async()=>{
   button.disabled=true;
   try{
    // Recording a finished episode is an internal archive operation,
    // not an approval step. Open the shared transcript regardless.
    if(ep.status==="complete")await api("",{action:"sync",episodeId:ep.id}).catch(()=>{});
    await loadEpisode(ep.id);
   }catch(e){status(e.message)}finally{button.disabled=false}
  };
  line.append(label,button);target.append(line);
 }
 await loadAnnual();
}
async function linkRoom(){
 const invite=$("atlasInvite").value.trim();
 if(!/^[A-Za-z0-9_-]{43}$/.test(invite))throw Error("Paste the individual token from your private 4.3 invitation.");
 const result=await api("",{action:"link",inviteToken:invite});
 $("atlasInvite").value="";
 status(result.message||"Invitation verified.");
 await loadEpisodes();
}
async function loadEpisode(id){
 const r=await api("?mode=episode&episodeId="+encodeURIComponent(id));
 $("atlasLiveReview").hidden=false;text("atlasReviewTitle",r.episode.title+" · Evidence Threads");
 const stream=$("atlasLiveConversation");stream.replaceChildren();
 const coachMessages=(r.transcript||[]).filter(x=>["coach","character"].includes(x.kind));
 const left=el("div"),right=el("div");
 left.append(el("strong","Wife coaching ↔ Jill"));
 right.append(el("strong","Husband coaching ↔ Jack"));
 for(const m of coachMessages){
  const dest=["wife","jill"].includes(m.actor)?left:["husband","jack"].includes(m.actor)?right:null;
  if(!dest)continue;
  const card=el("div",undefined,"quote");
  card.append(el("strong",(m.actor==="husband"?"Husband":m.actor==="wife"?"Wife":m.actor)+
   " · Scene "+String(m.scene_day??"-")),el("div",m.body));
  dest.append(card);
 }
 stream.append(left,right);
 const citations=$("atlasLiveEvidence");citations.replaceChildren();
 const byMovement=new Map((r.movements||[]).map(m=>[m.evidence_id,m]));
 for(const obs of r.evidence||[]){
  const b=el("button",(obs.subject||"")+" · "+(obs.skill_id||"")+
    " · "+(obs.context_class||"")+" · evidence #"+obs.id);
  b.setAttribute("aria-pressed","false");
  b.onclick=()=>{
   citations.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
   const m=byMovement.get(obs.id);
   const box=$("atlasLiveAnnotation");box.replaceChildren();
   box.append(el("strong",(obs.subject||"")+" · "+(obs.skill_id||"")+" · "+(obs.context_class||"")+" observation"));
   box.append(el("p","“"+obs.source_quote+"”"));
   box.append(el("p",obs.explanation||"No additional coding explanation was recorded."));
   if(m)box.append(el("p","Skill trajectory "+m.previous_score+" → "+m.new_score+
    " ("+(Number(m.delta)>0?"+":"")+m.delta+")"));
   box.append(el("div","Verified source "+obs.source_ref+" · observation "+(obs.observed_rating??"not rated")+
    "/5 · confidence "+(obs.confidence??"n/a"),"citation"));
  };
  citations.append(b);
 }
 status("Showing your couple's shared Deep Dive, including both coaching streams.");
 $("atlasLiveReview").scrollIntoView({block:"start",behavior:"smooth"});
}
async function loadAnnual(){
 const r=await api("?mode=annual");annual=r;
 if(r.message){message("atlasLiveAnnual",r.message);return}
 const target=$("atlasLiveAnnual");target.replaceChildren();
 if(!r.movements?.length){target.append(el("p","No source-backed skill movements have been recorded yet.","tiny muted"));return}
 const select=el("select");select.style.cssText="width:100%;padding:8px;border:1px solid #dfd3e5;border-radius:8px";
 const ids=[...new Set(r.movements.map(x=>x.skill_id))].sort();
 for(const id of ids){
  const skill=catalog.find(x=>x.skill_id===id);
  const op=el("option",skill?.skill_title||id);op.value=id;select.append(op);
 }
 const explanation=el("p","Your couple's combined record. Select a skill and tap an observation to inspect its source.","tiny muted");
 const plot=document.createElementNS("http://www.w3.org/2000/svg","svg");
 plot.setAttribute("viewBox","0 0 680 285");plot.setAttribute("role","group");plot.setAttribute("aria-label","Four separate source-linked coaching and fictional character trajectories");
 plot.style.cssText="width:100%;height:auto";
 const inspector=el("div","Select a plotted source citation.","live-evidence");
 const legend=el("div","Husband (purple) · Wife (rose) · Jack (blue) · Jill (teal)","tiny muted");
 function draw(){
  plot.replaceChildren();
  const entries=r.movements.filter(x=>x.skill_id===select.value);
  const source=new Map((r.evidence||[]).map(x=>[x.id,x]));
  const colors={husband:"#9b78d6",wife:"#d77ca8",jack:"#4f8ed5",jill:"#1da894"};
  const make=(tag,props,parent=plot)=>{const x=document.createElementNS("http://www.w3.org/2000/svg",tag);
   for(const [k,v] of Object.entries(props))x.setAttribute(k,v);parent.append(x);return x};
  const x=i=>65+(i*560/Math.max(1,entries.length-1)),y=n=>235-(n-1)*45;
  for(let i=1;i<=5;i++){
   make("line",{x1:45,y1:y(i),x2:650,y2:y(i),stroke:"#e6deed","stroke-dasharray":"3 5"});
   make("text",{x:30,y:y(i)+4,fill:"#7b6f80","font-size":11}).textContent=i;
  }
  for(const subject of ["husband","wife","jack","jill"]){
   const own=entries.map((e,i)=>({e,i})).filter(z=>z.e.subject===subject);
   for(let j=1;j<own.length;j++){
    make("line",{x1:x(own[j-1].i),y1:y(own[j-1].e.new_score),
     x2:x(own[j].i),y2:y(own[j].e.new_score),stroke:colors[subject],
     "stroke-width":2.8,"stroke-dasharray":subject==="jack"||subject==="jill"?"7 3":"none"});
   }
   for(const {e,i} of own){
    const circle=make("circle",{cx:x(i),cy:y(e.new_score),r:7,
     fill:colors[subject],stroke:"white","stroke-width":2,tabindex:0,role:"button",
     "aria-label":subject+" "+e.new_score+" evidence "+e.evidence_id});
    const inspect=()=>{
     const proof=source.get(e.evidence_id);
     inspector.replaceChildren(el("strong",subject+" · "+select.value+" · "+e.previous_score+" → "+e.new_score),
      el("p",proof?"“"+proof.source_quote+"”":"Evidence source unavailable."),
      el("p",proof?.explanation||"No coding memo available."));
    };
    circle.addEventListener("click",inspect);
    circle.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();inspect()}});
   }
  }
 }
 select.addEventListener("change",draw);
 target.append(select,explanation,plot,legend,inspector);draw();
}
$("atlasSignIn").addEventListener("submit",e=>{e.preventDefault();sendMagicLink().catch(x=>status(x.message))});
$("atlasVerifyCode").addEventListener("click",()=>verifyCode().catch(x=>status(x.message)));
$("atlasLink").addEventListener("click",()=>linkRoom().catch(x=>status(x.message)));
$("atlasSignOut").addEventListener("click",()=>{signOut();status("Signed out of this browser session.")});
$("atlasRefreshAnnual").addEventListener("click",()=>loadAnnual().catch(x=>status(x.message)));
init().catch(e=>status(e.message));
})();
