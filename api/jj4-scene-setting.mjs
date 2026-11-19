// The authored location is the Hook's starting position, not an instruction
// to reset characters there on each of six subsequent scenes.
const place=x=>{
 const value=String(x?.place||"").replace(/[^\p{L}\p{N} -]/gu,"").trim().slice(0,55);
 return value&&value!=="unknown"?value:"unconfirmed";
};
export function sceneSettingForPhase(episode={},phaseIndex=0,sharedHistory=[],simulationBefore=null){
 const authored=String(episode.sceneSetting||"");
 if(phaseIndex<=0||!Array.isArray(sharedHistory)||!sharedHistory.length)return authored;
 const current=simulationBefore?.actorLocations||null;
 const state=current?
  "Last committed character locations: Jack = "+place(current.jack)+
  "; Jill = "+place(current.jill)+". Do not move either character without narrated travel. ":
  "Track each character's position from the last committed scene; do not invent a return home. ";
 return "CONTINUATION LOCATION ONLY. The authored opening location has already been used; " +
  "do not restart the Hook or place characters back there by default. " +
  "Preserve the final physical positions, decisions and chronological time of the last shared scene. " +
  state+
  "Time may advance only with a clear transition. No second first departure, new first agreement, " +
  "or repeated promised message. The new scene must contain a genuinely new choice or consequence.";
}
