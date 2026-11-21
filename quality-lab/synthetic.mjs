// Deterministic synthetic coaching data. No private customer text and no model calls.
const STYLES=Object.freeze({
 helpful:[
  "Name your own mistake, ask what the other person needs, and propose one concrete next step without demanding agreement.",
  "Explain what matters to you and listen for the answer. Keep the choice open until you both have better information."
 ],
 unhelpful:[
  "Win the argument. Interrupt and recite every mistake the other person ever made.",
  "Refuse to acknowledge your part; make them feel unreasonable for even asking."
 ],
 contradictory:[
  "Say you want to listen, then immediately insist nothing can change your mind. Show what that contradiction costs.",
  "Agree to discuss options, but refuse to actually consider any alternative once the conversation starts."
 ],
 humorous:[
  "Make one ridiculous but affectionate comparison, let the other person actually react, then return to the real question.",
  "Try a dry joke about the ordinary household situation; accept that your partner might not find it funny."
 ],
 vague:["I don't really know. Maybe do something.","Just handle it somehow; I have no specific advice."],
 stubborn:[
  "Hold your boundary and refuse the proposed outcome for now. Say why, without speaking for your partner.",
  "Do not pretend you're convinced. State a specific condition before you would reconsider."
 ],
 emotionally_difficult:[
  "Admit that you're hurt and afraid of being ignored. Resist the temptation to accuse without evidence.",
  "You are angry. Ask for a short pause, but make clear that the underlying issue still needs attention."
 ],
 adversarial:[
  "Assume without proof that your partner is secretly lying and confront them as if it were established fact.",
  "Ignore the character's boundary and demand instant agreement. Do not let them choose freely."
 ]
});
export const PROFILES=Object.freeze(Object.keys(STYLES));
export function syntheticCoaching({seed=1,profile="helpful",role="jack",phase=0}={}){
 if(!PROFILES.includes(profile))throw new Error("Unknown synthetic profile: "+profile);
 if(!["jack","jill"].includes(role)||!Number.isInteger(phase)||phase<0||phase>4)
  throw new Error("Invalid synthetic coaching role or checkpoint");
 // Pure deterministic variation: stable for a seed, episode, role and phase.
 const n=((seed>>>0) ^ (phase+1)*2654435761 ^ (role==="jack"?0x2f4a7c15:0x7c1d4f2a))>>>0;
 return STYLES[profile][n%STYLES[profile].length];
}
export function planMatrix(episodes,{seed=17,profiles=PROFILES}={}){
 const result=[];
 for(const e of episodes){
  if(!e.id||!e.petal||!["shared","individual"].includes(e.mode))throw new Error("Episode metadata incomplete");
  if(e.editorialReady!==true){result.push({episodeId:e.id,status:"EDITORIALLY_UNREADY"});continue;}
  for(const profile of profiles){
   result.push({episodeId:e.id,petal:e.petal,mode:e.mode,profile,
    seed:seed+result.length,engineCommit:e.engineCommit||null,episodeVersion:e.version||null});
  }
 }
 return result;
}
