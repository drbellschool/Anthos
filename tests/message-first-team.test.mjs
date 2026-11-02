import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chapterAsText,conversationReady} from "../api/pilot-core.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("the exact same numbered options render as plain SMS-compatible text",()=>{
 const scene={title:"Saturday",story:"Jack bought tickets.",prompt:"What would you do?",
 options:["Ask Jill first","Cancel the tickets","Make a shared plan"]};
 const msg=chapterAsText(scene,2,8);
 for(const line of ["Chapter 2/8","1. Ask Jill first","2. Cancel the tickets",
   "3. Make a shared plan","Reply 1, 2, 3, or tell us"])assert.ok(msg.includes(line));
 assert.doesNotMatch(msg,/<details|<button|<summary/);
});
test("fluid rooms are distinct from legacy pilot rooms and require two spouse contributions",()=>{
 const core=read("../api/pilot-core.mjs"),ui=read("../pilot/app.js"),html=read("../pilot/index.html");
 assert.match(core,/createRoom\(origin,participants,"fluid"\)/);
 assert.match(core,/mode="classic"/);
 assert.match(core,/actual=c\.room\.conversation_mode==="fluid"/);
 assert.match(core,/current\.filter\(m=>m\.author==="a"\)\.length>=2/);
 assert.match(core,/current\.filter\(m=>m\.author==="b"\)\.length>=2/);
 assert.match(core,/resolveChapter\(invite,true\)/);
 assert.match(core,/conversationReady\(current,reply/);
 assert.match(core,/if\(automatic\)/);
 assert.match(ui,/act\("send",\{message:String\(i\+1\)\}\)/);
 assert.match(ui,/\$\("legacyTools"\)\.hidden=fluid/);
 assert.match(ui,/\$\("readinessPanel"\)\.hidden=fluid/);
 assert.doesNotMatch(html,/<details id="choicesBlock"/);
 assert.match(html,/id="choiceOptions"/);
 assert.match(html,/id="chapterComment"/);
});
test("AI has the final conservative say on automatic chapter transition and false is respected",async()=>{
 const old=globalThis.fetch,prior=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY="test-key";
 const messages=[{author:"a",body:"Maybe Jack should ask first"},{author:"b",body:"Jill wants time alone"}];
 let body=null;
 globalThis.fetch=async(_url,init)=>{
  body=JSON.parse(init.body);
  return new Response(JSON.stringify({output:[{type:"message",content:[{
   type:"output_text",text:JSON.stringify({advance:false,reason:"They are still exploring"})
  }]}]}),{status:200});
 };
 try{
  const value=await conversationReady(messages,"That's worth considering.",{story:"Jack made a surprise"},
   {a:"Alex",b:"Sam"});
  assert.equal(value,false);
  assert.equal(body.store,false);
  assert.match(body.instructions,/natural/i);
  assert.match(body.instructions,/unresolved concern/);
  assert.match(body.input,/Alex:/);
  assert.match(body.input,/Sam:/);
 }finally{globalThis.fetch=old;
  if(prior===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=prior;}
});
