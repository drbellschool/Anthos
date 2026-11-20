// Anthos 4.1 — authored coaching inside the existing v4 room and message lifecycle.
// No generative scene-writing calls. The episode script is snapshotted in room.episode.
// Only fictional character actions enter shared scenes; private advice stays private.
export const AUTHORED_VERSION="4.1.0";
export const AUTHORED_TITLE="The Four-Hundred-Dollar Surprise";
const PHASES=["hook","conflict","discovery","reattempt","outcome","reflection"];
const limit=(x,min,max)=>Math.max(min,Math.min(max,x));

const microwave={
 version:AUTHORED_VERSION, template:"microwave-authored-1",
 facts:{buyer:"Jill",purchase:400,payment:"shared emergency savings",box:"sealed",location:"kitchen"},
 scenes:[
  "At six ten, Jill sets a sealed microwave box on the kitchen counter. Jack stares at the price printed on the receipt: four hundred dollars, taken from their shared emergency savings. Jill says she finally replaced the old microwave after waiting three weeks for Jack to arrange its repair. Jack says that was not permission to spend the money. Neither is entirely wrong about the frustration. Neither sounds particularly interested in admitting it. The box sits between them like a very expensive third person at dinner.",
  "Five minutes pass in the same kitchen. The new microwave remains sealed on the counter, and the old one still has not been repaired. The fight is no longer about whether the replacement has enough settings. It is about being consulted and being taken seriously. What each of them says next changes whether the other hears an explanation or another accusation.",
  "At six twenty-two, the receipt lies beside the sealed box. The emergency savings and the three-week repair delay are the same facts, but each spouse has a different story about what those facts mean. The question now is whether either can actually hear the fear and frustration beneath the other's argument.",
  "At six thirty, neither has left the kitchen. Jack still worries about the savings, and Jill still resents the delayed repair. The box is still unopened. One of them tries to restart the conversation; whether it becomes a real attempt or just another argument depends on what each is willing to do next.",
  "At six thirty-five, the sealed microwave box still sits on the counter. Nobody has checked the store's actual return policy, and neither can claim to know it. The larger question is whether they can make a plan while both still have legitimate, unresolved concerns.",
  "By six forty-two, the replacement microwave remains sealed in the kitchen. The original repair delay and the surprise withdrawal still happened, regardless of how the conversation went. Tomorrow's possibilities depend on what Jack and Jill actually managed to say and hear tonight."
 ],
 roles:{
  jack:{
   prompts:[
    "Jill spent four hundred dollars, and I'm standing here counting every dollar we had put away. I also know I kept postponing the old microwave repair. Do I own that part, explain why the savings worry me, or ask what she needed from me?",
    "She says she waited three weeks. I hear that, but I still feel like the savings account got mugged. Do I admit I stalled, explain why the money mattered, or ask what she was trying to solve?",
    "I'm starting to see this isn't only about an appliance. But I hate the idea of apologizing and being told the spending was fine. Should I own my delay, state my concern, or ask her to tell me more?",
    "We are trying again. I've got a whole speech ready, and most of it sounds like a closing argument. Should I own my share, explain my worry, or just ask what hurt her?"
   ],
   options:[
    {id:"own",label:"Own your part in delaying the repair",objection:"So I apologize for procrastinating, and suddenly the four hundred dollars vanishes from the discussion? That feels suspiciously convenient. I know I dropped the ball, but I also felt blindsided.",ack:"Fine. I'll own the three-week delay. I can do that without pretending I agreed to the purchase.",resist:"I'm still having trouble saying it without adding a 'but'. I'll try to acknowledge the delay instead of reopening the entire trial.",deltas:{accountability:2,defensiveness:-1}},
    {id:"explain",label:"Explain why the emergency savings matter",objection:"I can explain my worry. My problem is that every explanation comes out sounding like I'm presenting Exhibit A against Jill. Even my inner lawyer is asking for a recess.",ack:"I'll tell her the account scared me, not that she is irresponsible. That distinction might be worth a try.",resist:"I feel like I'm defending myself again. I'll try not to make the money explanation into an accusation.",deltas:{accountability:0,defensiveness:-1}},
    {id:"ask",label:"Ask Jill what she needed from you",objection:"Ask her? I thought I already knew: a microwave that worked. I suppose there's a chance she wanted me to listen before I became the budget police.",ack:"I'll ask what the delay cost her instead of telling her what she should have done. I can't promise I'll enjoy the answer.",resist:"I still want to explain my side, but I'll start with a question and see whether I can stay quiet long enough to hear it.",deltas:{accountability:1,defensiveness:-2}}
   ],
   actions:[
    ["Jack acknowledges that he postponed the repair for three weeks, without excusing the surprise purchase.","Jack admits the repair delay but adds another defense before Jill can respond.","Jack names the overdue repair and makes room for Jill to answer.","Jack acknowledges that he still struggles to apologize without qualifying it."],
    ["Jack tells Jill the withdrawal frightened him instead of declaring her financially reckless.","Jack starts to explain the savings concern and catches himself turning it into an accusation.","Jack describes why the emergency fund matters and then pauses.","Jack repeats his financial concern, but not as proof that Jill is irresponsible."],
    ["Jack asks what waiting three weeks was like for Jill, and listens before answering.","Jack asks what Jill needed, then nearly interrupts her response.","Jack asks a specific question about Jill's frustration rather than guessing.","Jack asks Jill to explain what mattered most to her."]
   ]
  },
  jill:{
   prompts:[
    "Jack just saw the price. I bought the microwave because the old one stayed broken for weeks, but I didn't talk to him first. Do I acknowledge that, explain what the delay was like, or ask what scares him most?",
    "He keeps talking about emergency savings. I'm not ignoring the money; I'm tired of being told to wait for a repair that never comes. Should I own the surprise, explain my frustration, or ask what he needs?",
    "I know why the withdrawal hurt him now. But I also need him to understand that I wasn't buying a toy. Do I acknowledge the decision, explain the exhaustion, or ask about his concern?",
    "I want to say I was right, full stop. That speech would fit on a bumper sticker. Should I own my part, explain my reasons, or ask Jack what would help us decide together?"
   ],
   options:[
    {id:"own",label:"Acknowledge buying it without asking",objection:"I can apologize for surprising him. I just don't want that apology translated into 'three weeks without a microwave was fine.' It wasn't fine. I had reheated enough dinners in a saucepan to earn a medal.",ack:"I'll tell him I should have checked first. I'm not withdrawing my frustration along with the money.",resist:"I can acknowledge the surprise without pretending I wasn't worn out. I'll try to keep those two truths separate.",deltas:{accountability:2,defensiveness:-1}},
    {id:"explain",label:"Explain how the delay affected you",objection:"I tried explaining it. It sounded like I was keeping score: day one, day two, day twenty-one, microwave still deceased. How do I explain being worn out without making him the villain?",ack:"I'll tell him what those three weeks felt like, without using the calendar as a weapon.",resist:"I'll explain the inconvenience, but I need to catch myself before I turn it into a prosecution.",deltas:{accountability:0,defensiveness:-1}},
    {id:"ask",label:"Ask what worries Jack most",objection:"I think I know what he is going to say: 'the savings.' But maybe I'm skipping the part where he explains why that money feels so important. I do that when I'm frustrated.",ack:"I'll ask him what the missing savings represents to him. I can listen even if I still think the microwave was necessary.",resist:"I'll ask what he's scared of, though I'm not ready to agree that my need didn't matter.",deltas:{accountability:1,defensiveness:-2}}
   ],
   actions:[
    ["Jill acknowledges spending from the shared savings without consulting Jack.","Jill names the surprise but hesitates before she can fully accept her part.","Jill admits she should have consulted Jack while preserving her frustration.","Jill says the unannounced purchase was her decision to own."],
    ["Jill describes the inconvenience of the broken appliance without listing Jack's failures.","Jill begins counting the weeks and then stops herself.","Jill explains why waiting left her feeling unheard.","Jill describes the delay without pretending it justified every choice."],
    ["Jill asks why the emergency savings feel so important to Jack.","Jill asks about the savings but struggles not to defend herself immediately.","Jill invites Jack to explain what the withdrawal meant to him.","Jill asks a direct question instead of guessing Jack's motive."]
   ]
  }
 }
};

export function buildAuthored41(episode){
 if(String(episode?.title||"").trim().toLowerCase()!==AUTHORED_TITLE.toLowerCase())
  throw new Error("4.1 authored pilot currently supports only The Four-Hundred-Dollar Surprise.");
 if(episode?.pilotMode!=="shared")
  throw new Error("4.1 authored pilot requires two private coaches.");
 return {...episode,authored41:structuredClone(microwave),
  checkpoints:["hook","conflict","discovery","reattempt","outcome"].map((afterPhase,i)=>({
   afterPhase,audience:i<4?"both":"none",waitForReply:i<4,
   purpose:i<4?"Help the character make a choice under tension.":"",humorCue:""
  }))};
}
export const isAuthored41=room=>room?.episode?.authored41?.version===AUTHORED_VERSION;
export function authoredOptions(episode,role,phase){
 if(phase>3||phase<0||!["jack","jill"].includes(role))return [];
 return (episode?.authored41?.roles?.[role]?.options||[]).map(({id,label})=>({id,label}));
}
export function selectedAuthoredChoice(episode,role,phase,history=[]){
 const options=episode?.authored41?.roles?.[role]?.options||[];
 const selected=(history||[]).filter(x=>x.role===role&&x.phase_index===phase&&x.kind==="question")
  .find(x=>options.some(option=>option.label===x.body));
 return options.find(x=>x.label===selected?.body)||null;
}
export function classifyAuthoredFollowup(text){
 const s=String(text||"").toLowerCase().replace(/[’]/g,"'");
 // A warning AGAINST intimidation is not itself coercive advice.
 const withoutProhibitions=s.replace(/\b(?:don't|do not|never|please don't|avoid|stop|shouldn't|must not)\s+(?:try to\s+)?(?:hit|slap|punch|force|threaten|blackmail|coerce)\b/g,"[prohibited harm]");
 if(/\b(?:hit|slap|punch|force|threaten|blackmail|coerce)\b/.test(withoutProhibitions))return "unsafe";
 if(/\b(?:don't|do not|never|shouldn't|not going to)\s+(?:try to\s+)?(?:apolog\w*|listen|acknowledg\w*|ask|own)\b/.test(s))return "resist";
 if(/\b(?:never admit|do not admit|don't admit|no need to apologize|none of this is your fault)\b/.test(s))return "resist";
 if(/\b(?:apolog|acknowledg|listen|understand|respect|ask|explain|hear|own|care|validat|honest|calm|talk|speak|take responsibility)\w*/.test(s))return "engage";
 if(/\b(?:it's all (?:his|her|their) fault|blame|punish|teach (?:him|her) a lesson)\b/.test(s))return "resist";
 return "unclear";
}
export function authoredCommitment(choice,text){
 const kind=classifyAuthoredFollowup(text);
 if(kind==="unsafe")return "I'm not going to intimidate my spouse. That would make this worse, not better.";
 if(kind==="resist")return choice.resist;
 if(kind==="engage")return choice.ack;
 return "I don't know if I caught everything you meant. I'll try the part I understand, but I may need to ask you again afterward.";
}
export function authoredSignals(episode,history=[]){
 const state={jack:{accountability:3,defensiveness:7},jill:{accountability:3,defensiveness:7}};
 for(let phase=0;phase<4;phase++)for(const role of ["jack","jill"]){
  const option=selectedAuthoredChoice(episode,role,phase,history);
  const submitted=(history||[]).find(x=>x.role===role&&x.phase_index===phase&&x.kind==="coach");
  if(!option||!submitted)continue;
  const factor=classifyAuthoredFollowup(submitted.body)==="engage"?1:0;
  for(const [k,delta] of Object.entries(option.deltas||{}))
   state[role][k]=limit(state[role][k]+factor*delta,0,10);
 }
 return state;
}
// Applies only to fiction: derived from the actual saved private coaching acts.
// Do not convert scores into assessments of the participating real couple.
function storyOutcome(history=[]){
 const counts={jack:{engaged:0,opposed:0},jill:{engaged:0,opposed:0}};
 for(const event of history){
  if(event.kind!=="coach"||event.phase_index<0||event.phase_index>3||!counts[event.role])continue;
  const kind=classifyAuthoredFollowup(event.body);
  if(kind==="engage")counts[event.role].engaged++;
  else counts[event.role].opposed++;
 }
 const j=counts.jack,l=counts.jill;
 if(j.engaged>=3&&l.engaged>=3&&j.opposed===0&&l.opposed===0)return "mutual";
 if(j.engaged>=2&&l.engaged<2)return "jack_ready";
 if(l.engaged>=2&&j.engaged<2)return "jill_ready";
 if(j.engaged>=2&&l.engaged>=2)return "partial";
 return "stalemate";
}
function authoredOutcomeBeat(outcome,phase){
 if(phase===2){
  if(outcome==="mutual"||outcome==="partial")return "Both are beginning to name their own worries. Neither assumes that listening requires endorsing the surprise purchase or the delayed repair.";
  if(outcome==="jack_ready")return "Jack is beginning to make space for Jill's frustration; Jill is not ready to offer the same openness.";
  if(outcome==="jill_ready")return "Jill begins to listen to Jack's fear about the savings; Jack still treats her concern as a personal attack.";
  return "Neither is ready to admit much. Jack keeps returning to the spending, while Jill keeps returning to the unanswered repair request. The deeper fear remains unspoken.";
 }
 if(phase===4){
  if(outcome==="mutual")return "Jack and Jill agree to keep the box sealed tonight. They write a note to check the actual purchase options tomorrow, then discuss future spending before deciding what to do. They still disagree about whose frustration was greater, but both accept the next step.";
  if(outcome==="jack_ready")return "Jack proposes leaving the box sealed and reviewing the options tomorrow. Jill does not agree yet; she asks why her three weeks of waiting are only now being taken seriously. They have not reached a joint plan.";
  if(outcome==="jill_ready")return "Jill proposes checking options for the sealed box tomorrow. Jack cannot yet agree and keeps circling back to the emergency fund. There is no jointly accepted plan.";
  if(outcome==="partial")return "They make some progress explaining their concerns but cannot agree on the next decision. The sealed box remains untouched, and they leave the question of what to do with it open.";
  return "Jack returns to the savings withdrawal, and Jill returns to the repair delay. Neither accepts the other's proposed next step. The box remains sealed only because neither opens it; no joint decision has been reached.";
 }
 if(phase===5){
  if(outcome==="mutual")return "Jack places the receipt beside the budget notebook so they can review actual options tomorrow. Jill agrees to take part in that conversation. No one claims the disagreement has disappeared; they have made one specific joint commitment.";
  if(outcome==="jack_ready")return "Jack leaves a note to revisit the issue tomorrow. Jill does not promise to join him. He realizes that taking responsibility himself cannot force her to be ready.";
  if(outcome==="jill_ready")return "Jill leaves the receipt on the counter rather than packing it away. Jack has not agreed to a plan. Her willingness to try again is real, but it is not a mutual repair.";
  if(outcome==="partial")return "Both agree that there is more to discuss, but neither commits to a specific solution. The appliance decision and the question of shared spending remain unresolved.";
  return "Jack remains at the kitchen table while Jill stands by the sink. The unopened box is still there. They have reached no agreement, and tonight's coaching has not repaired their conflict.";
 }
 return "";
}
export function authoredScene(episode,phase,history=[]){
 const script=episode?.authored41;
 if(!script||script.version!==AUTHORED_VERSION||!Number.isInteger(phase)||phase<0||phase>5)
  throw new Error("Invalid 4.1 episode or phase.");
 const base=script.scenes[phase];
 if(typeof base!=="string"||base.length<80)throw new Error("Missing authored scene.");
 const parts=[base];
 if(phase>0&&phase<5){
  for(const role of ["jack","jill"]){
   const selected=selectedAuthoredChoice(episode,role,phase-1,history);
   const reply=(history||[]).find(x=>x.role===role&&x.phase_index===phase-1&&x.kind==="coach");
   if(!selected||!reply)throw new Error("Cannot advance without both completed private coaching exchanges.");
   const index=(script.roles[role].options||[]).findIndex(x=>x.id===selected.id);
   const action=script.roles[role].actions[index]?.[phase-1]||"";
   if(action.length<20)throw new Error("Missing authored consequence.");
   const attitude=classifyAuthoredFollowup(reply.body);
   const name=role==="jack"?"Jack":"Jill";
   const focus=selected.id==="own"?"taking responsibility for a mistake":
    selected.id==="explain"?"explaining the concrete concern":"asking a real question";
   const fallback=attitude==="unsafe"?
    name+" refuses intimidation and says "+focus+" still deserves a respectful conversation.":
    attitude==="resist"?
    name+" stays defensive about "+focus+", and the other person grows more frustrated.":
    attitude==="unclear"?
    name+" asks for clarification before attempting "+focus+", rather than pretending to understand.":
    action;
   parts.push(fallback);
  }
 }
 const fictionalSignals=authoredSignals(episode,history);
 if(phase===2||phase===4||phase===5)parts.push(authoredOutcomeBeat(storyOutcome(history),phase));
 const scene=parts.join(" ");
 if(/\b(?:30.days? to return|return policy is|refund guaranteed)\b/i.test(scene))
  throw new Error("Unverified external return policy in authored scene.");
 return {scene,
  jackPrompt:phase<4?script.roles.jack.prompts[phase]:"",
  jillPrompt:phase<4?script.roles.jill.prompts[phase]:"",
  fictionalSignals};
}
