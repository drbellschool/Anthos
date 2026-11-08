import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../pilot/index.html",import.meta.url),"utf8");
const client=readFileSync(new URL("../pilot/jj3.js",import.meta.url),"utf8");
const styles=readFileSync(new URL("../pilot/jj3.css",import.meta.url),"utf8");
test("Jack and Jill now have one consistent conversation composer, not duplicate instructions",()=>{
 assert.match(html,/id="message"/);
 assert.match(html,/id="send"/);
 assert.match(html,/id="modeToggle"/);
 assert.match(html,/id="commit"/);
 assert.doesNotMatch(html,/id="manualMove"|id="saveMove"|Choose Jack's next move|What should Jack do or say next/i);
 assert.equal((html.match(/id="message"/g)||[]).length,1);
 assert.match(client,/Send to "\+s\.character/);
 assert.match(client,/See how it goes/);
 assert.doesNotMatch(client,/manualToggle|manualMove|saveMove|manualLabel/);
 assert.match(styles,/alternate-action/);
});
test("alternate suggestion uses the existing composer and cannot silently send another person's action",()=>{
 assert.match(client,/if\(composeMode==="move"\)/);
 assert.match(client,/afterAction\("choose",\{move:text\}\)/);
 assert.match(client,/afterAction\("submit"\)/);
 assert.match(client,/if\(!state\?\.action\|\|busy\)return/);
 assert.match(client,/chatDraft=/);
 assert.match(client,/moveDraft=/);
});
