import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {classifyCoachTurn,privateQuestionPrompt} from "../api/jj4-response-router.mjs";
import {adviceForNextScene} from "../api/jj4-causality.mjs";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const api=read("../api/jack-jill-v4.mjs");
const core=read("../api/jj4-core.mjs");
const player=read("../pilot-v4/player.js");
const migration=read("../supabase/migrations/20261115170000_jj4_private_response_router.sql");

test("explicit coach pause is not converted into fictional advice",()=>{
 for(const input of [
  "Please pause this episode.",
  "I need a break and have no advice. Please pause this episode instead of making up a decision for me.",
  "I want to pause this story now.",
  "Stop the pilot, please."
 ]){
  assert.equal(classifyCoachTurn(input).kind,"pause",input);
 }
 assert.equal(classifyCoachTurn("Tell Jack to pause and take a breath.").kind,"advice");
 assert.equal(classifyCoachTurn("Jack should pause before reacting.").kind,"advice");
});
test("queries, corrections, no-advice and risky suggestions get distinct meaning",()=>{
 assert.equal(classifyCoachTurn("What did Jill actually buy?").kind,"question");
 assert.equal(classifyCoachTurn("No, that's wrong: Jill bought it.").kind,"correction");
 assert.equal(classifyCoachTurn("Actually Jill bought the microwave.").kind,"correction");
 assert.equal(classifyCoachTurn("I have no advice right now.").kind,"no_advice");
 assert.equal(classifyCoachTurn("Cut off her bank access until she complies.").risk,"potentially_coercive");
 assert.equal(classifyCoachTurn("Ask Jill to explain why she did it.").kind,"advice");
});
test("clear real-person danger stops fiction rather than becoming coaching",()=>{
 assert.equal(classifyCoachTurn("I want to kill myself").kind,"safety");
 assert.equal(classifyCoachTurn("My spouse hit me yesterday").kind,"safety");
 assert.equal(classifyCoachTurn("I'm scared of my husband").kind,"safety");
 assert.equal(classifyCoachTurn("Tell Jack to say that he is scared of Jill").kind,"advice");
 assert.match(core,/safetyNotice/);
 assert.match(core,/await pause\(token\)/);
 assert.match(player,/result\.safetyNotice/);
});
test("question prompt is isolated to role and doesn't include the other coach's input",()=>{
 const q=privateQuestionPrompt({
  character:"Jack",question:"Why are you upset?",
  episode:{premise:"A hard purchase",sceneSetting:"Kitchen"},
  scenes:[{phase_index:0,body:"The microwave arrived"}],
  mine:[{kind:"prompt",body:"What should I do?"},{kind:"question",body:"Why?"},{kind:"reply",body:"I'm worried."}]
 });
 assert.equal(q.character,"Jack");
 assert.equal(q.ownPrivateConversation.length,3);
 assert.match(q.boundaries.join(" "),/Never reveal.*other coach/);
 assert.ok(!JSON.stringify(q).includes("another participant"));
});
test("no-advice is passed to the causal planner without inventing an instruction",()=>{
 const episode={checkpoints:[{afterPhase:"hook",audience:"jack",waitForReply:true,purpose:"Help Jack decide"}]};
 const history=[{role:"jack",kind:"coach",phase_index:0,body:"I have no advice right now."}];
 const influence=adviceForNextScene(1,episode,history);
 assert.equal(influence.responseKinds.jack.kind,"no_advice");
 assert.equal(influence.advice.jack,"I have no advice right now.");
});
test("API and UI offer distinct ask, pause, resume, no-advice paths",()=>{
 for(const action of ["ask","pause","resume"])
  assert.match(api,new RegExp('case "'+action+'"'));
 assert.match(core,/pausedBy/);
 assert.match(core,/paused_at/);
 assert.match(core,/return pause\(token\)/);
 assert.match(core,/return ask\(token,words,requestKey\)/);
 assert.match(player,/Pause story/);
 assert.match(player,/Resume story/);
 assert.match(player,/Contribute to the next page/);
 assert.doesNotMatch(player,/Send private advice/);
 assert.match(player,/safetyNotices/);
});
test("schema enforces role-private Q&A, rate limit, and pause-aware scene claims",()=>{
 assert.match(migration,/paused_at timestamptz/);
 assert.match(migration,/kind in \('scene','prompt','coach','sophia','question','reply'\)/);
 assert.match(migration,/n>=2/);
 assert.match(migration,/who\.paused_at is not null/);
 assert.match(migration,/r\.stage<>'awaiting'/);
 assert.match(migration,/p\.paused_at is not null/);
 assert.match(migration,/revoke all on function public\.anthos_jj4_store_private_question/);
});
