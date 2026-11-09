// Anthos Episode Studio: private, admin-only editorial planning. No customer data or SMS.
// Scenario drafts are NOT automatically published to live Jack & Jill rooms.
import {getScenario,persistEpisodeStudio} from "./jj2-library.mjs";

export const SKILLS=Object.freeze([
 {id:"g-bids",researcher:"Gottman",title:"Recognize emotional bids",description:"Notice invitations for attention, comfort or connection."},
 {id:"g-toward",researcher:"Gottman",title:"Turn toward connection",description:"Respond to an emotional bid rather than dismissing it."},
 {id:"g-start",researcher:"Gottman",title:"Use a gentle startup",description:"Raise a concern without blame or criticism."},
 {id:"g-patterns",researcher:"Gottman",title:"Notice destructive conflict patterns",description:"Recognize criticism, contempt, defensiveness or stonewalling."},
 {id:"g-repair",researcher:"Gottman",title:"Make and receive repairs",description:"Attempt reconnection after friction or a mistake."},
 {id:"g-influence",researcher:"Gottman",title:"Accept influence",description:"Seriously consider a partner's perspective."},
 {id:"g-appreciation",researcher:"Gottman",title:"Express appreciation",description:"Name what a partner contributes."},
 {id:"g-world",researcher:"Gottman",title:"Know the partner's inner world",description:"Understand hopes, stressors, values and dreams."},
 {id:"g-meaning",researcher:"Gottman",title:"Create shared meaning",description:"Build common rituals, traditions and goals."},
 {id:"s-self",researcher:"Schnarch",title:"Maintain a solid sense of self",description:"State a true position without demanding agreement."},
 {id:"s-soothe",researcher:"Schnarch",title:"Self-soothe",description:"Manage distress without assigning it all to a partner."},
 {id:"s-react",researcher:"Schnarch",title:"Respond without reactivity",description:"Stay engaged instead of attacking or withdrawing."},
 {id:"s-diff",researcher:"Schnarch",title:"Differentiate without disconnecting",description:"Respect differing needs while remaining connected."},
 {id:"s-honesty",researcher:"Schnarch",title:"Practice honest intimacy",description:"Disclose meaningfully without requiring validation."},
 {id:"s-own",researcher:"Schnarch",title:"Own a contribution to conflict",description:"Notice one's own behavior in a recurring pattern."},
 {id:"s-discomfort",researcher:"Schnarch",title:"Tolerate discomfort for growth",description:"Engage constructively with difficult but safe moments."},
 {id:"s-decisions",researcher:"Schnarch",title:"Face hard decisions",description:"Handle differences that simple compromise cannot erase."},
 {id:"a-new",researcher:"Aron",title:"Try something new together",description:"Share a mutually welcome unfamiliar experience."},
 {id:"a-curiosity",researcher:"Aron",title:"Stay curious about one another",description:"Discover a new side of a familiar partner."},
 {id:"a-challenge",researcher:"Aron",title:"Pursue a shared challenge",description:"Cooperate in a jointly chosen challenge."},
 {id:"a-support",researcher:"Aron",title:"Support individual growth",description:"Encourage a partner's meaningful interests."},
 {id:"a-strengths",researcher:"Aron",title:"Share perspectives and abilities",description:"Learn from each other's strengths."},
 {id:"a-routines",researcher:"Aron",title:"Refresh familiar routines",description:"Introduce meaningful variety together."},
 {id:"a-expansion",researcher:"Aron",title:"Grow through shared experiences",description:"Recognize how shared activities broaden connection."}
]);
export const PHASES=Object.freeze([
 {id:"hook",title:"Hook",hint:"Establish the concrete problem and each character's needs."},
 {id:"conflict",title:"Conflict",hint:"Make differing responses produce visible consequences."},
 {id:"discovery",title:"Discovery",hint:"Let an insight or missed opportunity emerge from the action."},
 {id:"reattempt",title:"Reattempt",hint:"Offer a meaningful opportunity to respond differently."},
 {id:"outcome",title:"Outcome",hint:"Resolve the original problem through earned consequences."},
 {id:"reflection",title:"Reflection",hint:"Offer a voluntary, practical takeaway rather than a test."}
]);
/** Check-ins are editorial possibilities between phases, not scripted SMS or five required gates. */
export const CHECKPOINT_AFTER=Object.freeze(PHASES.slice(0,-1).map(p=>p.id));
export const CHECKPOINT_AUDIENCES=Object.freeze(["none","jack","both","jill"]);
const ALLOWED_AUDIENCES=new Set(CHECKPOINT_AUDIENCES);
const ID_SET=new Set(SKILLS.map(s=>s.id));
const FIELDS={title:120,premise:1700,learningObjective:450,jackMotivation:650,jillMotivation:650,
 boundaries:1100,tone:650,humorNotes:1300,runningGags:1300,researchNotes:1000,
 closureCriteria:900,reflectionPrompt:600,creativeDirection:650};
const bad=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const clean=(v,max)=>typeof v==="string"?v.trim().slice(0,max):"";
export const defaultCheckpoints=()=>CHECKPOINT_AFTER.map(afterPhase=>({
 afterPhase,audience:"none",purpose:"",humorCue:"",waitForReply:false
}));
function normalizeCheckpoints(input,mode,soloCoach="jack"){
 const entries=Array.isArray(input)?input:[];
 return CHECKPOINT_AFTER.map(afterPhase=>{
  const found=entries.find(p=>p&&p.afterPhase===afterPhase)||{};
  let audience=ALLOWED_AUDIENCES.has(found.audience)?found.audience:"none";
  // A solo Deep Dive has one coach; it cannot require two private replies.
  if(mode==="individual"&&audience!==soloCoach)audience="none";
  return {afterPhase,audience,purpose:clean(found.purpose,600),
    humorCue:clean(found.humorCue,700),
    waitForReply:audience!=="none"&&found.waitForReply===true};
 });
}
export function defaultStudio(scenario){
 return {title:scenario.title||"",premise:scenario.opening_scene||"",
  learningObjective:scenario.learning_objective||"",primarySkill:"",soloCoach:"jack",
  supportingSkills:[],jackMotivation:"",jillMotivation:"",boundaries:"",
  tone:"Grounded, warm and playful; let character flaws create the comedy. Avoid cheesy AI jokes.",
  humorNotes:"",runningGags:"",researchNotes:"",closureCriteria:"",
  reflectionPrompt:"",creativeDirection:"",
  phases:Object.fromEntries(PHASES.map(x=>[x.id,""])),
  checkpoints:defaultCheckpoints()};
}
export function normalizeStudio(input,scenario){
 const defaults=defaultStudio(scenario),value=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
 const out={...defaults};
 for(const [field,max] of Object.entries(FIELDS))out[field]=clean(value[field]??defaults[field],max);
 out.primarySkill=ID_SET.has(value.primarySkill)?value.primarySkill:"";
 out.soloCoach=value.soloCoach==="jill"?"jill":"jack";
 out.supportingSkills=Array.isArray(value.supportingSkills)?
  [...new Set(value.supportingSkills.filter(v=>ID_SET.has(v)&&v!==out.primarySkill))].slice(0,2):[];
 out.phases=Object.fromEntries(PHASES.map(p=>[p.id,clean(value.phases?.[p.id],850)]));
 out.checkpoints=normalizeCheckpoints(value.checkpoints,scenario.mode,out.soloCoach);
 return out;
}
export async function readEpisodeStudio(id){
 const scenario=await getScenario(id);
 return {ok:true,scenario:{id:scenario.id,petal_slug:scenario.petal_slug,mode:scenario.mode,
  title:scenario.title,opening_scene:scenario.opening_scene,learning_objective:scenario.learning_objective,
  content_version:scenario.content_version,status:scenario.status,
  episode_saved:!!scenario.episode_studio&&Object.keys(scenario.episode_studio).length>0},
  studio:normalizeStudio(scenario.episode_studio,scenario),skills:SKILLS,phases:PHASES,
  checkpointAudiences:CHECKPOINT_AUDIENCES};
}
export async function saveEpisodeStudio(body){
 const scenario=await getScenario(body?.id);
 const expected=Number(body.content_version);
 if(!Number.isInteger(expected)||expected<1)bad("Reload this scenario before saving.");
 if(!body.studio||typeof body.studio!=="object"||Array.isArray(body.studio))bad("Invalid editor draft.");
 const input=body.studio;
 for(const [field,max] of Object.entries(FIELDS)){
  if(typeof input[field]!=="string"||input[field].length>max)bad("Review the "+field+" field.");
 }
 for(const phase of PHASES){
  if(typeof input.phases?.[phase.id]!=="string"||input.phases[phase.id].length>850)
   bad("Review the "+phase.title+" story phase.");
 }
 if(!Array.isArray(input.checkpoints)||input.checkpoints.length!==5||
    input.checkpoints.some((p,i)=>!p||p.afterPhase!==CHECKPOINT_AFTER[i]||
     !ALLOWED_AUDIENCES.has(p.audience)||typeof p.purpose!=="string"||p.purpose.length>600||
     typeof p.humorCue!=="string"||p.humorCue.length>700||
     typeof p.waitForReply!=="boolean"))
    bad("Review all five optional intervention points.");
 if(!["jack","jill"].includes(input.soloCoach))bad("Select one solo coach role.");
 if(scenario.mode==="individual"&&input.checkpoints.some(p=>p.audience!=="none"&&p.audience!==input.soloCoach))
    bad("Individual episodes can text only their assigned private coach.");
 if(input.primarySkill&&!ID_SET.has(input.primarySkill))bad("Choose a valid primary objective.");
 if(!Array.isArray(input.supportingSkills)||input.supportingSkills.length>2||
  input.supportingSkills.some(s=>!ID_SET.has(s)||s===input.primarySkill))bad("Choose at most two distinct supporting objectives.");
 const studio=normalizeStudio(input,scenario);
 if(studio.title.length<5||studio.premise.length<75||studio.learningObjective.length<12)
  bad("Add a title, a 75-character premise, and a clear relationship objective before saving.");
 const saved=await persistEpisodeStudio(scenario.id,expected,studio);
 return {ok:true,content_version:saved.content_version,studio};
}
const schema={
 type:"object",additionalProperties:false,properties:{
  title:{type:"string"},premise:{type:"string"},learningObjective:{type:"string"},
  primarySkill:{type:"string",enum:SKILLS.map(s=>s.id)},
  soloCoach:{type:"string",enum:["jack","jill"]},
  supportingSkills:{type:"array",items:{type:"string",enum:SKILLS.map(s=>s.id)}},
  jackMotivation:{type:"string"},jillMotivation:{type:"string"},
  boundaries:{type:"string"},tone:{type:"string"},humorNotes:{type:"string"},
  runningGags:{type:"string"},researchNotes:{type:"string"},
  closureCriteria:{type:"string"},reflectionPrompt:{type:"string"},
  creativeDirection:{type:"string"},
  phases:{type:"object",additionalProperties:false,properties:
   Object.fromEntries(PHASES.map(p=>[p.id,{type:"string"}])),
   required:PHASES.map(p=>p.id)},
  checkpoints:{type:"array",items:{type:"object",additionalProperties:false,properties:{
    afterPhase:{type:"string",enum:CHECKPOINT_AFTER},
    audience:{type:"string",enum:CHECKPOINT_AUDIENCES},
    purpose:{type:"string"},humorCue:{type:"string"},waitForReply:{type:"boolean"}
   },required:["afterPhase","audience","purpose","humorCue","waitForReply"]}}
 },required:[...Object.keys(FIELDS),"primarySkill","supportingSkills","phases","checkpoints","soloCoach"]
};
export async function generateEpisodeStudio(body){
 const scenario=await getScenario(body?.id);
 const direction=clean(body?.direction,650);
 const apiKey=process.env.OPENAI_API_KEY?.trim();
 if(!apiKey)bad("OpenAI is not configured for AI drafting.",503);
 const instructions=[
  "You are a meticulous curriculum editor designing one dynamic fictional marriage-enrichment adventure for Anthos.",
  "Return an editable editor draft, NOT SMS messages or a fixed script.",
  "The six phases are internal narrative purposes, not mandatory messages, gates, grades, or a predetermined number of turns.",
  "The five OPTIONAL checkpoint slots occur AFTER the first five phases, before the next phase. Return exactly five checkpoint objects in hook/conflict/discovery/reattempt/outcome order.",
  "For each checkpoint, choose audience none, jack (Jack privately texts the husband), jill (Jill privately texts the wife), or both (two separate private messages). Both never means a shared/group conversation.",
  "A checkpoint is a turning point where advice can meaningfully alter the next scene, not a mechanical phase announcement or a learning quiz.",
  "Choose only about 2–3 real check-ins; set remaining audience to none. Vary recipients when justified (Jack-only, Both, Jill-only are possible). In individual mode, choose a soloCoach and use only that recipient; never choose both or switch to the other coach.",
  "Set waitForReply true only if a character genuinely needs an active decision; false means the director can continue autonomously.",
  "Give every active check-in a brief concrete purpose. The humorCue is optional character-driven situational comedy that might naturally occur between phases, never a fixed SMS punchline.",

  "Give each of Hook, Conflict, Discovery, Reattempt, Outcome, Reflection a concise 1-3 sentence directional summary that a live story director could improvise around.",
  "Use ONE primary relationship skill and at most TWO supporting skills from the provided ID list. Choose pedagogically coherent goals.",
  "Gottman: emotional bids, repair and conflict. Schnarch: differentiation and self-regulation (theoretical framework, not a quantified study). Aron: self-expansion, shared novelty and growth.",
  "Do not fabricate research quotations, citations, scientific effects or diagnoses; do not imply an endorsement or measure a real couple's skill.",
  "Jack and Jill must have independent motives, character agency and consequences that can be funny without humiliating either one.",
  "Suggest subtle situational humor in humorNotes and runningGags, clearly as editable seeds. Humor should primarily be available for scene transitions/check-ins. NEVER stuff a scene with generic one-liners or forced punchlines.",
  "The reattempt must offer real choice, not require one correct response. Final outcome must close the original conflict even if imperfect.",
  "Respect safety, consent, differences and individual privacy. This is education, not therapy.",
  "All string fields should be filled with useful draft copy. Keep fields under 600 chars, premise 100-500 chars, individual phases 90-290 chars, title under 120."
 ].join(" ");
 const input={scenario:{title:scenario.title,petal:scenario.petal_slug,mode:scenario.mode,
   opening:scenario.opening_scene,learningObjective:scenario.learning_objective,research:scenario.research_lenses},
  optionalEditorialDirection:direction,
  validSkills:SKILLS.map(s=>({id:s.id,researcher:s.researcher,title:s.title})),
  sixPhaseDefinitions:PHASES,
  checkpointSequence:CHECKPOINT_AFTER.map((afterPhase,index)=>({
    afterPhase,beforePhase:PHASES[index+1].id,kind:"optional private intervention"}))};
 const model=process.env.ANTHOS_STUDIO_MODEL?.trim()||process.env.OPENAI_MODEL?.trim()||"gpt-4.1-mini";
 let response;try{
  response=await fetch("https://api.openai.com/v1/responses",{
   method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
   body:JSON.stringify({model,store:false,instructions,input:JSON.stringify(input),
    max_output_tokens:5500,text:{format:{type:"json_schema",name:"anthos_episode_studio",strict:true,schema}}}),
   signal:AbortSignal.timeout(55000)});
 }catch{bad("AI drafting timed out or could not connect. Your edits are still here.",502)}
 if(!response.ok)bad("AI drafting provider rejected the request (HTTP "+response.status+").",502);
 const data=await response.json();
 const text=(data.output||[]).flatMap(o=>(o.content||[]).filter(c=>c.type==="output_text").map(c=>c.text)).join("");
 let draft;try{draft=JSON.parse(text)}catch{bad("AI did not return a complete draft. Retry without losing your edits.",502)}
 if(!Array.isArray(draft.checkpoints)||draft.checkpoints.length!==5||
     CHECKPOINT_AFTER.some((p,i)=>draft.checkpoints[i]?.afterPhase!==p))
    bad("AI returned incomplete intervention assignments. Retry.",502);
 const studio=normalizeStudio(draft,scenario);
 if(studio.premise.length<75||studio.learningObjective.length<12||!studio.primarySkill||
    PHASES.some(p=>studio.phases[p.id].length<30))bad("AI returned an incomplete draft. Retry.",502);
 return {ok:true,studio,model:data.model||model,note:"Generated preview only. Review, edit and explicitly save before using."};
}
