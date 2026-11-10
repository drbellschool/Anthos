import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 validatePrivateCheckin,fallbackPrivateCheckin,checkinContract
} from "../api/jj4-private-voice.mjs";

const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
const player=readFileSync(new URL("../pilot-v4/player.js",import.meta.url),"utf8");
test("Jill's original wrong-audience prompt is rejected",()=>{
 assert.equal(validatePrivateCheckin(
  "Jill, what small, everyday actions might help you express affection that feels authentic and manageable in this demanding season?","jill"),false);
 assert.equal(validatePrivateCheckin(
  "Jill, consider how your jokes reveal your discomfort but might also block Jack's attempts to reconnect. What should you do?","jill"),false);
});
test("Jack cannot speak as the narrator, interviewer or the husband coach",()=>{
 assert.equal(validatePrivateCheckin(
  "Jack, reflect on how your affectionate attempts are missing Jill's comfort zone. What should you do?","jack"),false);
 assert.equal(validatePrivateCheckin(
  "How should Jack handle this with Jill? I think he should probably apologize.","jack"),false);
 assert.equal(validatePrivateCheckin(
  "Jack needs to listen more. My recommendation is to ask Jill about how she feels, okay?","jack"),false);
});
test("Genuine first-person private messages are accepted for both senders",()=>{
 assert.equal(validatePrivateCheckin(
  "I asked Jill about affection, but now she seems upset. I'm not sure whether I should apologize or give her time. What would you do?","jack"),true);
 assert.equal(validatePrivateCheckin(
  "I tried joking about it, but I think Jack took it as rejection. Would you tell him what I really meant, or should I do that myself?","jill"),true);
 assert.equal(validatePrivateCheckin(
  "I'm embarrassed that I made him feel unwanted. What's the least awkward way I can bring this up again?","jill"),true);
});
test("Fallback is a direct text from the character, not a coaching lesson addressed to them",()=>{
 const msg=fallbackPrivateCheckin("jill",{purpose:"Find a way to explain what sort of affection feels good now."});
 assert.equal(validatePrivateCheckin(msg,"jill"),true);
 assert.match(msg,/I'm not sure/);
 assert.match(msg,/what would you suggest I actually do/i);
});
test("Character roles cannot be confused with the husband or wife",()=>{
 assert.deepEqual(checkinContract("jack"),{
  speaker:"Jack",recipient:"the husband",voice:"first person, direct private text",
  shouldNot:"Address Jack in second person or write a narrator's coaching exercise."
 });
 assert.equal(checkinContract("jill").recipient,"the wife");
 assert.throws(()=>checkinContract("husband"),/Invalid coach recipient/);
});
test("The AI has an explicit character-to-coach voice contract plus server validation",()=>{
 assert.match(core,/VOICE CONTRACT: jackPrompt is a message JACK HIMSELF sends IN FIRST PERSON/);
 assert.match(core,/jillPrompt is a message JILL HERSELF sends IN FIRST PERSON/);
 assert.match(core,/validatePrivateCheckin\(draft,role\)/);
 assert.match(core,/generateStructured\(\{[\s\S]*name:"anthos_jj4_private_voice"/);
 assert.match(core,/fallbackPrivateCheckin\(role,cp\)/);
 assert.match(core,/const jackPrompt=\["jack","both"\]\.includes\(audience\)/);
});
test("Both private panels identify the actual sender and coach role clearly",()=>{
 assert.match(player,/Husband · coaching Jack/);
 assert.match(player,/Wife · coaching Jill/);
 assert.match(player,/· PRIVATE MESSAGE/);
 assert.match(player,/Reply privately to /);
});
