// Validates the saved Episode Studio contract before an authored JJ4.1 room is
// created. This is a guard on the existing story engine, not a second engine.
const PHASES=["hook","conflict","discovery","reattempt","outcome","reflection"];
const ROLE_ORDER=["jack","jill","jack","jill","none"];
const CORE_SKILLS=["s-decisions","g-start","g-influence"];
const namedRoles=new Set(["jack","jill","both","none"]);
const reason=(message)=>{throw new Error("4.1 Episode Studio contract: "+message)};
export function studioContractFor41(episode,script){
 const sourcePresent=typeof episode?.premise==="string"&&episode.premise.trim().length>75&&
  typeof episode?.learningObjective==="string"&&episode.learningObjective.trim().length>12&&
  typeof episode?.primarySkill==="string"&&
  episode.phases&&typeof episode.phases==="object"&&Array.isArray(episode.checkpoints);
 if(!sourcePresent)return null; // Legacy test fixtures and previously created rooms.
 for(const p of PHASES){
  if(String(episode.phases[p]||"").trim().length<30)reason("missing "+p+" phase direction");
 }
 const checkpoints=episode.checkpoints.map(x=>({...x}));
 if(checkpoints.length!==5||checkpoints.some((x,i)=>x.afterPhase!==PHASES[i]||
    !namedRoles.has(x.audience)))reason("invalid ordered checkpoint audiences");
 if(script.template==="microwave-authored-1"){
  if(episode.primarySkill!==CORE_SKILLS[0]||
    !CORE_SKILLS.slice(1).every(x=>episode.supportingSkills?.includes(x))||
    (episode.supportingSkills||[]).length!==2)
    reason("microwave requires saved skills s-decisions, g-start, g-influence");
  const p=episode.premise;
  if(!/Thursday at 7:15 p\.m\./i.test(p)||!/\$400/.test(p)||
    !/over-the-range microwave/i.test(p)||!/three weeks/i.test(p)||
    !/I'LL FIX IT SATURDAY/i.test(p)||!/Jill/.test(p)||
    !/emergency savings/i.test(p))
    reason("authored story facts disagree with the saved problem statement");
  if(checkpoints.some((x,i)=>x.audience!==ROLE_ORDER[i]||
    x.waitForReply!==(i<4)))
    reason("microwave must use the saved Jack/Jill/Jack/Jill checkpoint sequence");
 }
 return {
  problemStatement:episode.premise,
  learningObjective:episode.learningObjective,
  primarySkill:episode.primarySkill,
  supportingSkills:[...(episode.supportingSkills||[])],
  jackMotivation:episode.jackMotivation||"",
  jillMotivation:episode.jillMotivation||"",
  phaseDirections:Object.fromEntries(PHASES.map(x=>[x,episode.phases[x]])),
  checkpoints,
  skillChallenges:Object.fromEntries(PHASES.map((phase,i)=>[phase,{
   primary:episode.primarySkill,
   supporting:i===0||i===1?[...(episode.supportingSkills||[]).filter(x=>x==="g-start")]:
    i>=2?[...(episode.supportingSkills||[]).filter(x=>x==="g-influence")]:[],
   coach:checkpoints[i]?.audience||"none",
   evidenceRequired:i===0?"Conflicting needs established without instant resolution":
    i===1?"Jack's first real statement and Jill's independent reaction":
    i===2?"Jill's accountable position and Jack's response":
    i===3?"Jack changes or refuses an action based on Jill's position":
    i===4?"Jill makes an observable choice and Jack reacts, without a forced agreement":
    "One new earned aftereffect, no new negotiation"
  }]))
 };
}
export function activeAuthoredCoaches(episode,phase){
 const audience=episode?.authored41?.studioContract?.checkpoints?.[phase]?.audience;
 if(audience==="jack"||audience==="jill")return [audience];
 if(audience==="none")return [];
 return ["jack","jill"];
}
export function checkAuthoredStudioScene(episode,phase,text){
 const contract=episode?.authored41?.studioContract;
 if(!contract)return;
 const scene=String(text||"");
 const count=scene.trim().split(/\s+/).length;
 if(count<55||count>110)
  reason("scene "+(phase+1)+" has "+count+" words, expected SMS-sized dialogue");
 if(episode?.authored41?.template==="microwave-authored-1"){
  if(phase===0&&(!/Thursday at 7:15/i.test(scene)||!/cracked phone/i.test(scene)||
    !/\$400/.test(scene)||!/SATURDAY/.test(scene)))
    reason("microwave hook has drifted from its saved problem statement");
  if(/(?:six ten|six fifteen|six twenty|tomato magnet)/i.test(scene))
    reason("microwave scene contradicts saved time or physical object");
  if(/(?:the store confirmed|refund (?:was|is) guaranteed|the technician fixed|microwave was repaired)/i.test(scene))
    reason("fiction invented external repair or refund confirmations");
  if(phase===1&&(!/Jack/.test(scene)||!/Jill/.test(scene)||!/savings|emergency fund/i.test(scene)))
    reason("Jack's conflict did not cover the actual shared financial decision");
  if(phase===2&&(!/Jill/.test(scene)||!/Jack/.test(scene)||!/Saturday|repair/i.test(scene)))
    reason("Jill's discovery did not confront the delayed repairs");
  if(phase===3&&(!/Jack/.test(scene)||!/Jill/.test(scene)||!/repair|savings|decision|bank balance|old microwave|SATURDAY/i.test(scene)))
    reason("Jack's reattempt did not engage the original hard decision");
  if(phase===4&&!/Jill/.test(scene))reason("Jill must own the final action");
 }
}


// Each approved line exercises the selected skill in the fictional disagreement.
// Strength here means direct accountability, independent judgment and follow-through,
// never intimidation, caricature, or automatic surrender.
export const MICROWAVE_SOURCE_VOICES={
 jack:{
  0:{
   own:{ack:"I'll own the missed Saturdays. I won't pretend that means we agreed to spend four hundred dollars.",
    action:"Jack says, 'I should have fixed the old one three Saturdays ago. I didn't. But four hundred dollars from savings without a call? We have to talk about that.'",
    resist:"Jack points at the charge and ignores his own old repair note. Jill says, 'You're leaving out the Saturdays again.'"},
   explain:{ack:"I'll tell Jill why the emergency money matters, without pretending I kept my repair promise.",
    action:"Jack says, 'That's our emergency fund, Jill. I don't want either of us spending four hundred dollars without talking first. And I know I should've fixed the old one.'",
    resist:"Jack says, 'You took four hundred dollars from savings without calling.' Jill answers, 'And you left the old microwave broken every night.'"},
   ask:{ack:"I'll ask what finally pushed her to buy it, and I'll listen before deciding what to do.",
    action:"Jack sets the phone down. 'Tell me what made tonight the breaking point. I'm not fine with the charge, but I know I've put that repair off.'",
    resist:"Jack asks why she bought it but interrupts as soon as she starts explaining. Jill stops talking."}
  },
  2:{
   own:{ack:"I will follow through on the repair question. I won't use my failure as an excuse to abandon the savings discussion.",
    action:"Jack pulls his SATURDAY note from the dead microwave. 'Tomorrow I'll check whether this one is repairable. I owe you a real answer, not another Saturday. Then we decide together about the new one.'",
    resist:"Jack crumples his old repair note and says he will get to it someday. Jill points at the new box: 'That's exactly why I bought it.'"},
   explain:{ack:"I'll be plain about the financial boundary and the repair I missed. Both are still real.",
    action:"Jack says, 'The savings are our safety net. I should've fixed this thing, and I didn't. But neither of us gets to make a four-hundred-dollar decision alone.'",
    resist:"Jack repeats the bank balance without acknowledging Jill's ruined dinners. She moves away from him."},
   ask:{ack:"I'll ask Jill to help weigh repair against replacement without treating my question as her agreement.",
    action:"Jack says, 'Tomorrow I'll find out if the old one is repairable. Will you leave this box sealed until we know? Neither of us should make this decision alone.'",
    resist:"Jack asks Jill to choose but rejects her answer before she finishes. She puts her hand on the new box."}
  }
 },
 jill:{
  1:{
   own:{ack:"I'll own buying the replacement without a call. Jack still needs to answer for the three missed repairs.",
    action:"Jill says, 'I should have called you first. That was my choice. But I heard Saturday three times, and I'm still heating dinner on the stove.'",
    resist:"Jill refuses to discuss the withdrawal until Jack admits his delay. Jack looks back at the $400 charge."},
   explain:{ack:"I'll tell him why the appliance mattered every day and why I ran out of patience.",
    action:"Jill points toward the stove. 'I've been making do for three weeks. Every Saturday you said you'd handle it. You didn't, Jack. That's why I finally bought one.'",
    resist:"Jill lists every missed Saturday as proof Jack shouldn't have a say about the money. He stiffens."},
   ask:{ack:"I'll ask Jack what happened during those missed Saturdays and let him answer.",
    action:"Jill asks, 'What happened those three Saturdays? I kept waiting for you to fix it. I need something more than another promise.'",
    resist:"Jill asks about the missed repairs but keeps interrupting Jack. He stops trying to answer."}
  },
  3:{
   own:{ack:"I'll take responsibility for the purchase and name the practical decision we still have to make.",
    action:"Jill keeps her hand off the tape. 'I should've called before spending it. I'll own that. But I need to know we're actually going to handle this appliance, not just talk all night.'",
    resist:"Jill insists Jack accept the purchase before she discusses the bank account. He refuses."},
   explain:{ack:"I'll state what I need: a working microwave and decisions we both have a voice in.",
    action:"Jill says, 'I need a working microwave. I also hear you about the savings. Let's find out whether the old one can be fixed before we decide about this box.'",
    resist:"Jill lays down a timetable Jack never agreed to. He says, 'You don't get to decide for both of us again.'"},
   ask:{ack:"I'll invite Jack to make the actual decision with me; I won't call a proposal an agreement.",
    action:"Jill says, 'I'll leave it sealed tonight if you'll actually check the old one tomorrow. Will you do that? Not another Saturday.'",
    resist:"Jill says she wants Jack's input but starts tearing at the tape while he is answering."}
  }
 }
};
export function wantsMicrowaveOpened(value){
 const text=String(value||"").toLowerCase();
 return /\b(?:open|unbox|install|use|set up)\s+(?:the\s+|our\s+|new\s+)*microwave\b/.test(text)&&
  !/\b(?:don't|do not|never)\s+(?:open|unbox|install|use|set up)\b|\b(?:keep|leave)\s+(?:it\s+)?sealed\b|\bnot yet\b/.test(text);
}
export function sourceMicrowaveOutcome(episode,phase,history,outcome){
 const advise=(role,at)=>String((history||[]).find(x=>x.role===role&&x.kind==="coach"&&x.phase_index===at)?.body||"").toLowerCase();
 const lastJill=advise("jill",3);
 const openRequest=wantsMicrowaveOpened(lastJill);
 if(phase===4){
  if(openRequest)return "Jill pulls the tape from the new box. Jack steps back. 'I asked you to make this decision with me.' She says, 'I know. I'm making it anyway.' The tape is broken, and the disagreement gets sharper.";
  if(outcome==="mutual")return "Jack says, 'I'll check the repair tomorrow. Then we'll look at the numbers together.' Jill takes her hand off the tape. 'All right. But I need you to do what you said this time.' The box stays sealed.";
  if(outcome==="jack_ready")return "Jack offers to check the repair tomorrow. Jill says, 'I've heard tomorrow before.' She leaves the tape untouched but accepts no plan.";
  if(outcome==="jill_ready")return "Jill offers to check the options. Jack says he isn't ready to agree after the surprise withdrawal. The box stays sealed.";
  if(outcome==="partial")return "Jack hears that Jill needs an answer about the repair. Jill hears that Jack needs consultation about savings. Neither agrees on what to do tomorrow. The box stays sealed.";
  return "Jill leaves her hand on the unopened box. Jack still wants a say in the savings; she still wants a working appliance. Neither accepts the other's proposed next step.";
 }
 if(phase===5){
  if(openRequest)return "The tape hangs loose from the box. Jack puts his cracked phone face down. Jill doesn't take back her choice. Neither can pretend the unopened-box decision is still available.";
  if(outcome==="mutual")return "Jack folds his old SATURDAY note into his pocket rather than leaving it on the broken unit. Jill moves the receipt next to his phone. Neither smiles, but both leave the tape untouched.";
  if(outcome==="jack_ready")return "Jack keeps his repair note instead of hiding it. Jill turns back toward the stove. The box stays sealed, but his proposed next step is still unaccepted.";
  if(outcome==="jill_ready")return "Jill leaves the receipt where Jack can see it. He doesn't touch the box. Her offer stands without his agreement.";
  if(outcome==="partial")return "Jill clears a plate from the stove. Jack folds the Saturday note without putting it back. The box stays sealed; they have not reached a shared decision.";
  return "Jack keeps the old SATURDAY note in his hand. Jill sets down the dish towel. The new microwave stays sealed, and neither pretends the argument is over.";
 }
 return "";
}

export const MICROWAVE_SOURCE_SCENES=Object.freeze([
  "Thursday at 7:15 p.m., Jack checks the emergency savings on his cracked phone as Jill enters their kitchen carrying a boxed $400 over-the-range microwave. The old one has been dead for three weeks, and his handwritten 'I'LL FIX IT SATURDAY' note is still stuck to it. Jill sets the sealed box on the counter. 'Four hundred dollars?' Jack says. 'Three Saturdays,' Jill answers. 'I'm tired of reheating dinner on the stove.' He looks from his phone to the note. Neither has heard the other's full reasoning.",
  "At 7:17, Jack sets his cracked phone beside the new box. 'You saw the charge,' Jill says. 'Did you also see your note on the old microwave?' Jack looks at the three-week-old SATURDAY promise. The new box is still sealed. He faces Jill rather than walking away.",
  "At 7:20, Jill slides the receipt across the counter. Jack looks at the amount, then at the dead over-the-range microwave with his SATURDAY note. He puts one hand flat on the counter and waits. The replacement is still sealed. Jill turns to answer him.",
  "At 7:25, Jack stands beside the dead over-the-range microwave and rereads the SATURDAY note. Jill is by the unopened replacement. 'I don't need a speech,' she says. 'I need an answer about what you will actually do.' Jack looks at the note, then directly at her.",
  "At 7:30, the sealed $400 box sits on the same kitchen counter. Jill rests her hand near its tape. Jack stays beside the broken old microwave, waiting for her response.",
  "At 7:33, Jill clicks off the stove and puts the saucepan in the sink. Jack reaches toward the SATURDAY note still taped to the dead microwave. The replacement sits on the same counter. His cracked phone lies beside the $400 receipt. For a moment the kitchen is quiet enough to hear the stove vent stop rattling."
]);
