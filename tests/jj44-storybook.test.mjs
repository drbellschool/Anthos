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

import {createRoom} from "../api/jj4-core.mjs";
test("4.4 launches a shared episode with a primary skill and premise but no six scripted phase summaries",async()=>{
 const id="99000000-0000-4000-8000-000000000001";
 const scenario={id,title:"What Makes Us Feel Close",mode:"shared",opening_scene:"Jack and Jill have different ideas about what makes an evening together feel meaningful.",learning_objective:"Recognize invitations for connection.",episode_studio:{primarySkill:"g-bids",premise:"Jack and Jill have different ideas about what makes an evening together feel meaningful.",phases:{}}};
 const oldFetch=globalThis.fetch,oldKey=process.env.SUPABASE_SECRET_KEY,oldAI=process.env.OPENAI_API_KEY;
 let created=0,participants=0;
 globalThis.fetch=async(input,options={})=>{
  const path=new URL(String(input)).pathname;
  const json=x=>new Response(JSON.stringify(x));
  if(path.endsWith("/anthos_jj2_scenarios"))return json([scenario]);
  if(path.endsWith("/bucket/anthos-jj44-art"))return json({public:false});
  if(path.endsWith("/anthos_jj4_rooms")&&options.method==="POST"){
   const body=JSON.parse(options.body);assert.equal(body.episode.storybook44.version,"4.4.0");assert.equal(body.episode.primarySkill,"g-bids");created++;return json([{id,expires_at:"2099-01-01T00:00:00Z"}]);
  }
  if(path.endsWith("/anthos_jj4_participants")&&options.method==="POST"){participants++;return json([])}
  throw Error("Unexpected route "+path);
 };
 process.env.SUPABASE_SECRET_KEY="synthetic-only";process.env.OPENAI_API_KEY="synthetic-only";
 try{
  const result=await createRoom("https://anthos.test",id,null,"4.4.0",{fastForward:true});
  assert.equal(result.engine,"4.4.0");assert.equal(created,1);assert.equal(participants,2);
  await assert.rejects(createRoom("https://anthos.test",id,null,"4.0.0"),/opening introduction|six phase summaries/);
  scenario.episode_studio.primarySkill="";
  await assert.rejects(createRoom("https://anthos.test",id,null,"4.4.0"),/primary relationship objective/);
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;if(oldAI===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldAI;}
});

test("Monday is an opening with no coaching; exact shape errors and candidate drive a corrective retry",async()=>{
 let attempts=0,reviewed=0;
 const long={...page(0),artBrief:"A".repeat(251),events:["One","Two","Three","Four","Five"]};
 const result=await writeStorybookPage44(episode,0,[],async args=>{
  if(args.name==="jj44_storyboard"){
   attempts++;assert.match(args.instructions,/no prior pages or coach contributions/);
   assert.deepEqual(args.input.contributions,{});
   assert.match(args.input.formatRules,/2500 characters/);
   if(attempts===1)return long;
   assert.deepEqual(args.input.previousCandidate,long);
   assert.ok(args.input.revisionIssues.some(s=>s.includes("artBrief")));
   assert.ok(args.input.revisionIssues.some(s=>s.includes("events")));
   return page(0);
  }
  reviewed++;assert.match(args.instructions,/Do not require advice/);
  assert.match(args.instructions,/Reject ONLY concrete material/);
  return {pass:true,issues:[]};
 });
 assert.deepEqual(result,page(0));assert.equal(attempts,2);assert.equal(reviewed,1);
});
test("editor feedback revises the same draft, not an unrelated fresh start",async()=>{
 let attempts=0,reviews=0;
 const first=page(0),second={...first,title:"Revised opening"};
 const result=await writeStorybookPage44(episode,0,[],async args=>{
  if(args.name==="jj44_storyboard"){
   attempts++;if(attempts===1)return first;
   assert.deepEqual(args.input.previousCandidate,first);
   assert.deepEqual(args.input.revisionIssues,["Clarify the appliance location."]);return second;
  }
  reviews++;return reviews===1?{pass:false,issues:["Clarify the appliance location."]}:{pass:true,issues:[]};
 });
 assert.deepEqual(result,second);assert.equal(attempts,2);
});
