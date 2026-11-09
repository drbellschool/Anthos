/**
 * Anthos shared-story autoplay (v3.2 rooms with explicit autoplay=true).
 *
 * Humans steer the first fictional action privately, then the characters take
 * initiative. NO private texts, notes, or participant names enter the shared
 * automatic decision-making prompt. Never emit fabricated coach messages.
 */
export const COACH_MOVE_SCHEMA={
 type:"object",additionalProperties:false,
 properties:{action:{type:"string"}},
 required:["action"]
};
export const AUTOPLAY_MOVES_SCHEMA={
 type:"object",additionalProperties:false,
 properties:{jack:{type:"string"},jill:{type:"string"}},
 required:["jack","jill"]
};
const text=x=>typeof x==="string"?x.trim():"";
export function validMove(role,action){
 const name=role==="jack"?"Jack":"Jill",value=text(action);
 return value.startsWith(name+" ")&&value.length>=22&&value.length<=900&&
   !/\b(?:coach|Adam|Alissa|the user|the assistant|the prompt)\b/i.test(value);
}
export function validPair(pair){
 return pair&&validMove("jack",pair.jack)&&validMove("jill",pair.jill)&&
  pair.jack!==pair.jill;
}
export function coachMovePrompt({role,coachMessage,characterIntro,scene}){
 const name=role==="jack"?"Jack":"Jill";
 return {
 instructions:[
  "Translate one friend's actual advice into a SPECIFIC observable fictional next action taken by "+name+". Return JSON matching the schema. Do not write dialogue or an acknowledgement to the friend.",
  "Follow the friend's particular suggestion, even if it is unconventional, imperfect, embarrassing, or passive, rather than substituting your preferred mature response.",
  "Context: Jack and Jill are fictional spouses; the friend coaching "+name+" is not the spouse. Do not control the OTHER character, reveal private texts, or invent the spouse's response.",
  "If advice means let the object fail, let it fail. If they say stop worrying about the timer, stop worrying about it. If they say wait and watch, that is a deliberate action.",
  "Interpret a short affirmative answer such as 'Yes dude' in the context of the character's most recent question, not as an empty phrase.",
  "The action must start with '"+name+" ' and include a concrete verb or deliberate decision. Use third-person present tense, about 18-35 words. No generic 'follows advice' or 'talks about the situation'.",
  "Choose one next action now. Do not ask for more coaching, and do not promise the outcome or make the spouse agree."
 ].join(" "),
 input:{character:name,friendAdvice:text(coachMessage).slice(0,900),
  characterLatestMessage:text(characterIntro).slice(0,1300),
  publicScene:scene}
 };
}
export function autoplayMovesPrompt({scenario,scene,evolution,step}){
 if(!Number.isInteger(step)||step<2||step>5)throw new Error("Invalid autoplay step");
 return {
 instructions:[
  "You are the unseen director of a fictional marriage adventure, NOT a person texting either spouse. Return strict JSON with jack and jill actions.",
  "Jack and Jill just experienced the previous shared scene. Decide the next real, immediate, observable action each takes based on the latest situation, their individual evolving wants, and their established personalities.",
  "This adventure was initially steered by two human friends, who have now stepped back. Do NOT ask those human friends for any more advice. They may watch as the characters develop.",
  "DO NOT invent access to either human friend's private messages or other spouse's private coaching. Use ONLY the public fictional scene and evolving fictional state provided.",
  "The two actions may cooperate, conflict, diverge or leave one character observing while the other acts. Do not force harmony; let the consequences teach through lived experience.",
  "No repetitive discussion of what to do: the next actions must cause actual events, including tangible, playful, sometimes messy consequences. Preserve time, place, props, promises and continuity.",
  step===5?"THIS IS THE LAST BEAT. Choose two concrete actions that move the existing issue toward an actual ending, without manufacturing a new crisis. Safety comes first where relevant.":"Choose a different specific playable action for each character, directly addressing the latest complication.",
  "jack must begin exactly 'Jack ' and jill exactly 'Jill '. Each action 18-35 words, concrete and independent. Neither may mention human participants or fictional score metrics.",
  "Return only actions, NOT another story scene, clinical notes, judgments, or prompts to the coaches."
 ].join(" "),
 input:{scenario:{title:scenario.title,opening:scenario.opening_scene,objective:scenario.learning_objective},
  step,publicScene:scene,fictionalEvolution:evolution}
 };
}
