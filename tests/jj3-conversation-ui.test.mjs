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
 assert.match(html,/Your friend is putting that plan into action/);
});
