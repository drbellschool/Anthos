/* Anthos Couple Discovery: pure demo logic; no persistence or network calls. */
export const CHOICES = Object.freeze([
  {id:"explore",label:"Exploring somewhere new",detail:"Pick an unfamiliar place to wander and discover together."},
  {id:"quiet",label:"Relaxing together at home",detail:"Leave room for an unhurried, comfortable pause."},
  {id:"talk",label:"Having uninterrupted conversation",detail:"Make space to talk without a crowded agenda."},
  {id:"friends",label:"Spending time with friends",detail:"Choose a lively, welcoming setting; invite others only if both want to."},
  {id:"play",label:"Doing something playful or adventurous",detail:"Take turns choosing a small, spontaneous detour."},
  {id:"create",label:"Creating or working on something together",detail:"Create a small keepsake or shared photograph."}
]);
const byId=new Map(CHOICES.map(c=>[c.id,c]));
export const QUESTION="With a completely free afternoon, what would make it feel like a really good time?";
export function label(id){return byId.get(id)?.label ?? "";}
export function submitAnswer({self,prediction,why="",share=false}){
  if(!byId.has(self)||!byId.has(prediction))throw new Error("Choose two answers.");
  if(share!==true)throw new Error("Choose whether to share before proceeding.");
  if(typeof why!=="string"||why.trim().length>360)throw new Error("Keep the optional explanation under 360 characters.");
  return Object.freeze({self,prediction,why:why.trim(),share:true});
}
export function canReveal(a,b){
  return Boolean(a?.share===true&&b?.share===true&&byId.has(a.self)&&byId.has(b.self)&&byId.has(a.prediction)&&byId.has(b.prediction));
}
export function compare(a,b){
  if(!canReveal(a,b))throw new Error("Both spouses must submit and agree to share first.");
  const aMatches=a.prediction===b.self,bMatches=b.prediction===a.self;
  return {
    firstPredictionMatches:aMatches,
    secondPredictionMatches:bMatches,
    message:aMatches&&bMatches
      ?"You each noticed something meaningful about the other. What makes those experiences special to you?"
      :aMatches||bMatches
        ?"One of your predictions matched. There may still be another side of each other's enjoyment worth discovering."
        :"You surprised each other. Preferences can change with the day; this is an invitation to ask, not a test to pass.",
    followUp:"What is one detail behind your spouse's choice that you'd love to understand better?"
  };
}
// Paraclete receives only the shared, actual choices—not predictions or private chat.
export function planningBrief(a,b){
  if(!canReveal(a,b))throw new Error("No planning handoff before mutual sharing.");
  return Object.freeze({preferences:[a.self,b.self].map(label),source:"mutually shared couple-discovery answers"});
}
export function buildAdventure(a,b){
  const brief=planningBrief(a,b);
  const ids=new Set([a.self,b.self]);
  const newAndPlay=ids.has("explore")&&ids.has("play");
  const title=newAndPlay?"The Place We Haven't Found Yet":ids.has("quiet")&&ids.has("create")?"Make Something, Take It Easy":ids.has("friends")&&ids.has("talk")?"An Afternoon with Room to Connect":"A Little of Both";
  const opening=newAndPlay
    ?"Choose a place neither of you has explored before: perhaps a small downtown, park, or public garden."
    :ids.has("explore")
      ?"Begin somewhere unfamiliar but easy to explore together."
      :ids.has("quiet")
        ?"Start somewhere comfortable, with no reason to hurry."
        :ids.has("friends")
          ?"Choose a welcoming public spot with some life around you, without making plans with anyone else yet."
          :"Choose a simple local destination where you can enjoy the afternoon without a fixed schedule.";
  const middle=[];
  if(ids.has("play"))middle.push("Take turns choosing one playful detour or unexpected little challenge.");
  if(ids.has("create"))middle.push("Make or photograph something small together as a keepsake.");
  if(ids.has("friends"))middle.push("Enjoy the energy of the setting; only invite friends if both of you decide to.");
  if(ids.has("explore")&&!newAndPlay)middle.push("Wander somewhere new, letting curiosity set the pace.");
  if(ids.has("talk"))middle.push("Protect a stretch of uninterrupted conversation with phones tucked away.");
  if(ids.has("quiet"))middle.push("Leave time for a peaceful pause, whether at home or on a comfortable bench.");
  if(!middle.length)middle.push("Choose one small, spontaneous moment neither of you planned.");
  return Object.freeze({
    title,
    introduction:"An unhurried afternoon with a little of what each of you enjoys.",
    steps:[opening,...middle.slice(0,2),"End somewhere comfortable and ask: which moment would you love to do again?"],
    note:"A suggestion, not a reservation. No place, price, time, childcare, transportation or availability has been assumed.",
    brief
  });
}
