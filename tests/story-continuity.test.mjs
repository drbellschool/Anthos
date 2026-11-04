import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {applyStoryBranch,chapterAsMessages} from "../api/pilot-core.mjs";

const canonical={
 title:"Who Knew Before Jill?",
 story:"Jack's phone lights up. Maya has invited Owen to arrive at eight.",
 prompt:"What should Jack tell Jill about the friends?",
 options:["Own up to the invitation","Ask Jill what she wants","Talk to the friends first"]
};
test("new branching package changes both dramatic scene AND current choices",()=>{
 const choice={
  story:"Jack's phone lights up. Maya asks if Owen is still bringing the camera. Jill sees the text, and realizes friends already knew their Saturday plans. Jack is suddenly speechless.",
  prompt:"Jill asks why everyone knew about Saturday before she did. What should Jack do?",
  options:[
   "Admit that he made the invitation without checking with Jill.",
   "Ask for two minutes alone to explain what he intended.",
   "Offer to message Maya and Owen together before deciding."
  ]
 };
 const branch=applyStoryBranch(canonical,JSON.stringify(choice));
 assert.equal(branch.title,canonical.title);
 assert.equal(branch.story,choice.story);
 assert.equal(branch.prompt,choice.prompt);
 assert.deepEqual(branch.options,choice.options);
 const delivered=chapterAsMessages(branch,2,8);
 assert.match(delivered.at(-1).body,/Jill asks why everyone knew/);
 assert.deepEqual(delivered.at(-1).options,choice.options);
 assert.doesNotMatch(delivered.at(-1).body,/What should Jack tell Jill about the friends/);
});
test("legacy text branches remain readable, without changing prior decisions",()=>{
 const branch=applyStoryBranch(canonical,"Legacy scene: Jack asks Jill about Maya.");
 assert.match(branch.story,/Legacy scene/);
 assert.deepEqual(branch.options,canonical.options);
 assert.equal(branch.prompt,canonical.prompt);
});
test("malformed future branches fail closed to a complete authored scene",()=>{
 const incomplete=JSON.stringify({story:"a".repeat(80),prompt:"What now?",options:["A"]});
 assert.equal(applyStoryBranch(canonical,incomplete),canonical);
 assert.equal(applyStoryBranch(canonical,""),canonical);
});
test("model requests one cohesive next scene, question, and three choices with canonical reveal",()=>{
 const core=readFileSync(new URL("../api/pilot-core.mjs",import.meta.url),"utf8");
 assert.match(core,/next_scene:\{type:"object",additionalProperties:false/);
 assert.match(core,/options:\{type:"array",items:\{type:"string"\}\}/);
 assert.match(core,/next_scene:packagedScene\?JSON\.stringify\(packagedScene\):null/);
 assert.match(core,/const canonicalReveal=chapter\+1===2/);
 assert.match(core,/\/maya\/i\.test\(proposed\.story\)/);
 assert.match(core,/Do not spoil the NEXT chapter/);
 assert.match(core,/Never put actual user names into Jack\/Jill/);
 assert.match(core,/excerpt=branch\.options\[index\]/);
});
