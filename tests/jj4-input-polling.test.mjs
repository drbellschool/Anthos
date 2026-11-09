import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const script=readFileSync(new URL("../pilot-v4/player.js",import.meta.url),"utf8");

class FakeElement {
 constructor(tag="div"){
  this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};
  this.handlers={};this.value="";this.textContent="";this.disabled=false;
  const classes=new Set();
  this.classList={
   add:x=>classes.add(x),remove:x=>classes.delete(x),
   contains:x=>classes.has(x),toggle:(x,on)=>on===undefined?
    classes.has(x)?(classes.delete(x),false):(classes.add(x),true):
    on?(classes.add(x),true):(classes.delete(x),false)
  };
 }
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=[...items]}
 setAttribute(key,value){this.attrs[key]=value}
 addEventListener(key,handler){this.handlers[key]=handler}
 querySelectorAll(tag){
  const results=[];
  const visit=x=>{
   for(const child of x.children){
    if(child.tagName===tag.toUpperCase())results.push(child);
    visit(child);
   }
  };
  visit(this);return results;
 }
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(role,joined=true){
 const root=new FakeElement("main");
 const token=role==="jack"?"A".repeat(43):"B".repeat(43);
 const state={
  ok:true,role,character:role==="jack"?"Jack":"Jill",phase:"Hook",phaseIndex:0,
  joined,bothJoined:joined,stage:joined?"awaiting":"needs_scene",
  needsReply:joined,submitted:false,finished:false,canContinue:false,
  scenes:[{id:1,kind:"scene",phase_index:0,body:"A story scene"}],
  messages:[{id:2,kind:"prompt",phase_index:0,body:"What should I do?"}],
  waitingFor:["jack","jill"]
 };
 const responses=[state];
 let interval=null,requests=0;
 const context={
  window:{},document:{createElement:tag=>new FakeElement(tag)},
  fetch:async()=>{
   requests++;
   return {ok:true,json:async()=>structuredClone(responses.shift()||state)};
  },
  setInterval:fn=>{interval=fn;return 1},
  clearInterval:()=>{},
  setTimeout:()=>2,
  clearTimeout:()=>{},
  crypto:{randomUUID:()=> "e6a8949d-f343-44ad-a357-10b7b189de20"}
 };
 vm.runInNewContext(script,context);
 const player=context.window.Anthos4Player.mount(root,token);
 const find=tag=>root.querySelectorAll(tag)[0];
 return {
  root,player,state,responses,find,
  poll:async()=>{
   if(!interval)throw Error("No poll interval");
   interval();
   await tick();await tick();
  },
  refresh:async()=>{await player.refresh();await tick()},
  getRequests:()=>requests
 };
}
for(const role of ["jack","jill"]){
 test(role+" retains a private unsent advice draft and input focus through polling and partner submit",async()=>{
  const app=harness(role);
  await tick();await tick();
  const input=app.find("textarea");
  assert.ok(input,"first coaching textarea is visible");
  const draft="Please hear your partner out before making assumptions.";
  input.value=draft;
  input.handlers.input();
  app.responses.push({...app.state,waitingFor:[role]});
  await app.poll();
  assert.equal(app.find("textarea"),input,"polling should not replace the focused textarea");
  assert.equal(input.value,draft,"private advice must not disappear after refresh");
  app.responses.push({...app.state,waitingFor:[role]});
  await app.poll();
  assert.equal(app.find("textarea"),input);
  assert.equal(input.value,draft);
  assert.ok(app.getRequests()>=3,"status was actually polled");
  app.player.destroy();
 });
}
test("a pending first name survives a manual status refresh before joining",async()=>{
 const app=harness("jack",false);
 await tick();await tick();
 const name=app.find("input");
 assert.ok(name);
 name.value="Adam";
 name.handlers.input();
 await app.refresh();
 assert.equal(app.find("input"),name);
 assert.equal(name.value,"Adam");
 app.player.destroy();
});
