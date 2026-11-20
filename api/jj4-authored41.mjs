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
  "At six twenty-two, the receipt lies beside the sealed box. Jack finally admits that seeing the emergency savings used frightened him. Jill admits that three weeks without a working microwave made her feel that her requests were optional. Neither revelation fixes the purchase. It does explain why their argument keeps missing the target.",
  "At six thirty, they attempt the conversation again without leaving the kitchen. Jack has an opportunity to describe his worries without making Jill the enemy. Jill has an opportunity to explain her frustration without dismissing their shared budget. The box is still unopened, and they are still two people trying to settle one disagreement.",
  "At six thirty-five, the couple agrees not to open the replacement tonight. They have not established a return policy, and neither pretends to know one. Instead they write down two decisions to revisit tomorrow: whether to keep the appliance after checking real options, and how either spouse should handle an unexpected major purchase. They have not agreed about the past.",
  "By six forty-two, Jack moves the receipt into a folder, leaving the microwave box sealed on the counter. Jill puts a pen beside the budget notebook. The decision about the appliance is still open. Both know tomorrow will require another conversation, and neither can guarantee that conversation will be easy. Their disagreement remains real."
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
 const s=String(text||"").toLowerCase();
 if(/\b(?:hit|slap|punch|force|threaten|blackmail|coerce)\b/.test(s))return "unsafe";
 if(/\b(?:no|never|don't|do not|wrong|blame|fault|punish|ridiculous)\b/.test(s)&&
   (!/\b(?:apolog|acknowledge|listen|understand|respect|ask)\w*/.test(s)||
    /\b(?:don't|do not|never)\s+(?:apolog\w*|listen|acknowledg\w*|ask)\b/.test(s)))return "resist";
 if(/\b(?:apolog|acknowledg|listen|understand|respect|ask|explain|hear|own|care|validat|honest|calm|talk)\w*/.test(s))return "engage";
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
 if(phase===5){
  const jackReady=fictionalSignals.jack.accountability>=6;
  const jillReady=fictionalSignals.jill.accountability>=6;
  parts.push(jackReady&&jillReady?
   "Jack owns the weeks of delay and Jill owns the unannounced withdrawal. Neither demands instant agreement; both are ready to revisit the purchase together.":
   jackReady||jillReady?
   (jackReady?"Jack":"Jill")+" accepts some responsibility while the other still feels unheard. The plan for tomorrow is fragile, not a finished repair.":
   "Neither accepts much responsibility yet. They leave the budget notebook on the counter, knowing tomorrow's conversation could be harder than tonight's.");
 }
 const scene=parts.join(" ");
 if(/\b(?:30.days? to return|return policy is|refund guaranteed)\b/i.test(scene))
  throw new Error("Unverified external return policy in authored scene.");
 return {scene,
  jackPrompt:phase<4?script.roles.jack.prompts[phase]:"",
  jillPrompt:phase<4?script.roles.jill.prompts[phase]:"",
  fictionalSignals};
}
