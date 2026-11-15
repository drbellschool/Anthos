import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {emptyLedger,sanitizeLedger,ledgerPrompt,storyLedgerInstructions} from "../api/jj4-story-ledger.mjs";
const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
test("event ledger distinguishes completed, proposed and unverifiable details",()=>{
 const ledger=sanitizeLedger({
  confirmedEvents:[{id:"jack-call",actor:"Jack",action:"Jack called a repair technician",status:"completed",phase:"discovery"},
   {id:"return",actor:"Jill",action:"Jill might return the purchase",status:"proposed",phase:"discovery"}],
  confirmedFacts:[],unresolved:["Return decision"],unverifiedClaims:["Store return shipping costs $30"],
  jackPosition:"Concerned",jillPosition:"Frustrated"
 });
 const prompt=ledgerPrompt(ledger,"reattempt");
 assert.ok(prompt.alreadyCompletedDoNotReplay.some(x=>x.includes("called")));
 assert.ok(prompt.unverifiedNotYetFact.some(x=>x.includes("shipping")));
 assert.ok(!prompt.alreadyCompletedDoNotReplay.some(x=>x.includes("might return")));
 assert.match(ledger.confirmedFacts.join(" "),/Jill spent \$400/);
});
test("isolated pilot receives event ledger in three generation stages",()=>{
 assert.match(core,/anthos_jj4_event_ledger/);
 assert.match(core,/const focusedPilot=isContinuityPilot\(room\)/);
 assert.match(core,/eventLedger:ledgerPrompt\(eventLedger,phase\)/);
 assert.match(core,/completedEventLedger:focusedPilot\?ledgerPrompt\(ev¶»§q«^