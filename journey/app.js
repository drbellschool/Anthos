(()=>{
"use strict";
const $=id=>document.getElementById(id);
const KEY="anthos_monthly_debug_v1";
const choices=["Exploring somewhere new","Relaxing together at home","Doing something playful or adventurous","Spending time with friends"];
const soloChoices=["I'd ask Jack what he gave up, and explain why keeping score hurts.","I'd tell Jack he's being unfair and needs to stop blaming Jill.","I'd take time to cool down before continuing.","My own response"];
const blank=()=>({survey:{A:null,B:null,revealed:false},team:[],teamAnswer:null,solo:{A:null,B:null},plan:null,adventureComplete:false});
let data=blank();
try{data={...blank(),...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}};
const safe=t=>String(t||"").slice(0,500);
const text=(node,value)=>{node.textContent=String(value)};
const append=(host,who,msg,cls)=>{const el=document.createElement("div");el.className="bubble "+cls;const b=document.createElement("b");b.textContent=who;el.append(b,document.createTextNode(msg));host.append(el)};
function updateSurvey(){
 for(const spouse of ["A","B"]){const row=data.survey[spouse];if(row){$(spouse.toLowerCase()+"Own").value=row.own;$(spouse.toLowerCase()+"Guess").value=row.guess}}
 const both=Boolean(data.survey.A&&data.survey.B);$("reveal").disabled=!both;
 text($("surveyNotice"),both?"Both private responses saved. You can reveal together.":"Awaiting "+(!data.survey.A?"Spouse A":"Spouse B")+" response.");
 $("comparison").hidden=!data.survey.revealed;
 if(data.survey.revealed&&both){
  text($("comparison"),"A wants: "+data.survey.A.own+" (B guessed: "+data.survey.B.guess+"). B wants: "+data.survey.B.own+" (A guessed: "+data.survey.A.guess+"). What surprises you? The guesses aren't scores.");
 }
}
function planningClues(){
 const combined=data.team.map(m=>m.text.toLowerCase()).join(" ");
 const tags=[];
 if(/laugh|jok|fun|play|game|silly|adventur/.test(combined))tags.push("playful");
 if(/quiet|relax|calm|home|rest|peace/.test(combined))tags.push("relaxed");
 if(/new|explor|outside|hike|discover/.test(combined))tags.push("exploratory");
 if(/talk|listen|understand|together|ask/.test(combined))tags.push("conversation");
 return tags;
}
function updateTeam(){
 const chat=$("chat");chat.replaceChildren();
 for(const m of data.team)append(chat,m.who==="Sophia"?"Sophia":"Spouse "+m.who,m.text,m.who==="Sophia"?"sophia":"human");
 const ready=Boolean(data.teamAnswer);$("teamResult").hidden=!ready;
 if(ready){text($("teamResult"),"Shared answer: “"+data.teamAnswer+"”\n\nSophia's provisional observations: "+(planningClues().join(", ")||"Not enough context yet")+". Paraclete can use these shared-room hints to shape a balanced adventure; these are not fixed personality labels.");}
}
function sophiaReply(message){
 const t=message.toLowerCase();
 if(/brat|selfish|unfair|ridiculous|stupid/.test(t))return "You have a strong reaction! Which part seems unfair—the surprise, the refusal, or the way they talked to each other?";
 if(/surprise|romantic|thoughtful|sweet/.test(t))return "So intention counts for you. How should Jack protect the surprise without making the entire decision for Jill?";
 if(/ask|communicat|listen|choice|decid/.test(t))return "You want a voice in the plan. What could Jill say that keeps the playfulness without swallowing her disappointment?";
 return "That's an interesting angle. What does your spouse think? You can disagree and keep talking until you've both landed somewhere.";
}
function updateSolo(){
 for(const who of ["A","B"]){
  const id=who.toLowerCase(),saved=data.solo[who],v=saved?.index??-1;
  const host=$(id+"Options");host.replaceChildren();
  soloChoices.forEach((choice,index)=>{
   const label=document.createElement("label");label.className="choice-line";
   const radio=document.createElement("input");radio.type="radio";radio.name=id+"Choice";radio.value=String(index);radio.checked=index===v;
   radio.addEventListener("change",()=>{$(id+"Custom").hidden=index!==3});
   label.append(radio,document.createTextNode(choice));host.append(label);
  });
  $(id+"Custom").hidden=v!==3;
  if(v===3)$(id+"Custom").value=saved?.text||"";
  text($(id+"SoloStatus"),saved?"Private response saved; not revealed.":"No private answer saved yet.");
 }
}
function adventureText(){
 const a=data.survey.A?.own,b=data.survey.B?.own;
 if(!a||!b)return "First save both discovery responses. Paraclete needs actual preferences, not just guesses.";
 const hints=planningClues(),budget=$("budget").value,childcare=$("childcare").value;
 let idea="Pick a new-to-you place and turn the visit into a tiny two-person challenge: each partner chooses one surprise stop or conversation prompt. Finish with unhurried time together.";
 if(a===b)idea="You both picked "+a.toLowerCase()+". Build a shared afternoon around that: one playful surprise, a conversation you wouldn't usually have, and a moment to remember.";
 else if(a.includes("Relax")||b.includes("Relax"))idea="Choose one small new or playful outing, then deliberately protect a calm, unhurried hour together. Neither spouse has to choose between novelty and peace.";
 if(hints.includes("playful"))idea+=" Add a lighthearted challenge or game if both are willing.";
 const details=[budget&&"Budget: "+budget,childcare&&"Childcare: "+childcare,$("constraints").value.trim()&&"Constraints to honor: "+safe($("constraints").value.trim())].filter(Boolean).join(" · ");
 return "PARACLETE'S DEMO BRIEF\n"+idea+"\n"+(details||"Logistics haven't been confirmed; this is an idea, not a booking.")+"\nConfirm the plan with both spouses before spending money or scheduling anything.";
}
function updatePlan(){if(data.plan){$("budget").value=data.plan.budget||"";$("childcare").value=data.plan.childcare||"";$("constraints").value=data.plan.constraints||"";text($("planResult"),data.plan.brief);$("planResult").hidden=false;text($("adventureResult"),data.plan.brief)}$("completeAdventure").checked=Boolean(data.adventureComplete)}
function tab(name){document.querySelectorAll("[data-tab]").forEach(b=>{b.classList.toggle("active",b.dataset.tab===name)});for(const id of ["survey","team","solo","plan","adventure"])$(id).hidden=id!==name}
function init(){
 for(const id of ["aOwn","aGuess","bOwn","bGuess"]){for(const item of choices){const op=document.createElement("option");op.textContent=item;op.value=item;$(id).append(op)}}
 for(const who of ["A","B"]){$(who.toLowerCase()+"Save").addEventListener("click",()=>{const id=who.toLowerCase();data.survey[who]={own:$(id+"Own").value,guess:$(id+"Guess").value};data.survey.revealed=false;save();updateSurvey()});
  $(who.toLowerCase()+"SoloSave").addEventListener("click",()=>{const id=who.toLowerCase();const checked=document.querySelector('input[name="'+id+'Choice"]:checked');if(!checked){text($(id+"SoloStatus"),"Choose a response or write your own.");return}const index=Number(checked.value),value=index===3?$(id+"Custom").value.trim():soloChoices[index];if(!value){text($(id+"SoloStatus"),"Write your own answer first.");return}data.solo[who]={index,text:safe(value)};save();updateSolo()});
 }
 $("reveal").addEventListener("click",()=>{if(!data.survey.A||!data.survey.B)return;data.survey.revealed=true;save();updateSurvey()});
 $("send").addEventListener("click",()=>{if(data.teamAnswer)return;const message=$("message").value.trim();if(!message)return;data.team.push({who:$("speaker").value,text:safe(message)});data.team.push({who:"Sophia",text:sophiaReply(message)});$("message").value="";save();updateTeam();$("chat").scrollTop=$("chat").scrollHeight});
 $("answer").addEventListener("click",()=>{if(data.teamAnswer){data.teamAnswer=null;save();updateTeam();return}if(data.team.filter(x=>x.who!=="Sophia").length<2){alert("Let both spouses contribute before ending the shared Deep Dive.");return}const answer=prompt("What's your shared answer? Use your own words.");if(!answer?.trim())return;data.teamAnswer=safe(answer.trim());save();updateTeam();$("answer").textContent="Reopen conversation"});
 $("draftAdventure").addEventListener("click",()=>{data.plan={budget:$("budget").value,childcare:$("childcare").value,constraints:safe($("constraints").value),brief:adventureText(),draftedAt:new Date().toISOString()};save();updatePlan()});
 $("completeAdventure").addEventListener("change",e=>{data.adventureComplete=e.target.checked;save()});
 $("reset").addEventListener("click",()=>{if(!confirm("Clear just this local monthly journey demo?"))return;localStorage.removeItem(KEY);location.reload()});
 document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>tab(b.dataset.tab)));
 updateSurvey();updateTeam();updateSolo();updatePlan();tab(new URLSearchParams(location.search).get("week")||"survey");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();