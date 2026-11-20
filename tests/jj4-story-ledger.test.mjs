import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {emptyLedger,sanitizeLedger,storyLedgerInstructions,ledgerPrompt,LEDGER_SCHEMA} from "../api/jj4-story-ledger.mjs";
const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");

test("episode-specific baseline cannot contaminate a communication petal with microwave facts",()=>{
 const episode={title:"Can We Talk Later?",learningObjective:"Return from a pause",
  jackMotivation:"Meeting pressures",jillMotivation:"Need a real return time"};
 const simulation={knownFacts:["Jack is leaving for a meeting.","No return time is agreed."],
  openThreads:["Schedule a bounded return"],characters:{jack:{belief:"I will lose focus"},jill:{belief:"Later means forever"}}};
 const seed=emptyLedger(episode,simulation);
 assert.equal(seed.confirmedFacts.length,2);
 assert.match(seed.confirmedFacts.join(" "),/meeting/);
 assert.doesNotMatch(seed.confirmedFacts.join(" "),/microwave|repairing the broken/i);
 assert.equal(seed.unresolved[0],"Schedule a bounded return");
});
test("completed chronology has verbatim evidence rather than fabricated events",()=>{
 const episode={title:"Can We Talk Later?"},sim={knownFacts:["Jack has a meeting."]};
 const scenes=[{body:"Jack said they would talk later and left the kitchen. Jill watched him go."}];
 const model={
  confirmedEvents:[
   {id:"jack-departure",actor:"Jack",action:"Jack departed for his meeting",status:"completed",phase:"hook",evidence:"Jack said they would talk later and left the kitchen."},
   {id:"invented-return",actor:"Jack",action:"Jack returned home",status:"completed",phase:"hook",evidence:"Jack magically came back from work."}
  ],
  confirmedFacts:["They have a 30-day refund policy."],
  unresolved:["Return to conversation"],unverifiedClaims:[],jackPosition:"Avoiding",jillPosition:"Wary"
 };
 const grounded=sanitizeLedger(model,episode,sim,scenes);
 assert.equal(grounded.confirmedEvents.length,1);
 assert.equal(grounded.confirmedEvents[0].id,"jack-departure");
 assert.doesNotMatch(grounded.confirmedFacts.join(" "),/30-day refund/);
 const prompt=ledgerPrompt(grounded,"conflict");
 assert.match(prompt.alreadyCompletedDoNotReplay.join(" "),/Jack departed/);
 assert.match(prompt.mandate,/cannot re-perform a departure/);
});
test("proposed choices are not automatically treated as completed agreements",()=>{
 const state=sanitizeLedger({confirmedEvents:[{
  id:"offer",actor:"Jack",action:"Jack proposed Sunday",status:"proposed",phase:"conflict",evidence:"Jack proposed Sunday at dinner."
 }],confirmedFacts:[],unresolved:[],unverifiedClaims:[],jackPosition:"",jillPosition:""},
 {title:"Can We Talk Later?"},null,[{body:"Jack proposed Sunday at dinner. Jill looked unsure."}]);
 const prompt=ledgerPrompt(state,"discovery");
 assert.equal(prompt.alreadyCompletedDoNotReplay.length,0);
 assert.equal(prompt.proposalsNotYetAccepted.length,1);
});
test("narrator and independent reviewer both see the cross-petal ledger",()=>{
 assert.match(core,/if\(\(focusedPilot\|\|qualityGate\)&&sharedHistory.length\)/);
 assert.match(core,/sanitizeLedger\(extracted,room.episode,simulationBefore,sharedHistory\)/);
 assert.match(core,/completedEventLedger:\(focusedPilot\|\|qualityGate\)\?ledgerPrompt/);
 assert.match(core,/ProposalsNotYetAccepted are NOT agreements/);
 assert.match(storyLedgerInstructions(),/verbatim/);
 assert.ok(LEDGER_SCHEMA.properties.confirmedEvents.items.required.includes("evidence"));
});
