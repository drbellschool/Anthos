import {CHOICES,submitAnswer,canReveal,compare,label,buildAdventure} from "./engine.mjs";
const $=id=>document.getElementById(id);
const stages=["intro","answer","handoff","reveal","plan"];
const state={first:null,second:null,active:"first"};
function show(name){
  for(const id of stages)$(id).hidden=id!==name;
  window.scrollTo?.({top:0,behavior:"instant"});
}
function optionInputs(container,name){
  container.replaceChildren();
  for(const item of CHOICES){
    const labelNode=document.createElement("label");
    labelNode.className="choice";
    const input=document.createElement("input");
    input.type="radio";input.name=name;input.value=item.id;input.required=true;
    const text=document.createElement("span");text.textContent=item.label;
    labelNode.append(input,text);
    container.append(labelNode);
  }
}
function begin(who){
  state.active=who;
  $("person-label").textContent=who==="first"?"PARTNER ONE":"PARTNER TWO";
  $("stage-index").textContent=who==="first"?"01":"02";
  $("submit-answer").textContent=who==="first"?"Share my choices & continue ↗":"Share my choices & discover ↗";
  $("discovery-form").reset();
  $("form-error").textContent="";
  optionInputs($("self-options"),"self");
  optionInputs($("prediction-options"),"prediction");
  show("answer");
}
function value(id,text){$(id).textContent=text;}
function reveal(){
  if(!canReveal(state.first,state.second))return;
  const a=state.first,b=state.second,comparison=compare(a,b);
  value("a-self",label(a.self));value("a-prediction",label(a.prediction));
  value("b-self",label(b.self));value("b-prediction",label(b.prediction));
  value("a-why",a.why||"No explanation shared.");
  value("b-why",b.why||"No explanation shared.");
  value("sophia-reflection",comparison.message);
  value("sophia-question",comparison.followUp);
  show("reveal");
}
$("start").addEventListener("click",()=>begin("first"));
$("next-person").addEventListener("click",()=>begin("second"));
$("discovery-form").addEventListener("submit",event=>{
  event.preventDefault();
  const form=event.currentTarget;
  const data=new FormData(form);
  try{
    const answer=submitAnswer({
      self:data.get("self"),prediction:data.get("prediction"),
      why:data.get("why")||"",share:data.get("share")==="on"
    });
    if(state.active==="first"){state.first=answer;show("handoff");}
    else{state.second=answer;reveal();}
  }catch(error){$("form-error").textContent=error.message;}
});
$("ask-paraclete").addEventListener("click",()=>{
  if(!canReveal(state.first,state.second))return;
  const plan=buildAdventure(state.first,state.second);
  value("plan-title",plan.title);value("plan-intro",plan.introduction);value("plan-note",plan.note);
  const list=$("plan-steps");list.replaceChildren();
  for(const step of plan.steps){
    const item=document.createElement("li");item.textContent=step;list.append(item);
  }
  show("plan");
});
$("restart").addEventListener("click",()=>{
  state.first=null;state.second=null;state.active="first";
  $("discovery-form").reset();
  show("intro");
});
show("intro");
