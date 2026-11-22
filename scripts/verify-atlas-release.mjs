// Anthos 4.3 has a deliberate fail-closed release gate.
// A preview or green unit test cannot substitute for confirmed annual score
// persistence, mutually authorized transcript review and real-model QA.
import {readFileSync} from "node:fs";
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
console.log("All 8 release gates contain documented evidence; human approval and live QA remain mandatory.");
