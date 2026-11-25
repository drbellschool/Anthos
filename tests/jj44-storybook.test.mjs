import test from "node:test";
import assert from "node:assert/strict";
import {buildStorybook44,dueStorybook44,history44,validatePage44,writeStorybookPage44,closeStorybook44} from "../api/jj44-storybook.mjs";
const episode={title:"Fictional test chapter",...buildStorybook44({}, {fastForward:true,now:new Date("2026-11-24T18:00:00Z")})};
const page=(day=0)=>({title:"A morning disagreement",story:"Jack sat down at the kitchen table and asked Jill about the broken appliance. She explained that the delay had bothered her. They agreed to consider their options.",sophia:"Notice how they raised the practical concern.",jackPrompt:day<5?"What should Jack suggest doing next?":"",jillPrompt:day<5?"How should Jill respond to his suggestion?":"",events:["Jack and Jill discussed the broken appliance."],openThreads:["They have not decided on a solution."],artBrief:"Watercolor scene of Jack and Jill at a kitchen table, no lettering."});
const row=i=>({role:"shared",kind:"scene",phase_index:i,body:JSON.stringify(page(i))});
const coach=(role,phase_index,body)=>({role,kind:"coach",phase_index,body});
test("seven-day schedule and both-spouse checkpoints",()=>{
 const config=buildStorybook44({}, {now:new Date("2026-11-24T18:00:00Z")});
 assert.equal(config.storybook44.schedule.length,7);
 assert.ok(config.checkpoints.every(c=>c.audience==="both"&&c.waitForReply));
 assert.equal(dueStorybook44(config,0,Date.parse(config.storybook44.schedule[0])-1),false);
 assert.equal(dueStorybook44(config,6,Date.parse(config.storybook44.schedule[6])),true);
 assert.equal(dueStorybook44(episode,6,0),true);
});
test("story generation cannot proceed with one missing contribution",()=>{
 assert.throws(()=>history44([row(0),coach("jack",0,"Discuss the cost.")],1),/Both contributions/);
 assert.throws(()=>history44([row(0),row(0)],1),/Missing or invalid/);
});
test("bounded page validation and Saturday final page",()=>{
 assert.equal(validatePage44(page(),0),true);
 assert.equal(validatePage44({...page(),story:"too short"},0),false);
 assert.equal(validatePage44(page(),5),false);
 assert.equal(validatePage44(page(5),5),true);
});
test("both inputs reach author; editor rejection forces retry",async()=>{
 const rows=[row(0),coach("jack",0,"Discuss the cost."),coach("jill",0,"Suggest a replacement.")];
 let reviews=0,authors=0;
 const result=await writeStorybookPage44(episode,1,rows,async args=>{
  assert.deepEqual(args.input.contributions,{jack:"Discuss the cost.",jill:"Suggest a replacement."});
  if(args.name==="jj44_storyboard"){authors++;return page(1)}
  reviews++;return reviews===1?{pass:false,issues:["Check the budget."]}:{pass:true,issues:[]};
 });
 assert.deepEqual(result,page(1));assert.equal(authors,2);assert.equal(reviews,2);
});
test("failed reviews never return a page",async()=>{
 await assert.rejects(writeStorybookPage44(episode,0,[],async args=>args.name==="jj44_storyboard"?page():{pass:false,issues:["Contradiction"]}),/did not pass/);
});
test("Sunday requires six committed story pages",async()=>{
 await assert.rejects(closeStorybook44(episode,[row(0)],async()=>({})),/Missing or invalid/);
 const final=await closeStorybook44(episode,Array.from({length:6},(_,i)=>row(i)),async()=>({reflection:"They discussed the issue openly during the chapter.",question:"What did you notice in their conversation?"}));
 assert.match(final,/What did you notice/);
});
