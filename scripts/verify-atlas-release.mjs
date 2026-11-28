// Anthos 4.3 has a deliberate fail-closed release gate.
// A preview or green unit test cannot substitute for confirmed annual score
// persistence, shared authenticated couple access and real-model QA.
import {readFileSync} from "node:fs";
import {verifyLivePilot43} from "../lib/atlas-live-qa-contract.mjs";
import {fileURLToPath} from "node:url";
const file=new URL("../docs/atlas-release-status.json",import.meta.url);
const current=JSON.parse(readFileSync(file,"utf8"));
const ids=Array.from({length:8},(_,i)=>"G"+(i+1));
if(current.contractVersion!=="anthos-4.3-release-gate-v1"||
 current.gates?.length!==8||ids.some(id=>!current.gates.find(g=>g.id===id))){
 console.error("Anthos release gate contract is missing/incomplete.");
 process.exit(1);
}
const blocked=current.gates.filter(g=>g.status!=="verified"||
 !Array.isArray(g.evidence)||g.evidence.length<2);
const release=current.releaseAllowed===true&&blocked.length===0;
if(!release){
 console.error("4.3 release blocked: "+blocked.map(g=>g.id+" "+g.title+" ["+g.status+"]").join("; "));
 console.error("Do not merge/deploy the 4.3 skill-driven system or claim 8/10 production quality.");
 process.exit(1);
}
// Even if someone marks all gates as verified, G8 cannot become green from
// a unit-test screenshot, a deterministic pilot, or subjective claims alone.
const reportPath=process.env.ANTHOS_QA_REPORT_PATH;
if(!reportPath){console.error("4.3 release blocked: no protected real-model QA report.");process.exit(1)}
let report;
try{report=JSON.parse(readFileSync(reportPath,"utf8"));}
catch{console.error("4.3 release blocked: unreadable real-model QA report.");process.exit(1)}
if(report.runKind!=="real-model-required"){
 console.error("4.3 release blocked: offline model/fallback report is not live certification.");
 process.exit(1);
}
const quality=verifyLivePilot43({couples:report.couples,reviews:report.reviews});
if(!quality.passed){console.error("4.3 release blocked: real-model or human 8/10 review missing.",quality.problems);process.exit(1)}
console.log("All eight gates verified, with independent human-reviewed real-model dialogue evidence.");
