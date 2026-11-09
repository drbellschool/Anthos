import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../pilot/index.html",import.meta.url),"utf8");
const client=readFileSync(new URL("../pilot/jj3.js",import.meta.url),"utf8");
test("both private character screens use one natural chat composer",()=>{
 assert.match(html,/id="message"/);
 assert.match(html,/id="send"/);
 assert.equal((html.match(/id="message"/g)||[]).length,1);
 assert.match(client,/Send to "\+s\.character/);
 for(const removed of ["commit","decision","check","modeToggle","manualMove","saveMove"])
  assert.doesNotMatch(html,new RegExp('id="'+removed+'"'));
 assert.doesNotMatch(client,/afterAction\("submit"\)|afterAction\("choose"\)|modeToggle|composeMode/);
});
test("story progresses automatically while private messages remain conversational",()=>{
 assert.match(client,/afterAction\("talk",\{message:text,requestKey:queuedKey\}\)/);
 assert.match(client,/api\("progress"\)/);
 assert.match(client,/setInterval\(/);
 assert.match(client,/s\.autoplay&&\(s\.step>1\|\|\(s\.submitted&&s\.otherSubmitted\)\)/,
   "Auto mode must continue checking independently of new human messages");
 assert.match(client,/s\.submitted&&s\.otherSubmitted/,
   "Legacy two-coach progress still works");
 assert.doesNotMatch(client,/s\.otherSubmitted&&!s\.processing/);
 assert.match(html,/Jack and Jill are living out the adventure/);
 assert.match(html,/carry the story forward without more coaching/);
});

test("the final story has visible closure and private reflection is optional",()=>{
 assert.match(html,/id="endingSection"/);
 for(const id of ["jackChange","jillChange","relationshipTruth","sophiaInsight","takeawayInvitation"])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/One last message to your friend/);
 assert.match(html,/\(optional\)/);
 assert.match(html,/Return to Anthos/);
 assert.match(client,/s\.scene\?\.closure/);
 assert.match(client,/\$\("endingSection"\)\.hidden=!completed\|\|!closing/);
 assert.match(client,/Final moment · One last choice/);
 assert.match(client,/Adventure complete · The end/);
 assert.doesNotMatch(html,/id="commit"|id="manualMove"|id="modeToggle"/);
});

test("autonomous pilot hides extra coaching input after the opening and keeps polling",()=>{
 assert.match(client,/s\.autoplay&&!expectingAdvice|const autoplayBetween=s\.autoplay&&/);
 assert.match(client,/Jack and Jill are acting on the situation themselves/);
 assert.match(client,/Your advice matters here/);
 assert.match(client,/setInterval\(\(\)=>\{if\(!busy.*?\},5000\)/);
 assert.doesNotMatch(client,/afterAction\("submit"/);
});
