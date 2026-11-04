import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chapterAsText,chapterAsMessages,conversationFeed,conversationReady} from "../api/pilot-core.mjs";
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

test("Sophia introduces, delivers the actual first chapter, then provides SMS-compatible numbered options",()=>{
 const chapter={title:"The Invitation",story:"Jack got passes.\n\nJill hoped for pancakes and quiet time.",
  prompt:"What do you notice?",options:["He meant well","She wanted a say","Ask first"]};
 const msgs=chapterAsMessages(chapter,1,8,{introduce:true,names:["Adam","Alissa"]});
 assert.deepEqual(msgs.map(m=>m.kind),["intro","chapter","story","story","choices"]);
 assert.match(msgs[0].body,/Hi Adam and Alissa/);
 assert.match(msgs[2].body,/Jack got passes/);
 assert.match(msgs[3].body,/Jill hoped for pancakes/);
 assert.match(msgs.at(-1).body,/1\. He meant well\n2\. She wanted a say\n3\. Ask first/);
 assert.match(msgs.at(-1).body,/Reply 1, 2, 3/);
 assert.deepEqual(msgs.at(-1).options,chapter.options);
 assert.ok(msgs.every(m=>m.author==="sophia"&&typeof m.id==="string"));
});
test("the browser and future SMS use identical chapter delivery even without any spouse message",()=>{
 const chapter={title:"Saturday",story:"One long morning.",prompt:"What next?",options:["A","B","C"]};
 const room={story_format:"full",story_beat:1};
 const feed=conversationFeed({room,scenes:[chapter],chat:[],names:{a:"Adam",b:"Alissa"}});
 assert.equal(feed[0].kind,"intro");
 assert.equal(feed.at(-1).kind,"choices");
 assert.equal(feed.filter(m=>m.author==="a"||m.author==="b").length,0);
 const html=read("../pilot/index.html"),ui=read("../pilot/app.js");
 assert.match(ui,/state\.conversationFeed\|\|\[\]/);
 assert.match(ui,/state\.conversationMode==="fluid"/);
 assert.match(ui,/\$\("storyMoment"\)\.hidden=!isReady\|\|state\.conversationMode==="fluid"/);
 assert.match(ui,/button\.addEventListener\("click",\(\)=>act\("send",\{message:String\(i\+1\)\}\)\)/);
 assert.match(ui,/m\.kind==="choices"/);
 assert.match(ui,/makeCommentButton\("✎ Comment on choices"/);
 assert.match(html,/id="thread"/);
});
test("fluid chapter delivery remains an authored message, not a fake AI reply or consent bypass",()=>{
 const core=read("../api/pilot-core.mjs");
 assert.match(core,/conversationFeed:consent&&c\.room\.conversation_mode==="fluid"/);
 assert.match(core,/return conversationFeed\(\{room:c\.room,scenes,effects,chat,names:namesFor\(c\)\}\)/);
 assert.match(core,/messages:consent\?await messages/);
 assert.match(core,/const fresh=current\.slice\(lastSophia\+1\)/);
 const css=read("../pilot/style.css");
 assert.doesNotMatch(css,/(?:^|\n)\.choices-block:not\(\[open\]\)/);
 assert.match(css,/\.message-choices/);
});
