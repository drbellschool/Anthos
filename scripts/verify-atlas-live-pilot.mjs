// Anthos 4.3 real-model QA gate: must never pass using mock/fallback messages.
// Usage: node scripts/verify-atlas-live-pilot.mjs /secure/path/pilot-report.json
import {readFileSync} from "node:fs";
import {verifyLivePilot43} from "../lib/atlas-live-qa-contract.mjs";
const reportPath=process.argv[2]||process.env.ANTHOS_QA_REPORT_PATH;
if(!reportPath){
 console.error("4.3 REAL AI QUALITY BLOCKED: no protected live-model ten-couple report and human reviews.");
 process.exit(1);
}
let report;
try{report=JSON.parse(readFileSync(reportPath,"utf8"));}
catch{console.error("4.3 REAL AI QUALITY BLOCKED: report unreadable or missing.");process.exit(1);}
if(report.runKind!=="real-model-required"){
 console.error("4.3 REAL AI QUALITY BLOCKED: offline or mocked pilot report is not acceptable.");
 process.exit(1);
}
const check=verifyLivePilot43({couples:report.couples,reviews:report.reviews});
console.log(JSON.stringify({realModelQualityGate:check.passed,metrics:check.metrics,problems:check.problems}));
if(!check.passed)process.exit(1);
