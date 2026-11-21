// Anthos Deep Dive 4.2 — a versioned delivery strategy on the existing JJ4
// rooms, participant tokens, RPCs and private message tables.
// No narrator: the only customer-facing story messages are private Jack/Jill
// check-ins. The shared 'scene' row is a canonical non-private event ledger,
// NEVER shown as a shared story or sent to either SMS recipient.
export const JJ42_VERSION="4.2.0";
export const JJ42_DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const ROLES=["jill","jack","jill","jack","jill"];
const PHASES=["hook","conflict","discovery","reattempt","outcome"];
const INITIAL=()=>({
 version:JJ42_VERSION,purchase:"not_bought",box:"absent",repair:"broken",
 consulted:false,jackOwnsDelay:false,jillOwnsPurchase:false,
 repairPlan:false,repairCalled:false,financialBoundary:false,
 events:["The old over-the-range microwave has been broken for three weeks.",
 "Jack has missed three Saturday repair promises.",
 "Jill found a $400 replacement and is considering spending shared emergency savings."]
});
const words=x=>String(x||"").trim().toLowerCase().replace(/[’]/g,"'");
function has(s,re){return re.test(s)}
function action42(phase,text){
 const s=words(text);
 if(phase===0){
  if(has(s,/\b(?:don't|do not|not yet|wait|hold off|sleep on|leave it|postpone)\b/)&&
     !has(s,/\b(?:don't wait|do not wait)\b/))return "wait";
  if(has(s,/\b(?:call|ask|talk|discuss|check with|text)\b/))return "consult";
  if(has(s,/\b(?:buy|purchase|go ahead|get it|order|just do it)\b/))return "buy";
  return "wait";
 }
 if(phase===1){
  if(has(s,/\b(?:threaten|punish|shout|yell|lecture|blame|make her|demand)\b/))return "defensive";
  return has(s,/\b(?:own|admit|acknowledge|repair|fix|call|check|model|promise|follow through|responsib|listen)\b/)?"accountable":"firm";
 }
 if(phase===2){
  if(has(s,/\b(?:open|unbox|install|tear off the tape)\b/)&&
     !has(s,/\b(?:don't open|do not open|leave sealed|keep sealed|wait)\b/))return "open";
  if(has(s,/\b(?:own|apolog|admit|acknowledge|should have called|should've called)\b/))return "own";
  return has(s,/\b(?:hold|wait|ask|listen|talk|discuss|work together)\b/)?"hear":"defend";
 }
 if(phase===3){
  if(has(s,/\b(?:threaten|ignore|punish|lecture|insist|demand)\b/))return "defensive";
  return has(s,/\b(?:check|call|model|repair|fix|follow through|commit|photo|shop|tomorrow)\b/)?"concrete":"talk";
 }
 if(phase===4){
  if(has(s,/\b(?:open|install|use now|unbox)\b/)&&
     !has(s,/\b(?:do not open|don't open|leave sealed|keep sealed|wait)\b/))return "open";
  return has(s,/\b(?:wait|leave|hold|sealed|check|tomorrow|together|review|hear|ask)\b/)?"wait":"unsettled";
 }
 return "none";
}
export function nextWeekSchedule(now=new Date(),timeZone="America/Chicago"){
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{
  timeZone,year:"numeric",month:"2-digit",day:"2-digit",weekday:"short"
 }).formatToParts(now).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
 const week={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
 const daysUntil=(8-week[parts.weekday])%7||7;
 const y=+parts.year,m=+parts.month,d=+parts.day;
 const nextMon=new Date(Date.UTC(y,m-1,d+daysUntil));
 const schedule=[];
 for(let day=0;day<6;day++){
  const date=new Date(nextMon.getTime()+day*86400000);
  const yy=date.getUTCFullYear(),mm=date.getUTCMonth(),dd=date.getUTCDate();
  // Resolve the local timezone offset independently on each scheduled day,
  // including weeks that cross a daylight-saving transition.
  const sample=new Date(Date.UTC(yy,mm,dd,16));
  const zone=new Intl.DateTimeFormat("en-US",{timeZone,timeZoneName:"shortOffset"})
   .formatToParts(sample).find(p=>p.type==="timeZoneName")?.value||"GMT-6";
  const mo=/GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(zone);
  const offset=mo?(mo[1]==="+"?1:-1)*(+mo[2]*60+(+(mo[3]||0))):-360;
  schedule.push(new Date(Date.UTC(yy,mm,dd,10,0)-offset*60000).toISOString());
 }
 return schedule;
}
export function buildConversation42(draft,{fastForward=false,now=new Date()}={}){
 if(draft?.title?.trim().toLowerCase()!=="the four-hundred-dollar surprise"||
    draft?.pilotMode!=="shared")
  throw new Error("4.2 currently pilots the saved shared microwave episode only.");
 if(String(draft.premise||"").length<75||!String(draft.premise).includes("$400")||
    !String(draft.premise).includes("SATURDAY"))
  throw new Error("Save a complete, accurate microwave problem statement before 4.2.");
 if(draft.primarySkill!=="s-decisions"||
    !["g-start","g-influence"].every(id=>draft.supportingSkills?.includes(id)))
  throw new Error("4.2 needs saved hard-decisions, gentle-startup and accept-influence skills.");
 return {...draft,authored42:{
  version:JJ42_VERSION,mode:"character-conversations",fastForward:fastForward===true,
  schedule:nextWeekSchedule(now),narrator:false,
  sourcePremise:draft.premise,primarySkill:draft.primarySkill,
  supportingSkills:[...draft.supportingSkills],intent:"two private coaches; one shared event ledger"
 },sophiaIntro:"",checkpoints:PHASES.map((afterPhase,i)=>({
  afterPhase,audience:ROLES[i],waitForReply:true,purpose:"One character asks their own coach privately.",
  humorCue:"Character-led situational humor only."
 }))};
}
export const isConversation42=room=>room?.episode?.authored42?.version===JJ42_VERSION;
export function due42(episode,phase,now=Date.now()){
 if(!episode?.authored42||episode.authored42.fastForward===true)return true;
 const time=Date.parse(episode.authored42.schedule?.[phase]||"");
 return Number.isFinite(time)&&now>=time;
}
export function parseLedger42(body){
 let data;try{data=JSON.parse(body)}catch{return null}
 if(data?.version!==JJ42_VERSION||!Number.isInteger(data.day)||
    !data.state||!Array.isArray(data.state.events))return null;
 return data;
}
const prompt=(s,day)=>{
 switch(day){
  case 0:return "Okay, I need your opinion. Jack said he'd fix our microwave. Three Saturdays later, it's still dead. I found an over-the-range replacement for $400. It would come from our emergency savings, and I haven't talked to him about it. I love the man, but Saturday has become a fictional holiday around here. Would you buy it, talk to him, or wait?";
  case 1:{
   const fact=s.purchase==="bought_unannounced"?
    "Jill bought a $400 replacement using our emergency savings. I found out from the charge, not from her.":
    s.purchase==="consulted"?
    "Jill called about a $400 microwave before buying. I'm glad she called, but it made me realize she's had to ask me to fix the old one for three Saturdays.":
    "Jill found a $400 microwave and decided to wait. That should be a relief, but she's making it clear this is the last Saturday promise she's trusting.";
   return "You got a minute? "+fact+" I did tell her I'd fix it. Three Saturdays ago. That's on me. But that emergency fund is there for a reason. How do I say both without turning it into a courtroom argument?";
  }
  case 2:{
   const jack=s.jackOwnsDelay?
    "Jack actually owned missing those Saturdays.":
    "Jack still wants to make the whole discussion about the money.";
   const buy=s.purchase==="bought_unannounced"?
    "I bought it without calling first. I know why he's upset.":
    s.purchase==="consulted"?"I called before spending the money. I'm glad I did.":"I held off buying it. I don't want to hold off forever.";
   return "An update. "+buy+" "+jack+" What I'm really tired of is hearing 'I'll get to it' while I'm heating dinner on the stove. How do I get through to him without making the whole conversation a scorecard?";
  }
  case 3:{
   const jill=s.jillOwnsPurchase?"Jill said she should've called me first. I appreciate that. ":
    s.purchase==="bought_unannounced"?"Jill still isn't seeing why the savings matter to me. ":"";
   const tape=s.box==="opened"?"She opened the new box even though we hadn't decided together. ":"";
   return "Here's where we are. "+jill+tape+"She told me that by the third Saturday she stopped believing me. That landed. I'm not dropping my concern about our emergency fund, but I can't promise another repair I haven't checked. What concrete step would you take?";
  }
  case 4:{
   const jack=s.repairPlan?"Jack got the old microwave's model number and found a repair shop to call. He hasn't called yet, but at least there's an actual next step.":
    "Jack and I have talked, but the repair still hasn't moved forward.";
   const box=s.purchase==="bought_unannounced"?
    (s.box==="opened"?"I opened the new microwave box. I know that will make the return discussion harder.":
    "The new microwave's still sealed. Part of me wants to rip it open just because I'm frustrated."):
    "I haven't committed us to a new microwave yet.";
   return "Friday report: "+jack+" "+box+" I'm not agreeing to another month of waiting. What would be fair for both of us to do next?";
  }
 }
 return "";
};
function apply(s,phase,decision){
 const n={...s,events:[...s.events]};
 let event="";
 if(phase===0){
  if(decision==="buy"){n.purchase="bought_unannounced";n.box="sealed";event="Jill purchased the $400 replacement using shared emergency savings without consulting Jack."}
  else if(decision==="consult"){n.purchase="consulted";n.consulted=true;event="Jill contacted Jack about the $400 replacement before purchasing it; no purchase has occurred."}
  else {n.purchase="waiting";event="Jill held off buying the replacement; no money has been spent."}
 }
 if(phase===1){
  n.jackOwnsDelay=decision==="accountable";
  n.financialBoundary=decision!=="defensive";
  event=decision==="accountable"?
   "Jack acknowledged three neglected repairs while keeping his concern about spending shared savings without consultation.":
   decision==="firm"?"Jack expressed his concern about the family emergency fund; he has not yet promised a concrete repair.":
   "Jack defensively focused on the financial dispute and failed to address his three missed Saturday commitments.";
 }
 if(phase===2){
  if(decision==="open"&&n.box==="sealed"){n.box="opened";event="Jill broke the tape and opened the new microwave box before an agreement."}
  else if(decision==="own"&&n.purchase==="bought_unannounced"){n.jillOwnsPurchase=true;event="Jill acknowledged buying the microwave without consulting Jack; she still wants him to follow through on the repair."}
  else if(decision==="hear"){event="Jill agreed to hear Jack's concern without deciding the microwave's fate."}
  else {event="Jill remained frustrated and did not resolve the shared financial decision."}
 }
 if(phase===3){
  if(decision==="concrete"){
   n.repairPlan=true;
   event="Jack photographed the old microwave model number and located a repair shop to call tomorrow; the repair shop has NOT been called and no repair has occurred.";
  }else{event="Jack has not verified a repair option. The repair remains undone."}
 }
 if(phase===4){
  if(decision==="open"&&n.box==="sealed"){
   n.box="opened";event="Jill opened the new microwave box without a shared agreement.";
  }else if(decision==="wait"){
   event=n.box==="sealed"?
    "Jill agreed to leave the purchased replacement sealed until the repair options could be checked.":
    "Jill agreed to review the next step without claiming the repair or new purchase was settled.";
  }else event="Jill has not agreed to a final decision about the replacement or emergency savings.";
 }
 n.events.push(event);
 return {state:n,event};
}
export function renderConversation42(episode,phase,history=[]){
 if(!episode?.authored42||!Number.isInteger(phase)||phase<0||phase>5)
  throw new Error("Invalid 4.2 phase.");
 const ledgers=history.filter(x=>x.role==="shared"&&x.kind==="scene")
  .map(x=>parseLedger42(x.body)).filter(Boolean);
 const prev=phase===0?null:ledgers.find(x=>x.day===phase-1);
 if(phase>0&&!prev)throw new Error("Missing committed event ledger for previous day.");
 if(phase>0&&ledgers.some(x=>x.day===phase))throw new Error("Day already committed.");
 let state=phase===0?INITIAL():structuredClone(prev.state),event="";
 if(phase>0){
  const role=ROLES[phase-1],advice=history.find(x=>x.role===role&&x.phase_index===phase-1&&x.kind==="coach")?.body;
  if(!advice)throw new Error("Previous private coach has not replied.");
  const change=apply(state,phase-1,action42(phase-1,advice));
  state=change.state;event=change.event;
 }
 const internal={version:JJ42_VERSION,day:phase,
  label:JJ42_DAYS[phase],event:event||"Jill has not purchased the replacement.",
  state};
 const scene=JSON.stringify(internal);
 if(scene.length<80||scene.length>2500)throw new Error("Invalid canonical event length.");
 const recipient=ROLES[phase];
 return {scene,jackPrompt:recipient==="jack"?prompt(state,phase):"",
  jillPrompt:recipient==="jill"?prompt(state,phase):""};
}
export function sophiaConversation42(episode,scenes=[]){
 const last=scenes.map(x=>parseLedger42(x.body)).find(x=>x?.day===5);
 if(!last)throw new Error("Cannot close 4.2 without the Saturday ledger.");
 const s=last.state;
 const purchase=s.purchase==="bought_unannounced"?
  "Jill bought the microwave without asking first.":"Jill did not make an unannounced purchase.";
 const repair=s.repairPlan?
  "Jack identified a repair shop, but had not called it yet.":
  "Jack still had not taken a verifiable repair step.";
 const box=s.box==="opened"?
  "The new box was opened; that choice cannot be rewritten as if it stayed sealed.":
  "No one has opened the replacement.";
 return "SOPHIA · SATURDAY\n\nJack and Jill lived with the same problem but saw it differently. "+
  purchase+" "+repair+" "+box+
  "\n\nTheir primary skill was facing a hard decision without forcing a surrender. Gentle startup and accepting influence were opportunities, not grades."+
  "\n\nYour private advice shaped their choices, but neither of you was responsible for controlling a fictional person's behavior."+
  "\n\nTry asking your spouse: What is one promise we could actually follow through on this week?"+
  "\n\nThis is fiction, not a diagnosis or grade on your marriage.";
}
export function weeklyRehearsal42(episode,adviceByDay){
 const history=[],rounds=[];
 for(let day=0;day<6;day++){
  const out=renderConversation42(episode,day,history);
  history.push({role:"shared",kind:"scene",phase_index:day,body:out.scene});
  const role=ROLES[day];
  if(role){
   const message=role==="jack"?out.jackPrompt:out.jillPrompt;
   rounds.push({day:JJ42_DAYS[day],role,message,coach:adviceByDay[day]});
   history.push({role,kind:"coach",phase_index:day,body:adviceByDay[day]});
  }
 }
 return {rounds,ledger:history.filter(x=>x.role==="shared").map(x=>parseLedger42(x.body)),
  sophia:sophiaConversation42(episode,history.filter(x=>x.role==="shared"))};
}
