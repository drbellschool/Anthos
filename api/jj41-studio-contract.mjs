// Validates the saved Episode Studio contract before an authored JJ4.1 room is
// created. This is a guard on the existing story engine, not a second engine.
const PHASES=["hook","conflict","discovery","reattempt","outcome","reflection"];
const ROLE_ORDER=["jack","jill","jack","jill","none"];
const CORE_SKILLS=["s-decisions","g-start","g-influence"];
const namedRoles=new Set(["jack","jill","both","none"]);
const reason=(message)=>{throw new Error("4.1 Episode Studio contract: "+message)};
export function studioContractFor41(episode,script){
 const sourcePresent=typeof episode?.premise==="string"&&episode.premise.trim().length>75&&
  typeof episode?.learningObjective==="string"&&episode.learningObjective.trim().length>12&&
  typeof episode?.primarySkill==="string"&&
  episode.phases&&typeof episode.phases==="object"&&Array.isArray(episode.checkpoints);
 if(!sourcePresent)return null; // Legacy test fixtures and previously created rooms.
 for(const p of PHASES){
  if(String(episode.phases[p]||"").trim().length<30)reason("missing "+p+" phase direction");
 }
 const checkpoints=episode.checkpoints.map(x=>({...x}));
 if(checkpoints.length!==5||checkpoints.some((x,i)=>x.afterPhase!==PHASES[i]||
    !namedRoles.has(x.audience)))reason("invalid ordered checkpoint audiences");
 if(script.template==="microwave-authored-1"){
  if(episode.primarySkill!==CORE_SKILLS[0]||
    !CORE_SKILLS.slice(1).every(x=>episode.supportingSkills?.includes(x))||
    (episode.supportingSkills||[]).length!==2)
    reason("microwave requires saved skills s-decisions, g-start, g-influence");
  const p=episode.premise;
  if(!/Thursday at 7:15 p\.m\./i.test(p)||!/\$400/.test(p)||
    !/over-the-range microwave/i.test(p)||!/three weeks/i.test(p)||
    !/I'LL FIX IT SATURDAY/i.test(p)||!/Jill/.test(p)||
    !/emergency savings/i.test(p))
    reason("authored story facts disagree with the saved problem statement");
  if(checkpoints.some((x,i)=>x.audience!==ROLE_ORDER[i]||
    x.waitForReply!==(i<4)))
    reason("microwave must use the saved Jack/Jill/Jack/Jill checkpoint sequence");
 }
 return {
  problemStatement:episode.premise,
  learningObjective:episode.learningObjective,
  primarySkill:episode.primarySkill,
  supportingSkills:[...(episode.supportingSkills||[])],
  jackMotivation:episode.jackMotivation||"",
  jillMotivation:episode.jillMotivation||"",
  phaseDirections:Object.fromEntries(PHASES.map(x=>[x,episode.phases[x]])),
  checkpoints,
  skillChallenges:Object.fromEntries(PHASES.map((phase,i)=>[phase,{
   primary:episode.primarySkill,
   supporting:i===0||i===1?[...(episode.supportingSkills||[]).filter(x=>x==="g-start")]:
    i>=2?[...(episode.supportingSkills||[]).filter(x=>x==="g-influence")]:[],
   coach:checkpoints[i]?.audience||"none",
   evidenceRequired:i===0?"Conflicting needs established without instant resolution":
    i===1?"Jack's first real statement and Jill's independent reaction":
    i===2?"Jill's accountable position and Jack's response":
    i===3?"Jack changes or refuses an action based on Jill's position":
    i===4?"Jill makes an observable choice and Jack reacts, without a forced agreement":
    "One new earned aftereffect, no new negotiation"
  }]))
 };
}
export function activeAuthoredCoaches(episode,phase){
 const audience=episode?.authored41?.studioContract?.checkpoints?.[phase]?.audience;
 if(audience==="jack"||audience==="jill")return [audience];
 if(audience==="none")return [];
 return ["jack","jill"];
}
export function checkAuthoredStudioScene(episode,phase,text){
 const contract=episode?.authored41?.studioContract;
 if(!contract)return;
 const scene=String(text||"");
 const count=scene.trim().split(/\s+/).length;
 if(count<55||count>110)
  reason("scene "+(phase+1)+" has "+count+" words, expected SMS-sized dialogue");
 if(episode?.authored41?.template==="microwave-authored-1"){
  if(phase===0&&(!/Thursday at 7:15/i.test(scene)||!/cracked phone/i.test(scene)||
    !/\$400/.test(scene)||!/SATURDAY/.test(scene)))
    reason("microwave hook has drifted from its saved problem statement");
  if(/(?:six ten|six fifteen|six twenty|tomato magnet)/i.test(scene))
    reason("microwave scene contradicts saved time or physical object");
  if(/(?:the store confirmed|refund (?:was|is) guaranteed|the technician fixed|microwave was repaired)/i.test(scene))
    reason("fiction invented external repair or refund confirmations");
  if(phase===1&&(!/Jack/.test(scene)||!/Jill/.test(scene)||!/savings/i.test(scene)))
    reason("Jack's conflict did not cover the actual shared financial decision");
  if(phase===2&&(!/Jill/.test(scene)||!/Jack/.test(scene)||!/Saturday|repair/i.test(scene)))
    reason("Jill's discovery did not confront the delayed repairs");
  if(phase===3&&(!/Jack/.test(scene)||!/Jill/.test(scene)||!/repair|savings|decision/i.test(scene)))
    reason("Jack's reattempt did not engage the original hard decision");
  if(phase===4&&!/Jill/.test(scene))reason("Jill must own the final action");
 }
}
