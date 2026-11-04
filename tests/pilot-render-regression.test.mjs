import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");

test("pilot renderer defines fluid before first access, avoiding frozen Send/Ready controls",()=>{
 const code=read("../pilot/app.js");
 const start=code.indexOf("function render(){");
 const end=code.indexOf("async function refresh(){",start);
 assert.ok(start>=0&&end>start);
 const segment=code.slice(start,end);
 const declaration=segment.indexOf('const fluid=state.conversationMode==="fluid"');
 const use=segment.indexOf('$("proposeButton").hidden=fluid');
 assert.ok(declaration>=0,"fluid declaration missing");
 assert.ok(use>=0&&declaration<use,"fluid must be initialized before first read");
 assert.equal((segment.match(/const fluid=/g)||[]).length,1);
 assert.match(segment,/\$\("send"\)\.disabled=busy\|\|!isActive/);
 assert.match(segment,/\$\("legacyTools"\)\.hidden=fluid/);
});

test("generic pilot room creation now opts into fluid mode without mutating classic sessions",()=>{
 const admin=read("../api/admin.mjs");
 const core=read("../api/pilot-core.mjs");
 assert.match(admin,/createPilotRoom\(new URL\(request\.url\)\.origin,null,"fluid"\)/);
 assert.match(core,/createRoom\(origin,linkedCustomers=null,mode="classic"\)/);
 assert.match(core,/conversation_mode:mode/);
 assert.match(core,/createRoom\(origin,participants,"fluid"\)/);
 const creator=read("../pilot/create/index.html");
 assert.match(creator,/generic pilot does not automatically attach/);
});
test("duplicate chosen display names do not masquerade as one person",()=>{
 const app=read("../pilot/app.js");
 assert.match(app,/state\.partnerName===state\.displayName/);
 assert.match(app,/Spouse /);
 assert.match(app,/\(rename\)/);
});
