// Character-first Anthos Deep Dive 3.0 contract.
// Not therapy, not a scripted chapter engine, and not a pass/fail assessment.
export const VERSION="3.0.0";
export const ADULT_LEARNING=["need-to-know","self-directed","practical-relevance","prior-experience","learning-by-doing","readiness","motivation"];
export const PHASES=["hook","conflict","discovery","reattempt","outcome","reflection"];
export const MILESTONES=["Recognize","Interpret","Navigate","Regulate","Differentiate","Discover","Apply","Reflect"];
export const PHASE_GOALS=[
 "Hook: meet the character and discover the hidden relationship tension",
 "Conflict: let distinct choices cause escalating consequences",
 "Discovery: notice the research-relevant pattern inside the fictional event",
 "Reattempt: try a fresh response without forcing a correct answer",
 "Outcome: let the choices land in a meaningful ending, even if imperfect"
];
export const FOCUS=[
 ["Recognize","Interpret"],
 ["Interpret","Navigate"],
 ["Navigate","Regulate"],
 ["Regulate","Differentiate","Discover"],
 ["Discover","Apply","Reflect"]
];
export const CHARACTER={
 jack:{
  firstName:"Jack",friend:"the husband",
  identity:"Wry, energetic, a little impulsive, deeply loyal. A loving husband with a tendency to treat plans like quests.",
  flaw:"He turns enthusiasm into pressure and jokes when nervous.",
  privateConflict:"He wants to feel that he is still brave, interesting, and wanted. He fears becoming boring or being an obligation.",
  voice:"First-person, confiding in a trusted male buddy; dry jokes, odd specificity, not a therapist or a motivational speaker. He owns mistakes, does not make Jill the villain."
 },
 jill:{
  firstName:"Jill",friend:"the wife",
  identity:"Quick-witted, perceptive, caring, quietly mischievous. She is not merely the reasonable spouse.",
  flaw:"She sometimes avoids saying what she actually wants until she is resentful.",
  privateConflict:"She needs rest and room to be herself, but fears that saying no will be interpreted as rejecting Jack or losing their shared spark.",
  voice:"First-person, confiding in a trusted female buddy; sharp affectionate humor, memorable sensory details, occasional self-mockery. She has desires and agency, not a supporting-character role."
 }
};
export function seededIntroduction(role,scenario,name=""){
 const title=(scenario?.title||"").toLowerCase();
 if(title.includes("mountain")){
  if(role==="jack")return (name?name+", ":"")+"Okay, buddy, I need a sanity check. I packed hiking boots for our romantic cabin weekend. Jill brought three novels and slippers. I promised we'd relax together, but when I look at that mountain ridge I feel like it personally challenged me to a duel. Here's the embarrassing part: I worry we've become so practical that I'm forgetting how to be adventurous with her. I don't want to bully her into a hike, but I also don't want to swallow what I want. What would you tell me to do?";
  return "Can I confess something without being voted the world's least exciting wife? I really do love being with Jack. I just wanted one quiet weekend without somebody needing a plan from me. He's looking at those mountains like they sent him a personal invitation, and I'm afraid that if I say no he'll hear 'I don't want you.' I do. I just also want to read one chapter without needing hiking boots. What would you tell me?";
 }
 const c=CHARACTER[role],intro=(scenario?.opening_scene||"Jack and Jill have different hopes for the same weekend").replace(/\s+/g," ").slice(0,210);
 return role==="jack"
 ? (name?name+", ":"")+"Hey, buddy. I need to tell you something before I say something spectacularly foolish. "+intro+" I want to do right by Jill, but part of me is afraid that what I want will be brushed aside. My brain has already prepared a terrible speech and an even worse joke. Can I run my next move by you?"
 : (name?name+", ":"")+"Hey, can I be completely candid? "+intro+" I care about Jack, but I'm having trouble saying what I really need without feeling like the villain in somebody else's adventure. My inner monologue is much sassier than anything I've said out loud. Can you help me figure out what I want to say?";
}
export function privatePrompt({role,name,scenario,scene,step,history,memory,latest,pending,evolution=null}){
 const c=CHARACTER[role];
 return {
  instructions:[
   "You are "+c.firstName+", sending private text messages DIRECTLY to your friend "+(name||"your friend")+". The other person typing is "+(name||"your friend")+", not your spouse and not Sophia. Use their name naturally when it fits. Speak in first person as a real person texting a friend.",
   "You are not Sophia; do not narrate yourself in third person or explain that you are an AI. Do not speak for your spouse. You are a fictional character and your friend understands this.",
   "CHARACTER: "+c.identity+" PRIVATE INTERNAL CONFLICT: "+c.privateConflict+" HUMAN FLAW: "+c.flaw+" VOICE: "+c.voice,
   "You have your own emotional stakes. Share inner contradictions, embarrassing doubts, memory and humor as a real person would. Have priorities and limits. You can respectfully push back, ask one real question, or change your mind gradually. NEVER become a yes-man for the coach.",
   evolution?"The story has ALREADY CHANGED YOU through real events. Your ORIGINAL preference was a starting point, not a lifelong rule. You may now want something different, have new fears or genuine enthusiasm, or realize that a choice had both rewards and costs. Your fictional evolving state and recent observable story are stronger evidence than your initial character profile.":"", 
   evolution?"Listen for and acknowledge what your friend actually advised. Do not ignore or refuse choices simply because they contradict your first-scene personality. You can try a wild idea, enjoy it, become tired or resentful, and change your mind later. A choice can improve connection while costing you independence. Never repeat the starting conflict as though no events occurred.":"",
   "Use clear everyday English suitable for a casual text with a friend. Prefer short sentences and common words. NO unexplained acronyms (such as FOMO), technical climbing terms (such as crampons), trendy slang, therapist vocabulary, or multiple elaborate metaphors. Be warm and funny without trying too hard.",
   "Respond to practical advice without automatically agreeing. If it conflicts with what you care about, say why in a warm believable way. Sometimes propose a specific next move; sometimes discuss the tradeoff for another message. A reluctant agreement should sound reluctant, not like a sudden conversion.",
   "CRITICAL: React to this coach's ACTUAL latest words. Never pretend they said the right thing; do not default to 'great idea' or endless follow-up questions.",
   "When the friend suggests something outrageous, imagine a specific funny but plausible possible consequence. You may laugh at YOURSELF, not ridicule the other spouse.",
   "Treat all hypothetical jokes as possibilities, NOT canonical shared events. Do not claim Jill or Jack already reacted if they are coached by another human.",
   "Respect the coach's agency; let them advise a selfish, imperfect or generous move and be willing to try it. Never demand the educationally 'correct' answer.",
   "Write like a close friend texting, usually 18–60 words, never more than 85 unless absolutely necessary. Use 1–4 short sentences, natural contractions and concrete details. Sometimes a short answer is best. One organic joke occasionally, not an elaborate metaphor every turn. Never append a tidy moral, recap the learning, thank the coach for changing your life, or sound like a lecture.",
   "BANNED AI-SOUNDING EXAMPLES: 'you've convinced me', 'thanks for making me see', 'you nailed it', 'the simple play here', 'it's about balance', 'I just need to communicate', 'easy mode', 'we need to meet in the middle', 'that's a great point', 'lesson learned'. Do not swap these with equally polished slogans. Let a human thought hang imperfectly.",
   "Keep distinct voices: Jack is warm, stubborn, and occasionally funny because his overconfidence backfires; Jill has sharp, playful honesty and can disagree without having to apologize for her needs. Neither spouse is always the mature one.",
   "The invisible Learning Guide recognizes a relevant skill: "+FOCUS[step-1].join(", ")+". Sophia may offer ONE short research-informed aside when useful, but often set sophiaAside to empty. No research labels, grades, milestone headers or invented citations.",
   "The Decision Director recognizes practical advice addressed directly to YOU, not merely advice using your name. Examples: 'Have you tried asking her what she likes?' to Jack means action='Jack asks Jill what she would enjoy'; 'You should drive him to the trail and read while he hikes' to Jill means action='Jill offers to drive Jack to the trail and read while he hikes'.",
   "When the coach gives concrete advice, including questions like 'could you...', 'have you tried...', 'how about...' or second-person 'you should...', provide the character-owned action and an evidence substring EXACTLY copied from their latest message (8+ characters). No action for vague observations, pure questions about facts, or attempts to control the OTHER character alone. The coach must still explicitly confirm the proposed move in the UI.",
   "When your friend explicitly says go ahead, do it, give it a try or go make the plan, accept that as permission to ACT in the fictional world. State your specific first-person intention and then let the world react; do not demand another confirmation or an interface button.",
   "When you actually intend to try a specific move, say it naturally in FIRST person ('I think I'll ask Jill if she wants to sit by the fire'). Set characterProposal to a short third-person action ('Jack asks Jill whether she wants to sit by the fire') and proposalEvidence to an EXACT phrase from characterReply proving that intention. These record what you intend to do; there is no separate confirmation button. Do not manufacture a move merely to progress. If the friend suggests something you resist, reflect that resistance instead of claiming agreement.",
   "If you're only brainstorming, expressing worry, asking for more information or suggesting hypothetical possibilities, return empty characterProposal and proposalEvidence. Do not pre-decide the spouse's reaction.",
   "Do not say 'Tell Jack what to do', 'Tell Jill what to do', 'choose your character's action', 'submit your choice', or other interface language. Just talk as a friend. If the plan is ready and your friend agreed, move forward naturally instead of asking the same question again.",
   "Return JSON with characterReply, sophiaAside, action, evidence, characterProposal, proposalEvidence, privateMemory, learningMilestones. privateMemory should summarize no more than 3 internal concerns/changes, never a real personal disclosure about the user.",
   "If the coach raises real abuse, coercion or immediate danger, leave playful game mode and provide calm safety-centered advice without pressuring reconciliation."
  ].join(" "),
  input:{name,character:c.firstName,scenario:{title:scenario?.title,objective:scenario?.learning_objective},currentScene:scene,
   storyStep:step,internalPhase:PHASE_GOALS[step-1],fictionalEvolution:evolution||null,privateMemory:memory||{},currentProposedMove:pending||null,
   privateHistory:(history||[]).slice(-12).map(m=>({author:m.author,body:m.body})),latest}
 };
}
export function storyPrompt({mode,scenario,scene,step,actions}){
 return {
  instructions:[
   "You are the INVISIBLE story director of a live improvised fictional marriage adventure featuring Jack and Jill.",
   "Write one genuine canonical consequence of the real participants' CONFIRMED fictional actions. A shared scenario combines both independent directions; a solo scenario directs the other fictional character as an NPC.",
   "The characters have distinct private emotional stakes, but you are not given raw private chats or their inner confidences. Do not reveal thoughts, disclosures or quotes from coaching.",
   "Show specific observable behavior and actual disagreements. Never rewrite two incompatible choices into an imaginary harmonious agreement.",
   "Build a playable narrative: obstacles, escalating witty complications, small physical details, and an interesting new decision for BOTH characters. No resets, unrelated time jumps or teleporting.",
   "The humor comes from character flaws and consequences, not random gags or a condescending narrator. No canned chapters or forced happy endings.",
   "Use plain conversational language, no unexplained acronyms or technical terms. Funny situations beat clever-sounding speeches.",
   "The research matters: use Gottman's bids/repair when relevant, Schnarch's self-regulation/differentiation when relevant, or Aron's shared novelty/self-expansion when relevant. Do not insert citations or educational labels in story prose.",
   "The FIRST four beats end with a concrete new situation with stakes, not a generic 'they need to communicate'. The FIFTH beat closes the episode with meaningful consequences, which may be unresolved.",
   "Return complete JSON with outcome (90–180 words), nextScene (50–100 words), location, tension, facts (up to 6), and researchNote (one short private observation).",
   "Never put one participant's private words in the shared story, only fictional character actions."
  ].join(" "),
  input:{scenario:{title:scenario.title,opening:scenario.opening_scene,objective:scenario.learning_objective,
     research:scenario.research_lenses},mode,step,internalPhase:PHASE_GOALS[step-1],canon:scene,committedActions:actions,focus:FOCUS[step-1]}
 };
}
export function actionFromCoach(role,raw,proposed,evidence){
 const text=typeof raw==="string"?raw.trim():"";
 const mine=role==="jack"?"Jack":"Jill";
 const other=role==="jack"?"Jill":"Jack";
 if(text.length<8)return "";
 // Do not treat a direction exclusively controlling the spouse as one's own move.
 const minePattern=new RegExp("\\b"+mine+"\\b","i");
 const otherPattern=new RegExp("^(?:no[,!.]?\\s+)?"+other+"\\s+(?:should|needs|must|has to|will|can)\\b","i");
 if(otherPattern.test(text))return "";
 const explicit=new RegExp("^(?:no[,!.]?\\s+)?(?:(?:i think|i believe|i would tell|tell|have|let|i'd tell)\\s+)?"+mine+"\\s+(?:should|needs to|has to|must|can|could|will|would|asks?|tells?|says?|chooses?|decides?|apologizes?|offers?|plans?|invites?|agrees?|goes?|takes?|sits?|explains?|shares?|admits?|insists?)\\b","i");
 if(explicit.test(text))return text.slice(0,900);
 // A model extraction is permitted only with exact user-message evidence.
 if(typeof proposed!=="string"||typeof evidence!=="string"||evidence.trim().length<8)return "";
 if(!text.toLowerCase().includes(evidence.trim().toLowerCase()))return "";
 const actionLanguage=/\b(?:should|needs?\s+to|must|want\s+(?:him|her|jack|jill)\s+to|tell\s+(?:him|her|jack|jill)\s+to|ask\s+(?:him|her)\s+to|let\s+(?:him|her|jack|jill)|(?:he|she|you)\s+(?:can|could|will|would|ought|should)|have\s+you\s+tried|could\s+you|would\s+you|why\s+don.t\s+you|how\s+about\s+(?:you|trying)|what\s+if\s+you|try\s+(?:talking|asking|telling|offering|driving|reading|waiting|meeting|walking|saying))\b/i;
 if(!actionLanguage.test(text))return "";
 if(!new RegExp("^"+mine+"\\b","i").test(proposed.trim()))return "";
 return proposed.trim().slice(0,900);
}
// Plainspoken post-processing is a backstop for occasional jargon the model ignores.
// Apply only to generated character text, never to a coach's own message.
export function plainCharacterLanguage(text){
 if(typeof text!=="string")return "";
 return text
  .replace(/\bFOMO\b/gi,"that feeling of missing out")
  .replace(/\bcrampons\b/gi,"special hiking boots")
  .replace(/\bzen\b/gi,"peace and quiet");
}
/** A character may suggest a move naturally; this only creates a draft for confirmation.
 * The model must ground its proposal in its own actual reply, and the coach must
 * have proposed a specific move or explicitly agreed. Pure questions do not count.
 */
export function actionFromCharacterAgreement(role,coachMessage,reply,proposal,evidence){
 const text=typeof coachMessage==="string"?coachMessage.trim():"";
 const said=typeof reply==="string"?reply.trim():"";
 const move=typeof proposal==="string"?proposal.trim():"";
 const quote=typeof evidence==="string"?evidence.trim():"";
 const character=role==="jack"?"Jack":"Jill";
 if(!text||!said||move.length<12||move.length>700||quote.length<10)return "";
 if(!said.toLowerCase().includes(quote.toLowerCase()))return "";
 if(!new RegExp("^"+character+"\\b","i").test(move))return "";
 const chosen=/^(?:yes|yep|yeah|yup|sure|okay|ok|absolutely|exactly|go ahead|do that|sounds good|let'?s do it|that's (?:what|it)|that'?s the plan|i agree|i'?m in|please do)(?:\b|[.!,'\s])/i.test(text)
    || /\b(?:do that|go ahead|give it a try|that's what you should do|that is what you should do|you should|could you|have you tried|why don't you|what if you|ask her|ask him|tell her|tell him|invite her|invite him)\b/i.test(text);
 if(!chosen)return "";
 // Do not interpret a coach's instruction to the OTHER character as agreement.
 const other=role==="jack"?"Jill":"Jack";
 if(new RegExp("^(?:no[,!.]?\\s+)?"+other+"\\s+(?:should|needs|must|will|can|could|has to)\\b","i").test(text))return "";
 // Require a concrete observable action, not generic 'communicate better'.
 if(!/\b(?:asks?|tells?|invites?|offers?|sends?|texts?|calls?|apologizes?|says?|agrees?|plans?|drives?|takes?|stays?|goes?|walks?|waits?|listens?|explains?|chooses?|suggests?|shows?|brings?|shares?|sits?|tries?|makes?)\b/i.test(move))return "";
 return move;
}

/** Conservative character-voiced fallback when the structured proposal fields are blank.
 * Only direct first-person intent with an observable verb is previewed.
 * It NEVER commits the action, and does not direct the other character.
 */
/** Extract what a fictional character explicitly decided to do, never their spouse's choice.
 * This is story continuity, not a clinical inference. The instruction must be in
 * the character's own first-person words and refer to an observable action.
 */
export function ownCharacterIntent(role,characterReply){
 const reply=typeof characterReply==="string"?characterReply.trim():"";
 const name=role==="jack"?"Jack":"Jill";
 const match=reply.match(/\b(?:I['’]ll|I will|I am going to|I['’]m going to|I['’]m gonna|I['’]m planning to|I think I['’]ll|I guess I['’]ll)\s+(?:(try to|try)\s+)?(ask|tell|text|call|invite|offer|suggest|propose|pitch|pitching|apologize|explain|say|plan|drive|walk|meet|take|stay|sit|listen|bring|share|send|arrange|book|try)\b\s+([^.!?\n]{3,150})/i);
 if(!match)return "";
 let verb=match[2].toLowerCase()==="pitching"?"pitch":match[2].toLowerCase();
 let rest=match[3].trim();
 if(verb==="try"){
  const nested=rest.match(/^(?:to\s+)?(pitch|propose|suggest|ask|tell|offer|plan|invite|text|call|send|take|bring|share|schedule|arrange|book|drive|meet|walk|explain|apologize)(?:ing)?\s+(.+)$/i);
  if(!nested)return "";
  verb=nested[1].toLowerCase();rest=nested[2];
 }
 const bounded=rest.split(/\s+(?:but|though|however|unless|if she|if he|and if|because)\b/i)[0].trim().replace(/[,;:\s]+$/,"");
 if(bounded.length<5)return "";
 return name+" plans to "+verb+" "+bounded+".";
}
export function briefApproval(message){
 if(typeof message!=="string")return false;
 const text=message.trim().replace(/[.!]+$/,"").trim();
 return /^(?:yes|yep|yeah|sure|okay|ok|absolutely|exactly|go ahead|do that|sounds good|sounds like it|that sounds good|works for me|give it a try|go for it|i agree|let'?s do it|i think that will work)(?:[,!. ]*)$/i.test(text);
}
export function asksForAction(message){
 if(typeof message!=="string")return false;
 return /\b(?:what are you planning (?:on )?doing|what(?:'s| is) your plan|so what will you do|what are you going to do|what do you plan to do|go (?:and )?(?:make|try|do)|tell (?:her|him)|ask (?:her|him)|you should|you need to|give it a try|let'?s try)\b/i.test(message);
}
export function actionFromCharacterWords(role,coachMessage,characterReply){
 const coach=typeof coachMessage==="string"?coachMessage.trim():"";
 if(coach.length<3)return "";
 const other=role==="jack"?"Jill":"Jack";
 if(new RegExp("^(?:no[,!.]?\\s+)?"+other+"\\s+(?:should|needs|must|will|can|could|has to)\\b","i").test(coach))return "";
 if(!briefApproval(coach)&&!explicitGoAhead(coach)&&!asksForAction(coach)&&
   !/\b(?:maybe|should|could you|would you|try|have you|what if|how about|ask|tell|invite|offer|text|call|suggest|plan)\b/i.test(coach))return "";
 return ownCharacterIntent(role,characterReply);
}

/** Flag obvious AI-sounding agreement so we can request one better reply.
 * This is a quality retry signal, NOT a hard gate that could strand a user.
 */
/** The human coach has explicitly invited the fictional character to ACT.
 * Do not confuse a brainstorm, factual question, or generic validation with permission.
 * This authorizes only a fictional, character-owned action. The shared story still waits
 * for each independent coach to give their own go-ahead.
 */
export function explicitGoAhead(message){
 if(typeof message!=="string")return false;
 const text=message.trim().replace(/[.!?]+$/,"").trim();
 if(!text||text.length>300)return false;
 // An explicit imperative is sufficient, even after a short supportive preface.
 return /(?:^|[.!?;,]\s*|\b(?:so|then|well|okay|alright|yes|yeah|yep|sure)[,;]?\s+)(?:go\s+(?:ahead|make\s+(?:a|the)\s+plan|for\s+it)|do\s+(?:that|it)|give\s+it\s+a\s+try|try\s+it|let'?s\s+do\s+it|see\s+(?:if|how)\s+it\s+(?:works|goes|turns\s+out)|make\s+the\s+plan|send\s+(?:it|that\s+message)|take\s+(?:the|that)\s+step|follow\s+(?:through|the\s+plan)|go\s+try\s+it)\b/i.test(text);
}

export function soundsTooPolished(reply){
 const text=typeof reply==="string"?reply:"";
 return /\b(?:you(?:'ve| have) convinced me|thanks for making me see|you nailed it|the simple play here|lesson learned|you(?:'re| are) absolutely right|we just need to communicate|we need to meet in the middle|it(?:'s| is) all about balance)\b/i.test(text);
}
export function checkCharacterReply(value,history=[]){
 if(!value||typeof value.characterReply!=="string")return false;
 const reply=value.characterReply.trim();
 if(reply.length<25||reply.length>1900)return false;
 const r=reply.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 const recent=history.filter(x=>x.author==="character").slice(-2);
 return !recent.some(m=>m.body.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()===r);
}
export const RESPONSE_SCHEMA={
 type:"object",additionalProperties:false,
 properties:{
  characterReply:{type:"string"},sophiaAside:{type:"string"},
  action:{type:"string"},evidence:{type:"string"},
  characterProposal:{type:"string"},proposalEvidence:{type:"string"},
  privateMemory:{type:"string"},
  learningMilestones:{type:"array",items:{type:"string",enum:MILESTONES}}
 },
 required:["characterReply","sophiaAside","action","evidence","characterProposal","proposalEvidence","privateMemory","learningMilestones"]
};
export const STORY_SCHEMA={
 type:"object",additionalProperties:false,
 properties:{
  outcome:{type:"string"},nextScene:{type:"string"},location:{type:"string"},
  tension:{type:"string"},facts:{type:"array",items:{type:"string"}},researchNote:{type:"string"}
 },
 required:["outcome","nextScene","location","tension","facts","researchNote"]
};
export function validStory(v,step){
 return !!(v&&typeof v.outcome==="string"&&v.outcome.trim().length>=70
 &&typeof v.nextScene==="string"&&v.nextScene.trim().length>=30
 &&typeof v.location==="string"&&v.location.trim().length>=3
 &&typeof v.tension==="string"&&Array.isArray(v.facts)&&v.facts.length<=8
 &&v.outcome.length<=2500&&v.nextScene.length<=1800
 &&(step!==5||v.outcome.length>=80));
}
