// Protected, bounded real-provider QA. No SMS, Supabase or customer records.
// Temporary fixed-input QA, accessible only via the deployment-specific
// Vercel URL behind the project's authentication, NEVER on the public alias.
// No arbitrary prompt input, database writes, SMS or credentials returned.
import {randomUUID} from "node:crypto";
import {buildConversation43,renderConversation42,prepareOpenTurn43,sophiaConversation42} from "./jj42-conversations.mjs";
import {roomAtlas43,slimAtlasContext} from "./atlas-runtime.mjs";
import {episode} from "../tests/fixtures/jj43-what-makes-us-feel-close.mjs";
import {scenarioGraph} from "../tests/fixtures/jj43-what-makes-us-feel-close-graph.mjs";
export const config={maxDuration:300};
const advice=[
 ["I'd try just sitting down and asking her directly instead of theorizing false realities.",
  "Explain why the quiet time matters to you. Thank him for trying to make the day special."],
 ["Suggest sitting together for an hour first, and keep dinner an option instead of insisting on it.",
  "Say yes to the porch time if that is what you want, without committing to the whole itinerary."],
 ["Tell her she's ungrateful. You put in a lot of work.",
  "Find out what makes the outing meaningful to him. You don't have to guess."],
 ["If she has agreed to the porch time, talk about doing that before deciding on dinner.",
  "Recognize the effort he put in. Your preference doesn't mean his is worthless."],
 ["How do you feel about what has happened so far? You don't have to settle the rest of the weekend right now.",
  "Invite him to sit together at a specific time; don't assume the rest of Saturday is decided."]
];
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
export default {async fetch(request){
 const host=new URL(request.url).hostname;
 const protectedDeployment=process.env.VERCEL_ENV==="production"&&
  !!process.env.VERCEL_URL&&host===process.env.VERCEL_URL&&host.endsWith(".vercel.app");
 if(request.method!=="GET"||!protectedDeployment||!process.env.OPENAI_API_KEY||
  Date.now()>Date.parse("2026-11-24T04:00:00Z"))return json({error:"disabled"},404);
 const ep=buildConversation43({...episode,pilotMode:"shared"},{fastForward:true,openConversation:true,scenarioGraph});
 const history=[],turns=[],diagnostics=[];
 try{
  for(let d=0;d<5;d++){
   const scene=renderConversation42(ep,d,history);
   history.push({role:"shared",kind:"scene",phase_index:d,body:scene.scene});
   for(const [i,role] of ["jack","jill"].entries()){
    const turn=await prepareOpenTurn43(ep,role,d,history,advice[d][i],randomUUID(),{
     apiKey:process.env.OPENAI_API_KEY,model:process.env.ANTHOS_JJ4_MODEL||process.env.OPENAI_MODEL||"gpt-4.1-mini",
     requireModelVoice:true,qaDiagnostic:x=>diagnostics.push(x),atlasContext:slimAtlasContext(roomAtlas43({episode:ep}),role,ep.authored43.selectedSkills)});
    ep.authored43.turns.push(turn);
    turns.push({day:d,role,advice:turn.body,reply:turn.reply,event:turn.event,
     decision:turn.characterDecision,source:turn.replySource,receipt:turn.replyProviderResponseId,model:turn.replyProviderModel,recipientReview:turn.replyRecipientReview,attempts:turn.replyModelAttempts});
   }
  }
  const final=renderConversation42(ep,5,history);
  history.push({role:"shared",kind:"scene",phase_index:5,body:final.scene});
  const closing=sophiaConversation42(ep,history),scores=roomAtlas43({episode:ep});
  return json({ok:true,mode:"real-OpenAI-fictional-no-SMS-no-database",turns,closing,
   diagnostics,metrics:{replies:turns.length,actions:turns.filter(t=>t.event).length,
    verifiedRecipients:turns.filter(t=>t.recipientReview?.ok).length,
    distinctReceipts:new Set(turns.map(t=>t.receipt)).size,
    sourceBackedObservations:scores.evidenceCount,scoreScope:scores.scope}});
 }catch(e){return json({ok:false,mode:"real-OpenAI-fictional-no-SMS-no-database",turns,
  diagnostics,error:String(e.message||"exchange failed").slice(0,180)},502)}
}};
