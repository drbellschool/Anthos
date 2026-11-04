import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initialAdventure,advanceAdventure,bidPatternPressure,marriageInsight,adventureFeed,RESEARCH_PATTERNS,validateDecision,directorPrompt} from "../api/dynamic-adventure.mjs";
const pair=[{id:1,author:"a",body:"Jill needs to notice Jack's invitation."},{id:2,author:"b",body:"Jack can try one more time."}];
function result(state,pattern,actor="Jill"){
 return {
  consequence:"Jack invites Jill to share a moment, but she looks away and misses his invitation. He leaves the game on the table instead of asking again.",
  nextScene:{title:"An unanswered invitation",
   story:"The rain taps against the window as Jack brings out an old board game. He remembers the last time Jill brushed aside his invitation to play. Jack quietly puts the pieces away. Jill notices his unusual silence and wonders whether he was trying to tell her something. At the far end of the table, he turns toward the window and waits for her to say something.",
   prompt:"Jill notices Jack has gone quiet after an invitation. What should happen next?",
   options:["Jill asks Jack what he wanted to share with her.","Jack says plainly that he had hoped they would play together.","They let the moment pass and continue separate activities."]},
  location:state.ledger.setting.location,timeIndex:state.ledger.setting.timeIndex+1,
  transition:"They remain in the same room during the rainy evening.",
  newFacts:["Jack invited Jill to play a game."],unresolved:["Jack's invitation has not been answered."],
  checkpoint:null,checkpointEvidence:"",
  researchBeat:{pattern,actor,
   evidence:pattern==="missed_bid"?
    "Jill did not respond when Jack invited her to play a game.":
    "Jill noticed Jack's invitation and asked him to play together."}
 };
}
test("two missed bids create a repeat-pattern signal; a turn toward interrupts it",()=>{
 const a=initialAdventure();
 const b=advanceAdventure(a,result(a,"missed_bid"),pair);
 assert.equal(bidPatternPressure(b).Jill,1);
 const c=advanceAdventure(b,result(b,"missed_bid"),[{id:3,...pair[0]},{id:4,...pair[1]}]);
 assert.equal(bidPatternPressure(c).Jill,2);
 assert.equal(bidPatternPressure(c).Jack,0);
 assert.equal(c.relationshipPatterns.length,2);
 const p=directorPrompt(c,pair,{a:"Alex",b:"Sam"});
 assert.match(p.input,/"Jill":2/);
 assert.match(p.instructions,/If Jill repeatedly ignores Jack's credible bids/);
 const d=advanceAdventure(c,result(c,"turned_toward"),[{id:5,...pair[0]},{id:6,...pair[1]}]);
 assert.equal(bidPatternPressure(d).Jill,0);
});
test("research note is earned by actual fictional behavior, not awarded for generic checkpoint",()=>{
 const a=initialAdventure(),b=advanceAdventure(a,result(a,"missed_bid"),pair);
 const feed=adventureFeed(b,pair,{a:"Alex",b:"Sam"});
 const story=feed.find(m=>m.kind==="chapter"&&m.id==="dynamic-2-story");
 assert.match(story.body,/Sophia's insight · Gottman/);
 assert.match(story.body,/Jill did not respond/);
 assert.equal(story.researchPattern,"missed_bid");
 assert.match(story.researchSource,/gottman.com/);
 assert.equal(feed.filter(m=>m.kind==="consequence").length,0);
 assert.equal(feed.filter(m=>m.kind==="chapter").length,2);
 assert.equal(feed.filter(m=>m.kind==="choices").length,2);
 assert.equal(story.consequenceTurn,1);
 assert.equal(marriageInsight({pattern:"none",actor:"none",evidence:""}),null);
});
test("research evidence must be an observable fictional action",()=>{
 const state=initialAdventure();
 assert.ok(validateDecision(state.scene,state,result(state,"missed_bid","Jill"),pair).ok);
 const invalid=result(state,"missed_bid");invalid.researchBeat.evidence="They felt some things.";
 assert.ok(validateDecision(state.scene,state,invalid,pair).problems.includes("research pattern requires a concrete fictional action"));
 const unrecognized=result(state,"invented_pattern");
 assert.ok(validateDecision(state.scene,state,unrecognized,pair).problems.includes("invalid research-based behavior"));
});
test("source catalog is bounded and model cannot invent authority or statistics",()=>{
 assert.ok(RESEARCH_PATTERNS.turned_toward.citation.startsWith("https://www.gottman.com/"));
 assert.ok(RESEARCH_PATTERNS.novelty.citation.startsWith("https://pubmed.ncbi.nlm.nih.gov/"));
 assert.ok(!RESEARCH_PATTERNS.differentiation.citation);
 const p=directorPrompt(initialAdventure(),pair);
 assert.match(p.instructions,/never claim one missed bid causes divorce/i);
 assert.match(p.instructions,/not a lecture/i);
 assert.match(p.input,/researchPatterns/);
 const core=readFileSync(new URL("../api/pilot-core.mjs",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../pilot/app.js",import.meta.url),"utf8");
 assert.match(core,/researchBeat:\{type:"object"/);
 assert.match(core,/"checkpointEvidence","researchBeat"/);
 assert.match(ui,/Research behind this moment/);
 assert.match(ui,/Comment on consequence/);
});
