// Each 4.3 episode must offer meaningful opportunities for its selected
// learning objectives. Opportunities are NOT competence ratings or outcomes.
// The microwave pilot keeps its three focus skills separate from any incidental
// observation in the 27-skill Anthos codebook.
export const MICROWAVE_FOCUS=Object.freeze(["s-decisions","g-start","g-influence"]);
export const MICROWAVE_DAILY_OPPORTUNITIES=Object.freeze([
 {day:0,skills:["s-decisions"],promptCue:"What is the actual decision, and who is affected by it?"},
 {day:1,skills:["g-start"],promptCue:"How do I bring up the problem without blaming my spouse?"},
 {day:2,skills:["g-influence"],promptCue:"How could I hear the other concern without giving up my own need?"},
 {day:3,skills:["g-start","g-influence"],promptCue:"How do I respond constructively under frustration?"},
 {day:4,skills:["s-decisions","g-influence"],promptCue:"What choice can we make together with what we actually know?"}
]);
export function selectedFocus(primary,support=[]){
 const skills=[primary,...support].filter(x=>typeof x==="string"&&x);
 if(new Set(skills).size!==skills.length||skills.length<1||skills.length>3)
  throw Error("Expected one primary and up to two different supporting skills.");
 return skills;
}
export function weeklyOpportunity(day,selected=MICROWAVE_FOCUS){
 if(!Number.isInteger(day)||day<0||day>4)throw Error("Invalid episode day.");
 const d=MICROWAVE_DAILY_OPPORTUNITIES[day];
 return {day,skills:d.skills.filter(x=>selected.includes(x)),promptCue:d.promptCue};
}
export function missingWeeklyOpportunities(events=[],selected=MICROWAVE_FOCUS){
 const seen=new Set(events.flatMap(x=>Array.isArray(x?.opportunitySkills)?x.opportunitySkills:
  Array.isArray(x?.skills)?x.skills:[]));
 return selected.filter(id=>!seen.has(id));
}
export function coverageReport(events=[],selected=MICROWAVE_FOCUS){
 const seen=selected.filter(x=>!missingWeeklyOpportunities(events,selected).includes(x));
 return {required:selected,offered:seen,missing:selected.filter(x=>!seen.includes(x)),
  complete:seen.length===selected.length};
}
