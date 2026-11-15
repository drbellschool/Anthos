// Opt-in, private synthetic pilot driver for the EXISTING Anthos v4 endpoints.
// Never uses customer accounts, Telnyx, or real coach text. No automatic production release.
// Requires ANTHOS_QA_ENABLE_LIVE=1, ANTHOS_QA_BASE_URL, ANTHOS_QA_ADMIN_COOKIE,
// ANTHOS_QA_SCENARIO_IDS (comma-separated UUIDs), ANTHOS_QA_PROFILE and ANTHOS_QA_SEED.
// This driver intentionally DOES NOT claim judge scores, model token usage or spend.
import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {syntheticCoaching,PROFILES} from "./synthetic.mjs";
const required=(name)=>{const x=process.env[name]?.trim();if(!x)throw new Error(name+" is required");return x};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function invitation(link){
 const u=new URL(link);
 const token=u.searchParams.get("invite");
 if(!/^[A-Za-z0-9_-]{43}$/.test(token||""))throw Error("QA invitation missing");
 return token;
}
async function requestJson(url,{cookie,token,action,details}={}){
 const headers={"Accept":"application/json"};
 const isPost=action!==undefined;
 if(isPost){headers["Content-Type"]="application/json";headers.Origin=new URL(url).origin;}
 if(cookie)headers.Cookie=cookie;
 if(token)headers["x-anthos-v4-invite"]=token;
 const res=await fetch(url,{method:isPost?"POST":"GET",headers,
  ...(isPost?{body:JSON.stringify({action,...details})}:{}),signal:AbortSignal.timeout(115000)});
 const parsed=await res.json().catch(()=>({error:"Non-JSON response"}));
 if(!res.ok||parsed.error)throw new Error("Pilot HTTP "+res.status+": "+String(parsed.error||"unknown").slice(0,200));
 return parsed;
}
async function runOne({base,cookie,scenarioId,profile,seed,outputDir}){
 const started=Date.now();
 const created=await requestJson(base+"/api/admin",{
  cookie,action:"episode-studio-pilot-v4",details:{scenarioId}});
 const invites=created.invitations||{};
 const roles=Object.keys(invites).filter(x=>x==="jack"||x==="jill");
 if(!roles.length)throw Error("No pilot roles returned");
 const tokens=Object.fromEntries(roles.map(r=>[r,invitation(invites[r])]));
 const endpoint=base+"/api/jack-jill-v4";
 const api=(role,action,details)=>requestJson(endpoint,{token:tokens[role],action,details});
 for(const role of roles)await api(role,"join",{name:"Synthetic Tester"});
 const coaching=[],actions=[];
 let terminal=null;
 for(let loop=0;loop<40;loop++){
  const snapshots=Object.fromEntries(await Promise.all(roles.map(async role=>[role,await api(role)])));
  const primary=snapshots[roles[0]];
  if(primary.finished){
   if(!primary.hasSophia)await api(roles[0],"closure",{});
   terminal=await api(roles[0]);break;
  }
  if(primary.stage==="awaiting"){
   let submitted=0;
   for(const role of roles){
    const s=snapshots[role];
    if(!s.needsReply)continue;
    const phase=s.phaseIndex;
    const advice=syntheticCoaching({seed,profile,role,phase});
    const next=await api(role,"coach",{message:advice,requestKey:randomUUID()});
    coaching.push({role,afterPhase:phase,syntheticInput:advice,
      submitted:next.submitted===true});
    submitted++;
   }
   if(!submitted)throw Error("Awaiting stage without an eligible synthetic coach");
  }else if(primary.canContinue){
   await api(roles[0],"advance",{});
   actions.push({phase:primary.phaseIndex,action:"advance"});
  }else{
   // The API may briefly return 'generating' while another atomic commit finishes.
   await sleep(1000);
  }
 }
 if(!terminal?.finished)throw Error("Pilot exceeded maximum synthetic steps or never completed");
 const sceneMessages=(terminal.scenes||[]).filter(x=>x.kind==="scene")
  .sort((a,b)=>a.phase_index-b.phase_index);
 const scenes=sceneMessages.map(x=>({phase:x.phase_index,body:x.body}));
 const closure=(terminal.scenes||[]).find(x=>x.kind==="sophia");
 const output={
  id:"qa-"+randomUUID(),source:"existing-anthos-v4-browser-api",synthetic:true,
  episodeId:scenarioId,mode:created.mode,profile,seed,createdAt:new Date().toISOString(),
  engineCommit:process.env.ANTHOS_QA_ENGINE_SHA||null,
  model:process.env.ANTHOS_QA_MODEL||null,
  episodeVersion:process.env.ANTHOS_QA_EPISODE_VERSION||null,
  scenes,closure:closure?{body:closure.body}:null,
  coaching,actions,transitions:null,humorBeats:null,
  gates:{privacy:null,safety:null,factual:null,state:null,coaching:null,forcedDecision:null},
  judgments:null,costUsd:null,latencyMs:Date.now()-started,
  limitations:["Transition ledger and model token usage require server-side QA export.",
   "Synthetic coaching dispositions and gate evidence require independent review.",
   "No release-ready quality score is inferred from mere completion."]
 };
 await mkdir(outputDir,{recursive:true});
 const file=outputDir+"/"+output.id+".json";
 await writeFile(file,JSON.stringify(output,null,2)+"\n",{mode:0o600});
 return {file,scenes:scenes.length,completed:terminal.finished,ms:output.latencyMs,
  profile,episodeId:scenarioId,scored:false};
}
async function main(){
 if(process.env.ANTHOS_QA_ENABLE_LIVE!=="1")
  throw Error("Live QA disabled. Set ANTHOS_QA_ENABLE_LIVE=1 explicitly.");
 const base=new URL(required("ANTHOS_QA_BASE_URL")).origin;
 if(!base.startsWith("https://"))throw Error("HTTPS required for QA browser pilot");
 const cookie=required("ANTHOS_QA_ADMIN_COOKIE");
 const ids=required("ANTHOS_QA_SCENARIO_IDS").split(",").map(x=>x.trim());
 if(!ids.every(x=>uuid.test(x)))throw Error("Invalid scenario UUID");
 const profile=process.env.ANTHOS_QA_PROFILE||"helpful";
 if(!PROFILES.includes(profile))throw Error("Unknown coaching profile");
 const seed=Number(process.env.ANTHOS_QA_SEED||17);
 if(!Number.isSafeInteger(seed))throw Error("Invalid seed");
 const limit=Math.min(8,Math.max(1,Number(process.env.ANTHOS_QA_MAX_RUNS||1)));
 const outputDir=process.env.ANTHOS_QA_OUTPUT_DIR||"qa-artifacts";
 const results=[];
 for(const scenarioId of ids.slice(0,limit)){
  results.push(await runOne({base,cookie,scenarioId,profile,seed,outputDir}));
 }
 process.stdout.write(JSON.stringify({syntheticPilotResults:results},null,2)+"\n");
}
main().catch(e=>{process.stderr.write("Quality Lab: "+e.message+"\n");process.exitCode=1});
