import test from "node:test";
import assert from "node:assert/strict";
import {scopeOpening44,planIssues44,directorReviewIssues44} from "../api/jj44-director.mjs";
import {buildStorybook44,writeStorybookPage44,closeStorybook44} from "../api/jj44-storybook.mjs";
const ep={title:"Synthetic microwave chapter",premise:"This is one uninterrupted evening with one purchase, not a recurring arrival.",creativeDirection:"Stage six continuous developments in one kitchen.",...buildStorybook44({}, {fastForward:true,director:true})};
const prose=[
 "Jack looked at the broken microwave. Jill held the new appliance receipt. They agreed to compare options before making another purchase.",
 "Jack called a repair shop. Jill checked the receipt and found a return deadline. They discovered that waiting another week would cost them the refund.",
 "Jack called Dave to decline the game. Jill booked an appliance technician. The couple had time for a walk together before the appointment.",
 "The technician installed the new microwave. Jack carried the old unit outside. Jill thanked him for following through and suggested making popcorn.",
 "Jill set out two bowls of popcorn. Jack invited her to choose the film. They laughed about the old microwave and enjoyed a quiet evening together.",
 "Jack suggested discussing spending over coffee. Jill proposed a purchase limit. They agreed to consult each other before spending over that amount."
];
const page=day=>({title:"Page "+day,story:prose[day],sophia:"A concrete choice changes the next moment.",jackPrompt:day<5?"What should Jack do next?":"",jillPrompt:day<5?"What should Jill do next?":"",events:["A new event occurred."],openThreads:day<5?["Next decision remains."]:[],artBrief:"Watercolor of the characters in this scene.",takeaway:"Shared decisions become visible through actions."});
const plan=day=>({jack:day?[{id:"jack-1",intention:"Choose an action",action:"Jack makes the choice."}]:[],jill:day?[{id:"jill-1",intention:"Suggest a plan",action:"Jill makes a choice."}]:[],time:"Evening "+day,location:"Home",newEvent:"A new event",consequence:"New decision",ending:"A concrete next step"});
const review=(day,p)=>({pass:true,issues:[],jack:day?[{id:"jack-1",disposition:"incorporated",quote:p.story.split(". ")[0]}]:[],jill:day?[{id:"jill-1",disposition:"adapted",quote:p.story.split(". ")[1]}]:[],newEventQuote:p.story.split(". ")[0],world:{time:"Evening "+day,location:"Home",change:"They made a new choice.",commitments:"Follow through."},endingQuote:day===5?p.story.split(". ").at(-1):""});
test("legacy opening restrictions are scoped without destroying source facts",()=>{
 const scoped=scopeOpening44({premise:ep.premise,creativeDirection:ep.creativeDirection});
 assert.match(scoped.premise,/purchase and arrival occur once/);
 assert.match(scoped.creativeDirection,/later scenes may move/);
 assert.match(ep.premise,/uninterrupted/);
});
test("director validation rejects missing intentions, ignored advice and fabricated evidence",()=>{
 const p=page(1),d=plan(1),r=review(1,p);
 assert.deepEqual(planIssues44(d,1),[]);
 assert.ok(planIssues44({...d,jill:[]},1).length);
 assert.deepEqual(directorReviewIssues44(r,d,p,1),[]);
 assert.ok(directorReviewIssues44({...r,jill:[{...r.jill[0],disposition:"ignored"}]},d,p,1).length);
 assert.ok(directorReviewIssues44({...r,jack:[{...r.jack[0],quote:"Invented dialogue not in the published story."}]},d,p,1).length);
 assert.ok(directorReviewIssues44({...r,endingQuote:""},d,p,5).length);
});
test("six directed pages preserve world state and reject missing contribution evidence before commit",async()=>{
 const rows=[];let rejected=false;
 for(let day=0;day<6;day++){
  const result=await writeStorybookPage44(ep,day,rows,async args=>{
   if(args.name==="jj44_director"){assert.match(args.input.editorial.premise,/later scenes may progress/);assert.equal(args.input.pages.length,day);return plan(day)}
   if(args.name==="jj44_storyboard"){assert.equal(args.input.direction.newEvent,"A new event");if(day)assert.equal(args.input.storyWorld.length,day);return page(day)}
   assert.equal(args.name,"jj44_editor");const r=review(day,args.input.candidate);
   if(day===3&&!rejected){rejected=true;return {...r,jill:[]}}
   return r;
  });
  assert.equal(result.director.w[0],"Evening "+day);
  assert.equal(result.director.j,day?"I":"");
  assert.equal(result.director.l,day?"A":"");
  assert.ok(JSON.stringify(result).length<=2500);
  rows.push({role:"shared",kind:"scene",phase_index:day,body:JSON.stringify(result)});
  if(day<5)for(const role of ["jack","jill"])rows.push({role,kind:"coach",phase_index:day,body:"Choose the next action."});
 }
 assert.equal(rejected,true);
 const closure=await closeStorybook44(ep,rows,async()=>({reflection:"They made choices and followed through on a shared plan.",question:"What could you decide together next week?"}));
 assert.match(closure,/decide together/);
});
