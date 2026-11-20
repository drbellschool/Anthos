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
  "At six fifteen, the new microwave is still sealed. Jill points to a note beneath the smiling tomato magnet: in Jack's handwriting, 'Saturday — fix microwave.' Three Saturdays have passed. Jack studies it as if handwriting analysis might establish an alibi. Jill says the reminder made her expect a repair. The receipt remains beside the box. Neither has conceded the emergency-savings argument.",
  "At six twenty-two, Jill describes reheating dinner in a saucepan. Jack laughs; Jill goes quiet. 'Glad my inconvenience is entertaining,' she says. Jack's smile fades. The receipt, unopened box, and forgotten fridge reminder stay where they were. Neither has explained the laughter.",
  "At six thirty, Jill puts the budget notebook beside the receipt. Jack wants major withdrawals discussed first; Jill wants promised repairs completed. Jack starts a sentence with 'but.' Jill lifts an eyebrow, and he stops. The microwave is still unopened. They have another chance to propose a next step without pretending the disagreement is settled.",
  "At six thirty-five, nobody has checked the store's return policy. The microwave box remains sealed. Tomorrow's decision depends on what Jack and Jill actually accept.",
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

// Each scene has its own emotional dilemma, objection, consequence and comedy beat.
// Authored before the session; no model is allowed to invent these events at runtime.
microwave.coachingCheckpoints={
 "jack": [
  {
   "prompt": "I meant to fix the old microwave, and Jill bought a new one with the emergency savings. I've got a defense ready, plus about three weeks of not fixing anything. What do I say first?",
   "options": [
    {
     "id": "own",
     "label": "Admit the repair delay",
     "objection": "You want me to admit I dropped the ball before I even mention the four hundred dollars? My inner attorney just filed an objection.",
     "ack": "I'll tell her I didn't follow through on Saturday. That isn't permission to raid savings, but it is my responsibility.",
     "resist": "My mouth is still drafting an excuse. I might need to put the word 'but' on a timeout.",
     "action": "Jack admits he promised to address the repair and failed, then waits while Jill responds.",
     "resisted": "Jack tries to defend his schedule rather than owning the delay; Jill looks away."
    },
    {
     "id": "explain",
     "label": "Explain why emergency savings scared you",
     "objection": "The money part matters. But if I open with 'you spent our emergency fund,' I may as well begin with 'Ladies and gentlemen of the jury.'",
     "ack": "I'll describe why that account makes me feel safe, and I'll keep the accusation out of it.",
     "resist": "I can feel the speech turning into a prosecution. I am not ready to get past that.",
     "action": "Jack says that dipping into the emergency savings frightened him, without calling Jill careless.",
     "resisted": "Jack accuses Jill of ignoring his financial concerns; she crosses her arms."
    },
    {
     "id": "ask",
     "label": "Ask why Jill felt she couldn't wait",
     "objection": "Ask her what she needed? I was physically in this kitchen for those three weeks. I am starting to suspect that wasn't the same as being useful.",
     "ack": "I'll ask what waiting was like and let her finish before I answer.",
     "resist": "I asked, but half of me was still preparing my rebuttal.",
     "action": "Jack asks why the wait felt intolerable and listens instead of defending his calendar.",
     "resisted": "Jack asks a question and immediately interrupts with his own excuse."
    }
   ]
  },
  {
   "prompt": "I just noticed the repair reminder I wrote on the fridge. Three Saturdays have gone by. It's sitting there under a smiling tomato magnet, judging me. Do I admit I forgot, explain what happened, or ask Jill about those weeks?",
   "options": [
    {
     "id": "own",
     "label": "Own the forgotten fridge reminder",
     "objection": "My own handwriting. Three Saturdays. Even the smiling tomato looks disappointed in me. I could say I was busy, which is true, but not particularly helpful.",
     "ack": "I'll admit the reminder was mine and that I kept moving the job to next weekend.",
     "resist": "I keep saying 'I meant to.' She has heard that speech already.",
     "action": "Jack points to his dated repair reminder and admits he repeatedly postponed the job.",
     "resisted": "Jack tells Jill the reminder does not prove anything about his intentions; she shakes her head."
    },
    {
     "id": "explain",
     "label": "Explain the delay without making excuses",
     "objection": "I was exhausted after work, not plotting to deprive anyone of hot leftovers. Trouble is, that sounds suspiciously like another excuse.",
     "ack": "I'll explain what got in the way, then admit that I still needed to follow through.",
     "resist": "The reasons keep coming faster than the apology. I can hear it happening.",
     "action": "Jack describes his fatigue and concedes that no repair was arranged despite his promise.",
     "resisted": "Jack lists every tiring day of the past month until Jill stops listening."
    },
    {
     "id": "ask",
     "label": "Ask what waiting cost Jill",
     "objection": "So I ask what three weeks were like? She might tell me exactly how bad they were. Is there an emergency exit for uncomfortable answers?",
     "ack": "I'll ask, and I'll keep my next sentence to myself until she's finished.",
     "resist": "I want to ask and then correct her account. That's not really listening, is it?",
     "action": "Jack asks Jill what the repeated delay meant to her and does not interrupt her answer.",
     "resisted": "Jack asks what the delay cost Jill, then disputes the first example she offers."
    }
   ]
  },
  {
   "prompt": "Jill says she was reheating dinner in a saucepan. I laughed once, and I think she thought I was laughing at her. I wasn't. I'm scared about the savings, but now I have to decide how to say that without erasing her frustration.",
   "options": [
    {
     "id": "own",
     "label": "Acknowledge why the saucepan joke hurt",
     "objection": "I laughed because picturing a saucepan as a microwave is absurd. She looked at me like I was the appliance that needed replacing.",
     "ack": "I'll tell her I wasn't laughing at her, then apologize for how it landed.",
     "resist": "I still think the image is funny. She doesn't. I have to stop arguing about the joke.",
     "action": "Jack tells Jill the laugh came from surprise, then apologizes for making her frustration feel ridiculous.",
     "resisted": "Jack insists she misunderstood the joke; Jill stops describing her experience."
    },
    {
     "id": "explain",
     "label": "Share the fear beneath your budget argument",
     "objection": "I want to say 'it's emergency savings' for the fifth time. Maybe the important bit is that I remember what being short on money felt like.",
     "ack": "I'll say the withdrawal frightened me, not that she is irresponsible.",
     "resist": "I can hear myself counting dollars instead of explaining what they meant to me.",
     "action": "Jack explains that losing the financial cushion frightened him, instead of repeating the dollar amount as an accusation.",
     "resisted": "Jack repeats the number four hundred until Jill says she already knows the price."
    },
    {
     "id": "ask",
     "label": "Ask Jill what she heard when you laughed",
     "objection": "Ask what she heard in my laugh? That is dangerous territory for a man who is not even sure what his own laugh meant.",
     "ack": "I'll ask what she thought I meant and hear her answer before correcting anything.",
     "resist": "I'm tempted to explain the joke before I know how it affected her.",
     "action": "Jack asks what his laughter communicated and listens to Jill's explanation.",
     "resisted": "Jack asks but interrupts with an explanation of why the saucepan was funny."
    }
   ]
  },
  {
   "prompt": "We're at the budget notebook now. Jill wants to know what happens to the microwave tomorrow. I don't want to surrender the money question, and I don't want a fourth round of the same argument. What's my move?",
   "options": [
    {
     "id": "own",
     "label": "Offer a concrete next step you can own",
     "objection": "I could actually do something instead of promising to 'look into it.' That phrase has had a terrible month in our house.",
     "ack": "I'll offer to check the real purchase options tomorrow, without asking her to agree tonight.",
     "resist": "I want to promise a fix in five minutes, but I know where that got us.",
     "action": "Jack offers to check the actual purchase options the next day without pretending Jill has already agreed.",
     "resisted": "Jack promises an instant solution without checking what is possible; Jill looks skeptical."
    },
    {
     "id": "explain",
     "label": "State a spending boundary without an ultimatum",
     "objection": "I need us to talk before big withdrawals. But 'never do this again' sounds more like a warning label than a conversation.",
     "ack": "I'll tell her I want joint decisions on large withdrawals, and I'll ask how to make that workable.",
     "resist": "I can feel myself turning a future agreement into a punishment for yesterday.",
     "action": "Jack states his need for joint discussion of major spending and leaves Jill free to respond.",
     "resisted": "Jack demands a unilateral spending rule; Jill resists being ordered around."
    },
    {
     "id": "ask",
     "label": "Invite Jill to shape tomorrow's plan",
     "objection": "If I ask what she thinks we should do, she might say 'keep it.' I would prefer a plan that doesn't arrive gift-wrapped with a verdict.",
     "ack": "I'll ask what a fair next step looks like to her and listen for something we can both accept.",
     "resist": "I keep wanting her to choose the answer already in my head.",
     "action": "Jack invites Jill to propose a next step without treating his own preferred answer as settled.",
     "resisted": "Jack asks for Jill's input but immediately vetoes every option she mentions."
    }
   ]
  }
 ],
 "jill": [
  {
   "prompt": "Jack saw the receipt. I spent our emergency savings because the old microwave stayed broken for weeks, and I didn't ask first. I'm not proud of the surprise. Do I admit it, explain why I reached my limit, or hear what he is frightened of?",
   "options": [
    {
     "id": "own",
     "label": "Own the unannounced purchase",
     "objection": "I can admit I should have called first. I just can't let him translate that into 'the repair delay was perfectly fine.' Because it wasn't.",
     "ack": "I'll tell him I should have checked with him before spending our shared savings.",
     "resist": "I can say I surprised him; I still don't want him to miss what happened before that.",
     "action": "Jill acknowledges she made the purchase without asking and does not claim the delay justified the decision.",
     "resisted": "Jill argues that waiting three weeks gave her permission to spend whatever she wanted."
    },
    {
     "id": "explain",
     "label": "Explain why the delay wore you down",
     "objection": "I had to reheat leftovers in a saucepan. I'm one step away from inventing stove-top popcorn for the office. How do I tell him I'm tired without filing a complaint?",
     "ack": "I'll explain how the broken appliance affected our days without making a list of all his failures.",
     "resist": "I want to count the dinners I reheated. It's hard not to make this a scoreboard.",
     "action": "Jill describes what the weeks without a working microwave were like without attacking Jack's character.",
     "resisted": "Jill recites every delayed dinner as an accusation; Jack retreats to the receipt."
    },
    {
     "id": "ask",
     "label": "Ask what the emergency fund represents to Jack",
     "objection": "He keeps saying 'emergency fund' as if I spent the children's college fund on a golden toaster. But maybe that money means something to him I haven't asked about.",
     "ack": "I'll ask what that cushion meant to him before defending my decision again.",
     "resist": "I want to answer his fear with my inconvenience. I haven't listened yet.",
     "action": "Jill asks why the emergency savings matter so much to Jack and pauses for his answer.",
     "resisted": "Jill asks about Jack's worry, then dismisses his first answer."
    }
   ]
  },
  {
   "prompt": "I noticed Jack's repair reminder under that ridiculous tomato magnet. He wrote 'Saturday.' It has survived three Saturdays, which is more than I can say for my patience. Should I own my purchase, describe the delay, or ask what he intended?",
   "options": [
    {
     "id": "own",
     "label": "Separate your purchase from his missed promise",
     "objection": "His note proves he remembered, right? Actually, it proves he wrote a note. I still made the purchase without calling. Two wrongs apparently can share a fridge.",
     "ack": "I'll acknowledge my surprise purchase without using his forgotten reminder as a free pass.",
     "resist": "I want to hold the magnet up in court. There is no court; there is a kitchen.",
     "action": "Jill acknowledges that Jack's delayed repair and her unannounced spending are separate decisions.",
     "resisted": "Jill waves the old reminder as proof that she never needed to consult Jack."
    },
    {
     "id": "explain",
     "label": "Tell Jack what repeated postponement felt like",
     "objection": "I'm about to recite all twenty-one days. Maybe he doesn't need the documentary series, just the part where I stopped expecting help.",
     "ack": "I'll tell him I began to feel ignored when each promised Saturday passed.",
     "resist": "I still want him to know every inconvenience, complete with timestamps.",
     "action": "Jill says repeated postponements left her feeling that her requests were not urgent to Jack.",
     "resisted": "Jill lists every missed Saturday until the conversation becomes an argument over dates."
    },
    {
     "id": "ask",
     "label": "Ask why the repair kept slipping",
     "objection": "If I ask why he didn't follow through, I'm afraid the answer will be 'I forgot.' I can already feel my eyebrow filing an appeal.",
     "ack": "I'll ask what kept happening on Saturdays instead of supplying his excuse myself.",
     "resist": "I want to know the answer but also want to win. Those are competing projects.",
     "action": "Jill asks what made the repair difficult to complete and listens without excusing the delay.",
     "resisted": "Jill asks why he forgot and then mocks the first explanation."
    }
   ]
  },
  {
   "prompt": "I told Jack about reheating dinner in a saucepan. He laughed. He says he wasn't laughing at me, but I felt about two inches tall. Do I tell him that, listen to his money worry, or ask what he actually meant?",
   "options": [
    {
     "id": "own",
     "label": "Acknowledge why Jack felt blindsided",
     "objection": "I want him to understand my frustration. But he saw four hundred dollars disappear without warning. Maybe I can acknowledge the shock without defending the joke.",
     "ack": "I'll tell him I get why seeing that withdrawal surprised him, even though the repair still mattered.",
     "resist": "I feel like I'm apologizing for needing a working appliance. That's hard.",
     "action": "Jill acknowledges that finding the withdrawal on a receipt was upsetting for Jack.",
     "resisted": "Jill dismisses the surprise because she believes the purchase was necessary."
    },
    {
     "id": "explain",
     "label": "Explain why the laugh felt dismissive",
     "objection": "I can take a joke about a saucepan. I can't take one that makes three weeks of asking for help sound silly. How do I say that without turning mean?",
     "ack": "I'll tell him the laugh made me feel unheard, rather than accusing him of enjoying my struggle.",
     "resist": "I want to say 'you never listen' even though that is not what happened every time.",
     "action": "Jill tells Jack the laughter made her feel that her inconvenience was being treated lightly.",
     "resisted": "Jill accuses Jack of laughing at her on purpose without asking what he meant."
    },
    {
     "id": "ask",
     "label": "Ask what Jack's laugh meant",
     "objection": "It looked like he thought my saucepan routine was hilarious. Maybe it was a nervous laugh. I'd rather find out than guess.",
     "ack": "I'll ask what he was reacting to and explain what I heard without assuming his intention.",
     "resist": "I can ask, but I still have an accusation waiting in my back pocket.",
     "action": "Jill asks why Jack laughed and explains that it landed badly for her.",
     "resisted": "Jill demands an explanation and interrupts before Jack can answer."
    }
   ]
  },
  {
   "prompt": "Jack is looking at our budget notebook as though a pen could negotiate a peace treaty. We have to decide what to do tomorrow. I want a plan, not another promise to 'look into it.' What should I do?",
   "options": [
    {
     "id": "own",
     "label": "Own the spending decision before planning",
     "objection": "I can say I should have checked with him. I don't want us to end with a rule that only I have to follow while repairs can wait forever.",
     "ack": "I'll own my purchase and ask how we can make both spending and follow-through fair.",
     "resist": "I still want to lead with his delay. I need to leave room for my part.",
     "action": "Jill owns the unannounced purchase and proposes discussing both future spending and follow-through.",
     "resisted": "Jill demands Jack accept the purchase before she will discuss planning."
    },
    {
     "id": "explain",
     "label": "Describe a realistic repair-and-spending plan",
     "objection": "I'm tempted to draft a six-page household operating manual. He'll probably use it to prop up the old microwave.",
     "ack": "I'll ask for a specific timetable on repairs and a shared threshold for large purchases.",
     "resist": "I have a complete policy in my head already. I need to hear his ideas, too.",
     "action": "Jill proposes a concrete way to track repairs and consult each other before major purchases.",
     "resisted": "Jill presents an inflexible list of rules; Jack pushes back."
    },
    {
     "id": "ask",
     "label": "Invite Jack to make tomorrow's decision together",
     "objection": "I know what I want: a working microwave and no more three-week promises. But asking him to help decide might be better than announcing the verdict.",
     "ack": "I'll ask which options he is willing to review tomorrow, without requiring him to agree now.",
     "resist": "I want to call it a joint decision while already deciding the outcome. That's not quite joint.",
     "action": "Jill invites Jack to consider real options for the unopened appliance before making a final decision.",
     "resisted": "Jill asks for his opinion but treats disagreement as proof he isn't listening."
    }
   ]
  }
 ]
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
 const entries=episode?.authored41?.coachingCheckpoints?.[role]?.[phase]?.options;
 return (entries||episode?.authored41?.roles?.[role]?.options||[]).map(({id,label})=>({id,label}));
}
export function authoredObjection(episode,role,phase,optionId){
 const match=episode?.authored41?.coachingCheckpoints?.[role]?.[phase]?.options?.find(x=>x.id===optionId);
 return match?.objection||episode?.authored41?.roles?.[role]?.options?.find(x=>x.id===optionId)?.objection||"";
}
export function selectedAuthoredChoice(episode,role,phase,history=[]){
 const options=episode?.authored41?.roles?.[role]?.options||[];
 const choices=episode?.authored41?.coachingCheckpoints?.[role]?.[phase]?.options||[];
 const selected=(history||[]).filter(x=>x.role===role&&x.phase_index===phase&&x.kind==="question")
  .find(x=>options.some(option=>option.label===x.body)||choices.some(option=>option.label===x.body));
 const chosen=choices.find(x=>x.label===selected?.body)||
  options.find(x=>x.label===selected?.body);
 if(!chosen)return null;
 return {...(options.find(x=>x.id===chosen.id)||{}),...chosen};
}
export function classifyAuthoredFollowup(text){
 const s=String(text||"").toLowerCase().replace(/[’]/g,"'");
 // A warning AGAINST intimidation is not itself coercive advice.
 const withoutProhibitions=s.replace(/\b(?:don't|do not|never|please don't|avoid|stop|shouldn't|must not)\s+(?:try to\s+)?(?:hit|slap|punch|force|threaten|blackmail|coerce)\b/g,"[prohibited harm]");
 if(/\b(?:hit|slap|punch|force|threaten|blackmail|coerce)\b/.test(withoutProhibitions))return "unsafe";
 if(/\b(?:don't|do not|never|shouldn't|not going to)\s+(?:try to\s+)?(?:apolog\w*|listen|acknowledg\w*|ask|own)\b/.test(s))return "resist";
 if(/\b(?:never admit|do not admit|don't admit|no need to apologize|none of this is your fault)\b/.test(s))return "resist";
 if(/\b(?:don't|do not|never|refuse to|stop)\s+(?:try to\s+)?(?:offer|invite|propose|plan|review|check|decide|collaborate|make a plan)\b/.test(s))
  return "resist";
 if(/\b(?:apolog|acknowledg|listen|understand|respect|ask|explain|hear|own|care|validat|honest|calm|talk|speak|take responsibility|offer|propose|invite|collaborat|plan|review|check|decide together|work together|come up with|follow through)\w*/.test(s))return "engage";
 if(/\b(?:it's all (?:his|her|their) fault|blame|punish|teach (?:him|her) a lesson)\b/.test(s))return "resist";
 return "unclear";
}
// A bounded, deterministic interpretation of the coach's own words. This does
// not generate narrative, infer personal traits, or transmit private coaching.
// Explicit, positive first-step instructions may redirect the initial choice.
export function interpretAuthoredFollowup(text){
 const kind=classifyAuthoredFollowup(text);
 const original=String(text||"").toLowerCase().replace(/[’]/g,"'");
 if(kind!=="engage")return {kind,focus:null};
 const first=original.replace(/^(?:well|actually|instead|i think|please)[,\s]*/g,"");
 const options=[
  {id:"own",re:/\b(?:apolog\w*|acknowledg\w*|admit|own (?:your|the|my)|take responsibility|say (?:you|i)(?:'re| am| was) sorry|offer to (?:check|review|handle|take care)|commit to (?:check|review|follow))\b/g},
  {id:"ask",re:/\b(?:ask|listen|hear (?:him|her|them) out|hear (?:her|his|their) (?:side|perspective)|find out|let (?:him|her|them) (?:finish|speak)|invite (?:him|her|them)|decide together|work together|collaborat\w*)\b/g},
  {id:"explain",re:/\b(?:explain|share (?:your|his|her) (?:concern|worr|fear)|say why|tell (?:him|her) why|state (?:your|a) boundary|set (?:a|the) boundary|describe (?:your|his|her) (?:concern|fear)|propose (?:a|the) (?:plan|rule|boundary)|make (?:a|the) plan)\b/g}
 ];
 const matches=options.map(x=>({id:x.id,index:first.search(x.re)})).filter(x=>x.index>=0);
 matches.sort((a,b)=>a.index-b.index);
 return {kind,focus:matches[0]?.id||null};
}
export function effectiveAuthoredChoice(episode,role,phase,selected,text){
 const {kind,focus}=interpretAuthoredFollowup(text);
 if(kind!=="engage"||!focus||!selected||focus===selected.id)return selected;
 return episode?.authored41?.coachingCheckpoints?.[role]?.[phase]?.options?.find(x=>x.id===focus)||
  episode?.authored41?.roles?.[role]?.options?.find(x=>x.id===focus)||selected;
}
export function authoredCommitment(choice,text,context={}){
 const kind=classifyAuthoredFollowup(text);
 const role=context.role==="jill"?"jill":"jack";
 const phase=Number.isInteger(context.phase)?context.phase:0;
 if(kind==="unsafe")return role==="jack"?
  "I'm angry, but I'm not threatening Jill. That wouldn't repair anything between us.":
  "I'm frustrated, but I won't intimidate Jack. We need a conversation, not fear.";
 if(kind==="resist")return choice.resist;
 if(kind==="engage"){
  const effective=context.episode?
   effectiveAuthoredChoice(context.episode,role,phase,choice,text):choice;
  const pivot=effective.id!==choice.id?(role==="jack"?
   ["You're changing my approach. I thought I should explain, but okay. ",
    "I was ready to use the reminder as my defense. You're giving me a different first step. ",
    "All right, I hear a different direction than I expected. ",
    "So I need to change what I do next, not just change the wording. "][phase]||"All right. ":
   ["Okay, a change of direction. ",
    "That shifts what I was going to say about that tomato magnet. ",
    "You're asking me to try something different with Jack's reaction. ",
    "That is not the speech I had planned, but it might be better. "][phase]||"All right. "):"";
  return pivot+(effective.ack||choice.ack);
 }
 return role==="jack"?
  "I'm not sure what action you're suggesting. Are you asking me to own something, explain the money worry, or ask Jill a question?":
  "I'm missing the advice part. Should I acknowledge my decision, explain my frustration, or ask Jack something?";
}
export function authoredSignals(episode,history=[]){
 const state={jack:{accountability:3,defensiveness:7},jill:{accountability:3,defensiveness:7}};
 for(let phase=0;phase<4;phase++)for(const role of ["jack","jill"]){
  const option=selectedAuthoredChoice(episode,role,phase,history);
  const submitted=(history||[]).find(x=>x.role===role&&x.phase_index===phase&&x.kind==="coach");
  if(!option||!submitted)continue;
  const effective=effectiveAuthoredChoice(episode,role,phase,option,submitted.body);
  const factor=classifyAuthoredFollowup(submitted.body)==="engage"?1:0;
  const deltas=episode?.authored41?.roles?.[role]?.options?.find(x=>x.id===effective.id)?.deltas||option.deltas||{};
  for(const [k,delta] of Object.entries(deltas))
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
  if(outcome==="mutual"||outcome==="partial")return "Both begin naming their worries without endorsing each other's earlier decisions.";
  if(outcome==="jack_ready")return "Jack makes room for Jill; she is not ready to reciprocate.";
  if(outcome==="jill_ready")return "Jill listens more openly; Jack remains defensive about her purchase.";
  return "Both remain defensive; the deeper worries stay unspoken.";
 }
 if(phase===4){
  if(outcome==="mutual")return "Jack and Jill agree to keep the box sealed tonight. They write a note to check the actual purchase options tomorrow, then discuss future spending before deciding what to do. They still disagree about whose frustration was greater, but both accept the next step.";
  if(outcome==="jack_ready")return "Jack proposes leaving the box sealed and reviewing the options tomorrow. Jill does not agree yet; she asks why her three weeks of waiting are only now being taken seriously. They have not reached a joint plan.";
  if(outcome==="jill_ready")return "Jill proposes checking options for the sealed box tomorrow. Jack cannot yet agree and keeps circling back to the emergency fund. There is no jointly accepted plan.";
  if(outcome==="partial")return "They make some progress explaining their concerns but cannot agree on the next decision. The sealed box remains untouched, and they leave the question of what to do with it open.";
  return "Jack returns to the savings withdrawal, and Jill returns to the repair delay. Neither accepts the other's proposed next step. The box remains sealed only because neither opens it; no joint decision has been reached.";
 }
 if(phase===5){
  if(outcome==="mutual")return "Jack places the receipt beside the budget notebook. Jill agrees to review their options tomorrow. He moves the smiling tomato magnet from the fridge onto the notebook. \u0027New repair supervisor,\u0027 he says. Jill gives him a reluctant laugh: \u0027It has a better attendance record than you.\u0027 Their agreement is real, but it does not erase the earlier hurt.";
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
   const effective=effectiveAuthoredChoice(episode,role,phase-1,selected,reply.body);
   const index=(script.roles[role].options||[]).findIndex(x=>x.id===effective.id);
   const beat=script.coachingCheckpoints?.[role]?.[phase-1]?.options?.find(x=>x.id===effective.id);
   const action=beat?.action||script.roles[role].actions[index]?.[phase-1]||"";
   if(action.length<20)throw new Error("Missing authored consequence.");
   const attitude=classifyAuthoredFollowup(reply.body);
   const name=role==="jack"?"Jack":"Jill";
   const focus=selected.id==="own"?"taking responsibility for a mistake":
    selected.id==="explain"?"explaining the concrete concern":"asking a real question";
   const fallback=attitude==="unsafe"?
    name+" refuses intimidation and says "+focus+" still deserves a respectful conversation.":
    attitude==="resist"?
    (beat?.resisted||name+" stays defensive about "+focus+", and the other person grows more frustrated."):
    attitude==="unclear"?
    name+" admits uncertainty about "+focus+" rather than claiming to understand the advice.":
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
  jackPrompt:phase<4?(script.coachingCheckpoints?.jack?.[phase]?.prompt||script.roles.jack.prompts[phase]):"",
  jillPrompt:phase<4?(script.coachingCheckpoints?.jill?.[phase]?.prompt||script.roles.jill.prompts[phase]):"",
  fictionalSignals};
}


// Sophia 4.1 does not call a story model. It reflects only the outcome already
// committed to the shared record, never either private coach's actual wording.
export function composeAuthored41Closure(episode,sharedScenes=[]){
 const outcome=sharedScenes.find(x=>Number(x.phase_index)===4)?.body||"";
 const ending=sharedScenes.find(x=>Number(x.phase_index)===5)?.body||"";
 const proof=outcome+" "+ending;
 const type=/Jack and Jill agree to keep the box sealed/.test(proof)?"mutual":
  /Jack proposes leaving the box sealed/.test(proof)?"jack_ready":
  /Jill proposes checking options/.test(proof)?"jill_ready":
  /They make some progress explaining/.test(proof)?"partial":
  /Neither accepts the other's proposed next step/.test(proof)?"stalemate":"unknown";
 const descriptions={
  mutual:"Jack and Jill agreed to leave the new microwave sealed and check the available options before deciding. That was a concrete next step, not proof that all their feelings were resolved.",
  jack_ready:"Jack proposed checking the purchase options together, but Jill was not ready to accept the plan. His effort mattered without becoming a joint agreement.",
  jill_ready:"Jill suggested reviewing options for the purchase, but Jack did not commit to doing that with her. Her willingness did not erase his concern.",
  partial:"They made progress in explaining what mattered to each of them, but they still did not agree on the appliance or their next action.",
  stalemate:"Jack kept returning to the savings withdrawal, and Jill kept returning to the delayed repair. No joint next step was accepted. The box stayed sealed because neither opened it—not because they agreed.",
  unknown:"The ending did not establish a jointly accepted plan. A calm description of events is not evidence that both people agreed."
 };
 return "SOPHIA · A CLOSING THOUGHT\n\n"+
  "What happened: "+descriptions[type]+"\n\n"+
  "The research connection: An emotional bid can be an attempt to get a partner's attention or understanding. Responding to the concern behind the words can open a conversation, but listening does not require agreeing. In this story, Jack's worries about shared savings and Jill's frustration about the repair both deserved to be heard. These are fictional choices, not findings about your own marriage.\n\n"+
  "One thing to try: Name one part of a shared decision you could own, then ask what the situation meant to your spouse. Don't require an immediate agreement.\n\n"+
  "This story is fictional and is not a grade on your marriage.";
}
