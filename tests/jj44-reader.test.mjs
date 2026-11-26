import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
const code=readFileSync(new URL("../pilot-v4/player.js",import.meta.url),"utf8");
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.textContent="";this.className="";this.attributes={};this.value="";this.isConnected=true;this.classList={add:c=>{this.className+=" "+c},toggle:()=>{}}}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(k,v){this.attributes[k]=v}
 removeAttribute(k){delete this.attributes[k]}
}
const all=(node,fn)=>[...(fn(node)?[node]:[]),...node.children.flatMap(x=>all(x,fn))];
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r))};
test("shared reader automatically illustrates one page and sends independent contributions with their own tokens",async()=>{
 const root=new Node("main"),timers=[],actions=[];let art="missing",phase=0;const submitted=new Set();
 const getState=role=>({ok:true,version:"4.4.0",role,character:role==="jack"?"Jack":"Jill",firstName:role==="jack"?"Alex":"Sam",joined:true,bothJoined:true,title:"The microwave",phaseIndex:phase,stage:submitted.size===2?"flow":"awaiting",needsReply:!submitted.has(role),submitted:submitted.has(role),canContinue:submitted.size===2,hasSophia:false,finished:false,pausedBy:[],waitingFor:["jack","jill"].filter(x=>!submitted.has(x)),scenes:[{id:1,kind:"scene",phase_index:phase,storyTitle:"A little surprise",storyText:"Jack and Jill see a broken microwave.",sophiaText:"Well, this is a surprise!",artState:art}],messages:[{id:role,kind:"prompt",phase_index:phase,body:"What should "+(role==="jack"?"Jack":"Jill")+" do next?"}]});
 const win={};vm.runInNewContext(code,{window:win,document:{createElement:t=>new Node(t)},crypto:{randomUUID},URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},setInterval:()=>1,clearInterval(){},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},fetch:async(url,opts)=>{
  const role=opts.headers["x-anthos-v4-invite"];
  if(url.includes("artDay"))return {ok:true,headers:{get:()=>"image/jpeg"},blob:async()=>({})};
  if(opts.method==="POST"){const p=JSON.parse(opts.body);actions.push({role,...p});if(p.action==="illustrate")art="ready";if(p.action==="coach")submitted.add(role);if(p.action==="advance"){phase++;submitted.clear();art="missing"}}
  return {ok:true,json:async()=>getState(role)};
 }});
 const reader=win.Anthos4Player.mount(root,"jack",{secondInvite:"jill"});await flush();
 assert.equal(all(root,x=>x.className==="jj44-sheet").length,1);
 assert.equal(timers.length,1);timers.shift()();await flush();
 assert.deepEqual(actions.map(x=>x.action),["illustrate"]);
 const fields=all(root,x=>x.tag==="textarea"),buttons=all(root,x=>x.tag==="button"&&x.textContent==="Contribute to the next page");
 assert.equal(fields.length,2);assert.equal(buttons.length,2);
 fields[0].value="Keep his promise";fields[0].oninput();fields[1].value="Suggest another solution";fields[1].oninput();
 await reader.refresh();assert.equal(all(root,x=>x.tag==="textarea")[1].value,"Suggest another solution");
 buttons[0].onclick();await flush();
 assert.equal(actions[1].role,"jack");assert.equal(actions[1].message,"Keep his promise");
 const remaining=all(root,x=>x.tag==="textarea");assert.equal(remaining.length,1);assert.equal(remaining[0].value,"Suggest another solution");
 all(root,x=>x.tag==="button"&&x.textContent==="Contribute to the next page")[0].onclick();await flush();
 assert.equal(actions[2].role,"jill");assert.equal(actions[2].message,"Suggest another solution");
 assert.equal(actions[2].phaseIndex,0);assert.equal(timers.length,1);
 timers.shift()();await flush();assert.equal(actions[3].action,"advance");reader.destroy();
});
