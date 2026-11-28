// Isolated fixed-input synthetic QA. Never runs on production or public custom domains.
import {buildStorybook44,writeStorybookPage44,closeStorybook44} from "./jj44-storybook.mjs";
import {storybookGenerator44} from "./jj4-core.mjs";
export const config={maxDuration:300};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
const episode={title:"The Great Microwave Disaster",premise:"Jack has delayed repairing the broken microwave for three weekends. Jill is frustrated but wants to work together. They have $180 available for a replacement.",sceneSetting:"Their kitchen on Monday evening",primarySkill:"shared decision-making",jackMotivation:"Wants to follow through without feeling managed.",jillMotivation:"Wants reliable partnership and time together.",tone:"Playful adult romantic comedy",humorNotes:"Situational humor and specific running gags, not insults.",...buildStorybook44({},{fastForward:true,director:true})};
const advice=[
 ["Jack needs to make a concrete plan to fix or replace the microwave.","Ask him directly if she can expect it to be handled by Saturday."],
 ["If a friend invites him out, have him consider asking to delay another weekend, but listen to Jill.","Jill should directly explain why another delay would bother her."],
 ["Jack should put his commitment first and tell his friend no if there is a conflict.","Suggest buying a new microwave if affordable within their budget."],
 ["Have Jack arrange safe installation and buy popcorn, not just promise it.","Have Jill plan a romantic movie night together and wear something special."],
 ["Both should discuss their financial expectations and follow-through tonight.","Jill should appreciate his effort and honestly discuss what she needs next time."]
];
export default {async fetch(request){
 const u=new URL(request.url);
 if(request.method!=="GET"||process.env.VERCEL_ENV!=="preview"||u.hostname!==process.env.VERCEL_URL||!u.hostname.endsWith(".vercel.app")||Date.now()>Date.parse("2026-11-29T00:00:00Z"))return json({error:"disabled"},404);
 if(!process.env.OPENAI_API_KEY)return json({ok:false,error:"Preview has no configured OpenAI key."},503);
 const rows=[],pages=[],calls=[];let day=0;
 const gen=storybookGenerator44();
 const traced=async args=>{const start=Date.now();try{const out=await gen(args);calls.push({stage:args.name,day,ms:Date.now()-start,output:out});return out}catch(e){calls.push({stage:args.name,day,ms:Date.now()-start,error:String(e.message).slice(0,160)});throw e}};
 try{
  for(day=0;day<6;day++){
   const page=await writeStorybookPage44(episode,day,rows,traced);pages.push(page);rows.push({role:"shared",kind:"scene",phase_index:day,body:JSON.stringify(page)});
   if(day<5)for(const [i,role] of ["jack","jill"].entries())rows.push({role,kind:"coach",phase_index:day,body:advice[day][i]});
  }
  const closure=await closeStorybook44(episode,rows,traced);
  return json({ok:true,mode:"real-provider-fictional-no-storage-no-SMS",pages,closure,calls,advice});
 }catch(e){return json({ok:false,mode:"real-provider-fictional-no-storage-no-SMS",day,pages,calls,error:String(e.message).slice(0,200)},502)}
}};
