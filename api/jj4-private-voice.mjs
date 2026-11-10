// Anthos 4.0 — a Jack/Jill check-in is a character's direct private text
// TO their real-world coach, never a narrator's instructions TO Jack or Jill.
// No personal information or cross-coach messages are needed to validate voice.
const SPEAKER=Object.freeze({jack:"Jack",jill:"Jill"});
const RECIPIENT=Object.freeze({jack:"the husband",jill:"the wife"});
export function validatePrivateCheckin(raw,role){
 if(!Object.hasOwn(SPEAKER,role))return false;
 const message=typeof raw==="string"?raw.trim():"";
 if(message.length<38||message.length>1200||!message.includes("?"))return false;
 // A private message must actually be first person, as the fictional character.
 if(!/\b(?:I|I'm|I’m|I've|I’ve|I'd|I’d|me|my|mine)\b/i.test(message))return false;
 const own=SPEAKER[role];
 // The original bug: messages labelled JILL · PRIVATE began 'Jill, consider…'
 // and asked the reader to imagine being Jill, instead of being texted by Jill.
 if(new RegExp("^\\s*(?:(?:hey|hi)\\s+)?"+own+"\\s*[,;:]","i").test(message))return false;
 if(new RegExp("\\b(?:what|how|why|when)\\s+(?:should|would|could|might)\\s+"+own+"\\b","i").test(message))return false;
 if(new RegExp("\\b"+own+"\\s+(?:should|needs|wants|might|could|would|must)\\b","i").test(message))return false;
 if(new RegExp("\\b(?:tell|advise|coach|help)\\s+"+own+"\\b","i").test(message))return false;
 if(/\b(?:your (?:husband|wife)|the (?:husband|wife) should|what (?:would|should) (?:jack|jill) do)\b/i.test(message))return false;
 // Not a canned learning question / stage direction.
 if(/\b(?:relationship objective|phase [1-6]|emotional bid as a concept|research suggests)\b/i.test(message))return false;
 return true;
}
export function fallbackPrivateCheckin(role,checkpoint){
 if(!Object.hasOwn(SPEAKER,role))throw new Error("Invalid coach recipient");
 const purpose=typeof checkpoint?.purpose==="string"?checkpoint.purpose.trim().slice(0,270):"";
 // Preserve the editor's intended dilemma even if a provider returns
 // a wrong-perspective draft. Do not quote or reveal the other coach's text.
 const cue=purpose?(" The part I'm struggling with is this: "+purpose.replace(/[?.!]+$/,"")+"."):"";
 return "I'm not sure what to do after what just happened."+cue+
  " If you were advising me, what would you suggest I actually do next?";
}
export function checkinContract(role){
 if(!Object.hasOwn(SPEAKER,role))throw new Error("Invalid coach recipient");
 return {speaker:SPEAKER[role],recipient:RECIPIENT[role],voice:"first person, direct private text",
  shouldNot:"Address "+SPEAKER[role]+" in second person or write a narrator's coaching exercise."};
}
