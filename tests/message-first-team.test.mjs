// Archived expectations for retired Jack & Jill 1.x/2.x experiences.
// Active replacement coverage: tests/jj3-model.test.mjs and tests/jj3-integration.test.mjs.
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
test.skip("fluid rooms are distinct from legacy pilot rooms and require two spouse contributions",()=>{
 const core=read("../api/pilot-core.mjs"),ui=read("../pilot/app.js"),html=read("../pilot/index.html");
 assert.match(core,/createRoom\(origin,participants,engine\)/);
 assert.match(core,/mode="classic"/);
 assert.match(core,/\["fluid","dynamic"\]\.includes\(c\.room\.conversation_mode\)/);
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
  assert.match(body.instructions,/choose-your-own-adventure/i);
  assert.match(body.instructions,/distress\/safety/);
  assert.match(body.input,/Alex:/);
  assert.match(body.input,/Sam:/);
 }finally{globalThis.fetch=old;
  if(prior===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=prior;}
});

test("Sophia delivers exactly one complete story message and one decision message",()=>{
 const chapter={title:"The Invitation",
   story:"Jack got passes.\n\nJill hoped for pancakes and quiet time.\n\n"+
    "“You booked tomorrow?” she asks.\n\n“Yes,” says Jack.",
   prompt:"What do you notice?",options:["He meant well","She wanted a say","Ask first"]};
 const msgs=chapterAsMessages(chapter,1,8,{introduce:true,names:["Adam","Alissa"]});
 assert.equal(msgs.length,2);
 assert.deepEqual(msgs.map(m=>m.kind),["chapter","choices"]);
 assert.match(msgs[0].body,/Hi Adam and Alissa/);
 assert.match(msgs[0].body,/Chapter 1 of 8 · The Invitation/);
 assert.match(msgs[0].body,/Jack got passes/);
 assert.match(msgs[0].body,/Jill hoped for pancakes/);
 assert.match(msgs[0].body,/You booked tomorrow/);
 assert.ok(msgs[0].body.indexOf("Jack got passes")<msgs[0].body.indexOf("You booked tomorrow"));
 assert.match(msgs[1].body,/1\. He meant well\n2\. She wanted a say\n3\. Ask first/);
 assert.match(msgs[1].body,/Reply 1, 2, 3/);
 assert.deepEqual(msgs[1].options,chapter.options);
 assert.ok(msgs.every(m=>m.author==="sophia"&&typeof m.id==="string"));
});
test("later chapters also deliver one uninterrupted scene and one question",()=>{
 const scene={title:"Who Knew Before Jill?",
 story:"Jack's phone lights up.\n\nMaya asks if Owen is coming.\n\nJill reads the message.",
 prompt:"What should Jack do?",options:["Apologize","Ask what Jill wants","Contact their friends"]};
 const messages=chapterAsMessages(scene,2,8);
 assert.equal(messages.length,2);
 assert.equal(messages[0].kind,"chapter");
 assert.doesNotMatch(messages[0].body,/Hi Adam|I'm Sophia/);
 assert.equal(messages[0].body.split("Maya").length,2);
 assert.equal(messages[1].kind,"choices");
});
test.skip("the browser and future SMS use identical chapter delivery even without any spouse message",()=>{
 const chapter={title:"Saturday",story:"One long morning.",prompt:"What next?",options:["A","B","C"]};
 const room={story_format:"full",story_beat:1};
 const feed=conversationFeed({room,scenes:[chapter],chat:[],names:{a:"Adam",b:"Alissa"}});
 assert.equal(feed[0].kind,"chapter");
 assert.equal(feed.length,2);
 assert.equal(feed.at(-1).kind,"choices");
 assert.equal(feed.filter(m=>m.author==="a"||m.author==="b").length,0);
 const html=read("../pilot/index.html"),ui=read("../pilot/app.js");
 assert.match(ui,/state\.conversationFeed\|\|\[\]/);
 assert.match(ui,/\["fluid","dynamic"\]\.includes\(state\.conversationMode\)/);
 assert.match(ui,/\$\("storyMoment"\)\.hidden=!isReady\|\|\["fluid","dynamic"\]\.includes\(state\.conversationMode\)/);
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


test("Sophia's new story-engine prompt prioritizes consequences over a counseling loop",()=>{
 const source=read("../api/pilot-core.mjs");
 assert.ok(source.includes("choose-what-happens-next story"));
 assert.ok(source.includes("not a counselor or relationship coach"));
 assert.ok(source.includes("DEFAULT TO ADVANCE"));
 assert.ok(source.includes("When the spouses reach agreement, ALWAYS advance"));
 assert.ok(source.includes("maybeAdvanceFluid(c,invite,current"));
});
