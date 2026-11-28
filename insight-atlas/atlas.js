(()=>{"use strict";
const $=id=>document.getElementById(id);
const skillDefs=[
 ["s-decisions","Face Hard Decisions","Schnarch","#dc756e","Primary"],
 ["g-start","Gentle Startup","Gottman","#9977dd","Supporting"],
 ["g-influence","Accept Influence","Gottman","#1ea795","Supporting"],
 ["i-nontransactional","Nontransactional Intimacy","Schnarch + contemporary research","#d865a2","Incidental"],
 ["i-sexual-respect","Sexual Respect","Gottman + Schnarch","#d78e59","Incidental"],
 ["i-consent-boundaries","Consent & Boundaries","Sexual-health standards","#e3a836","Safety"],
 ["g-bids","Recognize Emotional Bids","Gottman","#c16dd4","Library"],
 ["g-toward","Turn Toward Connection","Gottman","#4f85d4","Library"],
 ["g-patterns","Destructive Conflict Patterns","Gottman","#d56a74","Library"],
 ["g-repair","Make and Receive Repairs","Gottman","#659b77","Library"],
 ["g-appreciation","Express Appreciation","Gottman","#9e7ddb","Library"],
 ["g-world","Know Partner's Inner World","Gottman","#8c83bd","Library"],
 ["g-meaning","Create Shared Meaning","Gottman","#cc9450","Library"],
 ["s-self","Solid Sense of Self","Schnarch","#56a18b","Library"],
 ["s-soothe","Self-Soothe","Schnarch","#5c88bd","Library"],
 ["s-react","Respond Without Reactivity","Schnarch","#c07383","Library"],
 ["s-diff","Differentiate Without Disconnecting","Schnarch","#9c6db1","Library"],
 ["s-honesty","Honest Intimacy","Schnarch","#d5889d","Library"],
 ["s-own","Own Contribution to Conflict","Schnarch","#be8270","Library"],
 ["s-discomfort","Tolerate Discomfort for Growth","Schnarch","#889b58","Library"],
 ["a-new","Try Something New Together","Aron","#7397ce","Library"],
 ["a-curiosity","Stay Curious","Aron","#9f7ec0","Library"],
 ["a-challenge","Pursue Shared Challenge","Aron","#65ad8c","Library"],
 ["a-support","Support Individual Growth","Aron","#c4a058","Library"],
 ["a-strengths","Share Perspectives and Abilities","Aron","#9582cb","Library"],
 ["a-routines","Refresh Familiar Routines","Aron","#b98aa9","Library"],
 ["a-expansion","Grow Through Shared Experiences","Aron","#60a1a7","Library"]
];
const rec={
 "s-decisions":{j:[2.5,2.45,2.5,2.5,2.7],k:[2.3,2.35,2.5,2.45,2.75],
  yearJ:[2.7,null,null,2.9,null,null,3.1,null,null,3.25,null,3.35],yearK:[2.75,null,2.8,null,3.0,null,3.15,null,3.35,null,3.5,null]},
 "g-start":{j:[2.6,2.4,2.6,2.45,2.8],k:[2.3,2.2,2.6,2.4,2.7],
  yearJ:[2.8,null,null,2.95,null,3.1,null,3.0,null,3.25,null,3.5],yearK:[2.7,null,2.8,null,3.1,null,3.2,null,null,3.35,null,3.7]},
 "g-influence":{j:[2.4,2.4,2.65,2.65,2.95],k:[2.3,2.3,2.55,2.4,2.7],
  yearJ:[2.95,null,3.1,null,3.0,null,3.35,null,3.55,null,3.65,null],yearK:[2.7,null,2.6,null,2.95,null,3.1,null,3.3,null,3.45,null]},
 "i-nontransactional":{j:[null,null,null,null,null],k:[null,null,2.65,null,null],
  yearJ:[null,null,null,null,null,null,null,null,null,null,null,null],
  yearK:[2.65,null,null,null,2.85,null,null,3.05,null,null,null,3.3]},
 "i-sexual-respect":{j:[null,null,null,null,null],k:[null,null,2.8,null,null],
  yearJ:[null,null,null,null,null,null,null,null,null,null,null,null],
  yearK:[2.8,null,null,3.05,null,null,null,null,3.35,null,null,null]}
};
const scenes=[
 {day:"Monday",wife:"Tell Jack the repair delays have worn on you, then ask what realistic repair step he can take.",husband:"You made three promises. Own that before discussing the emergency savings.",jill:"I held off buying it. I'm frustrated, but I told him I want an actual plan.",jack:"I said the emergency fund matters. I also admitted I've put this off.",
  j:{quote:"I held off buying it.",memo:"Jill has not spent money without agreement. Her decision is separate from whether she accepts Jack's perspective."},k:{quote:"I also admitted I've put this off.",memo:"Jack acknowledges responsibility without assuming the appliance is repaired."}},
 {day:"Tuesday",wife:"A plan isn't the same as a call. Ask about a specific time without issuing an ultimatum.",husband:"Get the model number and make the call today.",jill:"He found the model number. I asked him what time he'll call the shop.",jack:"I called the shop and told Jill. They need more information before they can quote a repair.",
  j:{quote:"I asked him what time he'll call the shop.",memo:"Jill seeks a concrete next step."},k:{quote:"I called the shop and told Jill.",memo:"A verified repair call occurred. No price or repair has been confirmed."}},
 {day:"Wednesday",wife:"Acknowledge the call, but explain that you still need an agreed decision deadline.",husband:"Joking here, but tell her she has to earn that microwave with a bedroom favor.",jill:"I listened to why Jack wants to protect our savings. I'm still upset about the delays.",jack:"I repeated the bedroom-payment joke to Jill. She didn't laugh. I could tell I'd made it worse.",
  j:{quote:"I listened to why Jack wants to protect our savings.",memo:"Jill demonstrates consideration, without agreeing to another indefinite delay."},k:{quote:"I repeated the bedroom-payment joke to Jill.",memo:"Jack enacts transactional humor toward Jill. This is an incidental negative observation—not one of the episode's three focus skills."}},
 {day:"Thursday",wife:"Don't repeat the repair-call update. Ask what information would let you make a fair decision.",husband:"Own the joke and apologize without minimizing Jill's discomfort.",jill:"I told him I'm still worried about waiting another month. I want a price before choosing.",jack:"I apologized for that joke. It wasn't fair to make affection into payment, even as a punchline.",
  j:{quote:"I want a price before choosing.",memo:"Jill wants a concrete decision criterion; the cost is still unknown."},k:{quote:"I apologized for that joke.",memo:"An apology is a new behavior; it does not erase the prior incident or automatically repair Jill's trust."}},
 {day:"Friday",wife:"Ask Jack what the shop still needs, and invite his view on the spending limit before deciding.",husband:"Follow up on the missing estimate details. Then ask Jill what decision deadline feels fair.",jill:"I asked Jack what spending limit feels safe to him, and we agreed to set a decision date.",jack:"I asked Jill what deadline feels fair. I still need the estimate, and I won't pretend one call solved it.",
  j:{quote:"what spending limit feels safe to him",memo:"Jill actively requests Jack's perspective. The purchase remains unresolved."},k:{quote:"I asked Jill what deadline feels fair.",memo:"Jack invites input before deciding, a constructive response under pressure."}}
];
const periods=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
let selected="s-decisions",focusSelected="s-decisions",annualSelected="g-influence",day=4,person="j",tab="episode";
const skill=id=>skillDefs.find(x=>x[0]===id);
const score=(p,d)=>rec[selected]?.[p]?.[d]??null;
const quoteFor=p=>scenes[day][p].quote;
const text=(id,value)=>$(id).textContent=String(value);
function init(){
 skillDefs.filter(([, , , ,type])=>type==="Primary"||type==="Supporting").forEach(([id,title,who,color,type])=>{
  const button=document.createElement("button");button.type="button";button.className="skill";button.dataset.skill=id;button.style.setProperty("--accent",color);
  const label=document.createElement("span");label.className="skill-title";label.textContent=title;
  const sub=document.createElement("small");sub.textContent=type+" · "+who;
  button.append(label,sub);button.onclick=()=>selectSkill(id);$("skills").append(button);
 });
 const sel=$("otherSkills");
 for(const [id,title,who,,type] of skillDefs){const opt=document.createElement("option");opt.value=id;opt.textContent=title+" · "+who+(type==="Library"?" (not observed here)":"");sel.append(opt)}
 sel.onchange=()=>{if(tab==="annual")selectSkill(sel.value)};
 scenes.forEach((d,i)=>{const b=document.createElement("button");b.type="button";b.className="day";b.textContent=d.day.slice(0,3);b.onclick=()=>{day=i;render()};$("days").append(b)});
 document.querySelectorAll("[data-tab]").forEach(el=>el.onclick=()=>{tab=el.dataset.tab;selected=tab==="episode"?focusSelected:annualSelected;render()});
 $("jillInspect").onclick=()=>{person="j";render()};
 $("jackInspect").onclick=()=>{person="k";render()};
 document.querySelectorAll("[data-incident]").forEach(btn=>btn.addEventListener("click",()=>showIncidental(btn.dataset.incident)));
 render();
}
function selectSkill(id){
 if(tab==="episode"){
  if(!["s-decisions","g-start","g-influence"].includes(id))return;
  focusSelected=id;
 }else{
  annualSelected=id;
 }
 selected=id;render();
}
function showIncidental(id){
 // This is a separate inspector, not a selection of the three weekly skills.
 // It never changes the primary weekly chart or the active Deep Dive skill.
 const box=$("incidentalInspector");
 if(!["i-nontransactional","i-sexual-respect"].includes(id))return;
 const label=skill(id)?.[1]||"Incidental observation";
 box.replaceChildren();
 const title=document.createElement("strong");title.textContent=label+" · Wednesday";
 const coach=document.createElement("p");
 coach.textContent='Husband coaching (SIM-COACH-WED): “'+scenes[2].husband+'”';
 const acted=document.createElement("p");
 acted.textContent='Jack enacted (SIM-JACK-WED): “'+scenes[2].jack+'”';
 const scored=document.createElement("p");
 scored.textContent='Jack example state: '+(rec[id]?.k?.[2]??"not observed")+
  '/5. Husband coaching is assessed separately. One incident does not change Jill, and the microwave remains the focus of this week.';
 const guidance=document.createElement("p");
 guidance.textContent="Sophia memo: This incidental evidence may inform a future episode about intimacy. Recalling it later does not subtract points again.";
 for(const el of [title,coach,acted,scored,guidance])box.append(el);
 document.querySelectorAll("[data-incident]").forEach(el=>el.setAttribute("aria-pressed",String(el.dataset.incident===id)));
}
function selectedColor(){return skill(selected)?.[3]||"#9477de"}
function writeSeries(svg,labels,j,k,interactive){
 const color=selectedColor(),X=i=>52+i*(575/(labels.length-1)),Y=n=>239-(n-1)*45;
 const ns="http://www.w3.org/2000/svg";svg.replaceChildren();
 const element=(tag,attrs,parent=svg)=>{const x=document.createElementNS(ns,tag);for(const [a,v] of Object.entries(attrs||{}))x.setAttribute(a,String(v));parent.append(x);return x};
 for(let level=1;level<=5;level++){element("line",{x1:35,y1:Y(level),x2:640,y2:Y(level),stroke:"#eadfeb","stroke-dasharray":"3 6"});
  const l=element("text",{x:25,y:Y(level)+4,fill:"#77657b","font-size":11,"text-anchor":"middle"});l.textContent=level}
 labels.forEach((name,i)=>{const l=element("text",{x:X(i),y:270,fill:"#77657b","font-size":11,"text-anchor":"middle"});l.textContent=name});
 for(const [vals,p] of [[k,"k"],[j,"j"]]){
  let segment=[];
  function flush(){if(segment.length>1)element("path",{d:segment.map((v,i)=>(i?"L":"M")+v.join(" ")).join(" "),fill:"none",stroke:color,"stroke-width":p==="j"?3:2.5,"stroke-dasharray":p==="k"?"7 6":"none",opacity:p==="k"?.75:1});segment=[]}
  vals.forEach((v,i)=>{if(v===null){flush();return;}segment.push([X(i),Y(v)])});flush();
  vals.forEach((v,i)=>{
   if(v===null)return;
   const g=element("g",{class:"svg-point",role:interactive?"button":"img",tabindex:interactive?"0":"-1","aria-label":(p==="j"?"Jill":"Jack")+" "+labels[i]+" "+v.toFixed(2)+" out of five", "aria-pressed":interactive?String(day===i&&person===p):"false"});
   element("circle",{class:"focus",cx:X(i),cy:Y(v),r:14,stroke:color,"stroke-width":2,fill:"none"},g);
   if(p==="j")element("circle",{cx:X(i),cy:Y(v),r:6.5,fill:color,stroke:"white","stroke-width":1.5},g);
   else element("rect",{x:X(i)-5,y:Y(v)-5,width:10,height:10,rx:2,fill:color,stroke:"white","stroke-width":1.5},g);
   const tag=element("text",{x:X(i),y:Y(v)-13,"font-size":10,"font-weight":800,"text-anchor":"middle",fill:color},g);
   tag.textContent=(p==="j"?"J":"K")+String(i+1).padStart(2,"0");
   if(interactive){const pick=()=>{day=i;person=p;render()};g.addEventListener("click",pick);g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();pick()}})}
  });
 }
 if(j.every(x=>x===null)&&k.every(x=>x===null)){const t=element("text",{x:338,y:143,"font-size":15,"text-anchor":"middle",fill:"#837589"});t.textContent="No observed evidence for this skill yet"}
}
function render(){
 const current=skill(selected),r=rec[selected],accent=selectedColor();
 document.documentElement.style.setProperty("--selected",accent);
 document.querySelectorAll("[data-skill]").forEach(el=>{el.classList.toggle("active",el.dataset.skill===selected);el.setAttribute("aria-pressed",String(el.dataset.skill===selected))});
 document.querySelectorAll(".day").forEach((el,i)=>el.classList.toggle("active",day===i));
 document.querySelectorAll("[data-tab]").forEach(el=>{el.classList.toggle("active",el.dataset.tab===tab);el.setAttribute("aria-pressed",String(el.dataset.tab===tab))});
 $("atlas").classList.toggle("annual",tab==="annual");
 $("otherSkills").value=selected;
 text("weekSkill",current[1]);text("annualSkill",current[1]);text("dayName",scenes[day].day);
 const none=Array(5).fill(null);const yearNone=Array(12).fill(null);
 writeSeries($("weeklyPlot"),scenes.map(x=>x.day.slice(0,3)),r?.j||none,r?.k||none,true);
 writeSeries($("annualPlot"),periods,r?.yearJ||yearNone,r?.yearK||yearNone,false);
 const d=scenes[day];text("wifeText",d.wife);text("husbandText",d.husband);
 text("jillText",d.jill);text("jackText",d.jack);
 const forScore=score(person,day),p=person==="j"?"Jill":"Jack";
 const isIncidental=selected.startsWith("i-");
 text("inspectorTitle",p+" · "+d.day);text("ref","SIM-"+(person==="j"?"J":"K")+String(day+1).padStart(2,"0")+"-"+selected.toUpperCase());
 $("rating").textContent=forScore===null?"—":forScore.toFixed(2);
 const denominator=document.createElement("b");denominator.textContent=forScore===null?" not observed":"/5";$("rating").append(denominator);
 text("observation",(person==="j"?"Jill's":"Jack's")+" fictional behavior · "+(isIncidental?"Incidental skill":"Selected skill"));
 text("quoted","“"+quoteFor(person)+"”");
 let memo=d[person].memo;
 if(forScore===null)memo="The selected skill has no supported observation for this character in this example. No score movement is recorded.";
 if(isIncidental&&selected==="i-nontransactional"&&person==="k"&&day===2)memo="Jack's enacted transactional joke is a negative incident. The husband's coaching is recorded separately. This episode does not become an intimacy curriculum lesson.";
 if(selected==="i-consent-boundaries")memo="Consent is always safeguarded, but the example contains no verified boundary violation. A coercion safeguard is not interchangeable with a numeric score.";
 text("memo",memo);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
