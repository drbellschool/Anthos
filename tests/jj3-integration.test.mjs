import test from "node:test";
import assert from "node:assert/strict";
import {createHash,randomUUID} from "node:crypto";
import {status,join,begin,talk,choose,submit,progress,reflect,createRoom} from "../api/jj3-core.mjs";
import {ENGINE_VERSION,initialEvolution,validEvolution} from "../api/jj-evolution.mjs";

const rid="11111111-1111-4111-8111-111111111111";
const sid="a718d5e5-31bd-4bfa-9aa6-1712505015d1";
const tokens={jack:"j".repeat(43),jill:"l".repeat(43)};
const hash=s=>createHash("sha256").update(s).digest("hex");
const scenario={id:sid,title:"One of Us Loves Mountains",petal_slug:"adventure-play",mode:"shared",
 opening_scene:"Jack has packed hiking gear. Jill has brought her books. Both want a different weekend in the same cabin.",
 learning_objective:"Respect the distinct needs for rest and adventure.",research_lenses:["gottman","schnarch","aron"]};

function harness(mode="shared",{invalidFirst=false,evolving=false,autoplay=false}={}){
 let room={id:rid,title:scenario.title,scenario_id:sid,petal_slug:"adventure-play",mode,
  status:"active",step:1,autoplay,scene:{scene:scenario.opening_scene,tension:scenario.learning_objective},
  ...(evolving?{engine_version:ENGINE_VERSION,evolution_state:initialEvolution(scenario)}:{}),
  processing_token:null,processing_at:null,expires_at:"2099-01-01"};
 const people=[{id:"22222222-2222-4222-8222-222222222222",room_id:rid,role:"jack",token_hash:hash(tokens.jack),
    name:null,consented_at:null,pending_step:null,pending_action:null,submitted_step:null,submitted_action:null,
    private_memory:{},learning_log:{},reflection:null},
  {id:"33333333-3333-4333-8333-333333333333",room_id:rid,role:"jill",token_hash:hash(tokens.jill),
    name:null,consented_at:null,pending_step:null,pending_action:null,submitted_step:null,submitted_action:null,
    private_memory:{},learning_log:{},reflection:null}];
 if(mode==="individual")people.pop();
 const messages=[],evolutionEvents=[];let next=0,aiCalls=0,badReturned=false;
 const oldFetch=globalThis.fetch,oldSecret=process.env.SUPABASE_SERVICE_ROLE_KEY,oldAI=process.env.OPENAI_API_KEY;
 process.env.SUPABASE_SERVICE_ROLE_KEY="fake-service-test";
 process.env.OPENAI_API_KEY="fake-ai-test";
 function out(v,code=200){return new Response(JSON.stringify(v),{status:code,headers:{"Content-Type":"application/json"}})}
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url),method=options.method||"GET",body=options.body?JSON.parse(options.body):null;
  if(u.hostname==="api.openai.com"){
   assert.equal(body.model,"gpt-6-luna","Deep Dive calls use GPT-6 Luna, not OPENAI_MODEL");
   assert.equal(body.reasoning?.effort,
     ["jj_evolution_outcome","jj_evolution_finale","jj3_story_outcome"].includes(body.text?.format?.name)?"high":"medium");
   assert.equal(body.text?.format?.type,"json_schema");
   aiCalls++;
   const input=JSON.parse(body.input);
   const type=body.text?.format?.name;
   if(invalidFirst&&!badReturned&&type==="jj3_character_reply"){
     badReturned=true;
     return out({status:"incomplete",output:[]});
   }
   const evolutionMock=()=>{
    const beat=input.step;
    const issue=[
      "The surprise kayak tickets are for a race rather than a peaceful lake trip",
      "The festival organizer has posted their muddy photo on the main stage",
      "A sudden family invitation asks them to split a holiday afternoon",
      "An unexpected storm strands their rented bicycles far from the cabin",
      "The couple must tell their friends what they learned without hiding disagreements"
    ][beat-1];
    const outcome="Jack moves toward the map and notices their plans have changed again. "+
      "Jill checks the lake schedule and considers whether she is ignoring her own wishes. "+
      "They tried their own approaches, discovered something surprising, and now have to manage the consequences together. "+
      "A funny mishap with a rental sign makes them laugh, but an unresolved question remains before dinner.";
    const effect=(role)=>({
      connection:role==="jack"?1:2,agency:role==="jack"?1:-1,trust:1,energy:-1,friction:1,curiosity:1,
      evidence:role==="jack"?"Jack moves toward the map and notices their plans have changed again":
       "Jill checks the lake schedule and considers whether she is ignoring her own wishes",
      immediateGain:role==="jack"?"Jack enjoys being heard while trying a different plan":
       "Jill discovers that she can genuinely enjoy unexpected adventure",
      delayedCost:role==="jack"?"Jack realizes that some plans cost extra time and effort":
       "Jill is tired and has spent less time on herself than she wanted",
      newWant:role==="jack"?"Jack wants a weekend shaped by what they have actually learned":
       "Jill wants to share another experience without losing her voice",
      beliefShift:role==="jack"?"Jack sees that a shared weekend can be surprising":
       "Jill recognizes both the joy and strain of trying something new"
    });
    return {outcome,nextScene:beat===5
     ?"At the end of their weekend Jack and Jill sit together on the porch and laugh about the problems they faced. They have a quiet goodbye to the cabin, knowing their relationship is still theirs to work on."
     :"At the lake, "+issue+
       ". Jack and Jill now have a concrete new choice to make, and neither can simply repeat the original plan.",
      location:"The lakeside festival",tension:"A new external problem forces a meaningful response",
      facts:[issue,"Both characters now face a new decision"],researchNote:"The prior choice has a benefit and a cost.",
      newDilemma:beat===5?"":issue,relationshipConnection:1,relationshipTrust:1,
      unresolvedThread:"The couple still have different needs, but discovered something worth building on",
      impacts:{jack:effect("jack"),jill:effect("jill")},
      ...(beat===5?{closing:{
       jackChange:"Jack learned that making room for quiet time does not mean giving up his adventurous identity.",
       jillChange:"Jill discovered she could enjoy new experiences while still expressing her need for genuine rest.",
       relationshipTruth:"They shared a better weekend than either had planned, but still need to keep noticing each other's needs.",
       sophiaInsight:"Their progress came from responding to small opportunities for connection, not from winning the original argument. They can keep practicing that attention in ordinary moments.",
       invitation:"Consider asking your partner which part of this week they would most enjoy sharing with you."
      }}:{})};
   };
   const authorized=/go make a plan|give it a try/i.test(input.latest||"");
   const uncertainWeather=(input.latest||"").includes("What do you think about the wind?");
   const characterName=input.character||"Jack";
   const authorizedReply=characterName==="Jack"
    ?"Okay, I'm gonna ask Jill what kind of weekend she wants, then suggest a hike that works for both of us."
    :"I'm gonna ask Jack what his backup plan is, then we can figure out what actually sounds fun.";
   const reply=type==="jj3_coach_move"?{
      action:input.character==="Jack"
       ?"Jack puts the tape aside, ignores the timer, and invites Jill to finish explaining the rules before they do anything else."
       :"Jill chooses to stop fixing the duck and lets the contraption fail, making her point that she deserves to be heard."
    }:type==="jj3_autoplay_moves"?{
      jack:"Jack tries a surprising hands-on response to the next situation and risks looking foolish while making space for Jill.",
      jill:"Jill takes initiative with the new problem, keeping her own voice and allowing the consequences to unfold with Jack."
    }:(type==="jj_evolution_outcome"||type==="jj_evolution_finale")?evolutionMock():type==="jj3_story_outcome"?
      {outcome:"Jack starts toward his mountain, and Jill heads for the reading terrace. Both have chosen independently, so their morning becomes funny and complicated. A ranger announces the ridge has closed while a festival starts on the lakeshore, setting up an unexpected reunion later in the day.",
       nextScene:"The ridge is closed by fog. The once-quiet reading terrace is now filled with festival musicians and someone dressed as an inflatable moose. Jack and Jill each need a fresh plan before lunchtime.",
       location:"Lakeside pavilion",tension:"Both original plans are disrupted",facts:["The ridge closed","The lake festival began"],researchNote:"Different needs can coexist."}
    :{characterReply:uncertainWeather?
       "I think I'll ask Jack what his backup plan is if the windstorm gets worse. I want to stay flexible, not just sit here worrying about it.":
       authorized?authorizedReply:type==="jj3_intro"?"Buddy, that happened so fast. I'm worried Jill thinks I only care about hiking. I have a ridiculous plan, but I'm not sure I should say it out loud. Can you help me think through it?":
       /^(?:yes|yep|sure|go ahead|do that)/i.test(input.latest||"")?
       "Okay, I'm going to text Jill and ask whether she'd like a quiet evening together. I'm nervous I'll sound like I've been replaced by a suspiciously considerate stranger.":
       "Oh, that's a real suggestion in round "+aiCalls+". I want to try that, but I'm nervous I'll come off as selfish. Part of me wants adventure and part of me wants Jill to feel heard. I might even apologize to the inflatable moose if this gets any stranger.",
      sophiaAside:"",action:"",evidence:"",
      characterProposal:/^(?:yes|yep|sure|go ahead|do that)/i.test(input.latest||"")?
        "Jack texts Jill and asks whether she'd like a quiet evening together.":"",
      proposalEvidence:/^(?:yes|yep|sure|go ahead|do that)/i.test(input.latest||"")?
        "I'm going to text Jill and ask whether she'd like a quiet evening together.":"",
      privateMemory:"Still afraid to seem unadventurous.",
      learningMilestones:["Recognize"]};
   return out({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(reply)}]}]});
  }
  const path=u.pathname,qs=u.searchParams;
  if(path.endsWith("/rpc/anthos_jj3_commit_coach_move")){
   const p=people.find(x=>x.id===body.p_participant);
   if(!room.autoplay||room.step!==1||!p||p.submitted_step===1||
    messages.some(m=>m.role===p.role&&m.kind==="coach"&&m.step===1))return out(false);
   messages.push({id:++next,room_id:rid,role:p.role,author:"coach",kind:"coach",step:1,
    body:body.p_user,request_key:body.p_key});
   p.pending_step=1;p.pending_action=body.p_action;p.submitted_step=1;p.submitted_action=body.p_action;
   return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_autoplay_moves")){
   if(!room.autoplay||room.step!==body.p_step||room.step<2||room.status!=="active"||
    room.processing_token||people.some(p=>p.submitted_step===room.step))return out(false);
   for(const p of people){
    const action=p.role==="jack"?body.p_jack:body.p_jill;
    p.pending_step=room.step;p.pending_action=action;p.submitted_step=room.step;p.submitted_action=action;
   }
   return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_write_turn")){
   const p=people.find(x=>x.id===body.p_participant);
   if(!p||room.step!==body.p_step||room.status!=="active"||p.submitted_step===room.step)return out(false);
   if(messages.some(x=>x.kind==="coach"&&x.role===p.role&&x.request_key===body.p_key))return out(true);
   messages.push({id:++next,room_id:rid,role:p.role,author:"coach",kind:"coach",step:room.step,body:body.p_user,request_key:body.p_key});
   messages.push({id:++next,room_id:rid,role:p.role,author:"character",kind:"reply",step:room.step,body:body.p_character});
   if(body.p_aside)messages.push({id:++next,room_id:rid,role:p.role,author:"sophia",kind:"aside",step:room.step,body:body.p_aside});
   if(body.p_action){p.pending_step=room.step;p.pending_action=body.p_action}
   p.private_memory=body.p_memory;p.learning_log=body.p_learning;
   return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_set_choice")){
   const p=people.find(x=>x.id===body.p_participant);
   if(!p||room.step!==body.p_step||room.status!=="active"||p.submitted_step===room.step)return out(false);
   p.pending_step=body.p_step;p.pending_action=body.p_action;return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_submit")){
   const p=people.find(x=>x.id===body.p_participant);
   if(!p||room.step!==body.p_step||p.pending_step!==room.step)return out(false);
   p.submitted_step=room.step;p.submitted_action=p.pending_action;return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_claim")){
   if(room.step!==body.p_step||room.status!=="active"||room.processing_token)return out(false);
   if(people.some(p=>p.submitted_step!==room.step||!p.submitted_action))return out(false);
   room.processing_token=body.p_token;room.processing_at=new Date().toISOString();return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_publish")){
   if(room.step!==body.p_step||room.processing_token!==body.p_token)return out(false);
   messages.push({id:++next,room_id:rid,role:"shared",author:"story",kind:"outcome",step:room.step,body:body.p_outcome});
   room.scene=body.p_scene;room.step=Math.min(5,room.step+1);room.status=body.p_step>=5?"complete":"active";
   room.processing_token=null;room.processing_at=null;return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_publish_evolution")){
   if(room.step!==body.p_step||room.processing_token!==body.p_token||
      room.engine_version!==ENGINE_VERSION||!validEvolution(body.p_evolution)||
      evolutionEvents.some(e=>e.step===body.p_step))return out(false);
   evolutionEvents.push({step:body.p_step,before:room.evolution_state,after:body.p_evolution,
     effects:body.p_effects});
   messages.push({id:++next,room_id:rid,role:"shared",author:"story",kind:"outcome",step:room.step,body:body.p_outcome});
   room.scene=body.p_scene;room.evolution_state=body.p_evolution;
   room.step=Math.min(5,room.step+1);room.status=body.p_step>=5?"complete":"active";
   room.processing_token=null;room.processing_at=null;return out(true);
  }
  if(path.endsWith("/rpc/anthos_jj3_release")){room.processing_token=null;return out(true)}
  let rows=path.endsWith("/anthos_jj3_rooms")?[room]:path.endsWith("/anthos_jj3_participants")?people:
    path.endsWith("/anthos_jj3_messages")?messages:path.endsWith("/anthos_jj2_scenarios")?[scenario]:[];
  const filter=[...qs].filter(([k])=>!["select","limit","order"].includes(k));
  const filtered=rows.filter(x=>filter.every(([k,v])=>{
   if(v==="is.null")return x[k]===null||x[k]===undefined;
   if(v.startsWith("eq."))return String(x[k])===v.slice(3);
   if(v.startsWith("neq."))return String(x[k])!==v.slice(4);
   return true;
  }));
  if(method==="GET")return out(filtered.map(x=>({...x})));
  if(method==="PATCH"){
   for(const x of filtered)Object.assign(x,body);
   return out(filtered.map(x=>({...x})));
  }
  if(method==="POST"){
   const records=Array.isArray(body)?body:[body];
   const added=records.map(b=>({...b,id:++next}));
   if(path.endsWith("/anthos_jj3_messages"))messages.push(...added);
   else if(path.endsWith("/anthos_jj3_participants"))people.push(...added);
   else if(path.endsWith("/anthos_jj3_rooms")){room={...added[0],id:rid,step:1,status:"active",expires_at:"2099-01-01"};return out([room])}
   return out(added);
  }
  if(method==="DELETE")return out(filtered);
  return out({error:"Unexpected mock route "+method+" "+path},500);
 };
 return {get people(){return people},get room(){return room},get messages(){return messages},get aiCalls(){return aiCalls},get events(){return evolutionEvents},
  restore(){globalThis.fetch=oldFetch;if(oldSecret===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldSecret;
    if(oldAI===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldAI;}};
}
test("3.0 private character conversation is distinct, with genuine character introductions",async()=>{
 const h=harness();
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  const jack=await begin(tokens.jack),jill=await begin(tokens.jill);
  assert.match(jack.messages[0].body,/Okay, buddy/i);
  assert.match(jill.messages[0].body,/Can I confess/i);
  assert.equal(jack.messages[0].author,"character");
  assert.equal(jill.messages[0].author,"character");
  assert.notEqual(jack.messages[0].body,jill.messages[0].body);
  assert.equal((await status(tokens.jill)).messages.some(x=>x.body.includes("Okay, buddy")),false);
  assert.equal((await begin(tokens.jack)).messages.length,1,"Repeat introduction must not duplicate.");
 }finally{h.restore()}
});
test("3.0 imperfect Jack decision remains his exact choice and doesn't need Sophia approval",async()=>{
 const h=harness();
 try{
  await join(tokens.jack,"Adam");await begin(tokens.jack);
  const suggestion="Jack needs to tell Jill he wants the mountain hike even if it seems selfish.";
  const result=await talk(tokens.jack,suggestion,randomUUID());
  assert.equal(result.action,suggestion);
  assert.equal(result.messages.at(-1).author,"character");
  const second=await talk(tokens.jack,"No, Jill needs to support Jack.",randomUUID());
  assert.equal(second.action,suggestion,"Jill-only instruction can't replace Jack's move");
  assert.equal(h.room.step,1);
 }finally{h.restore()}
});
test("3.0 malformed AI output retries without losing the user turn or inventing a canned response",async()=>{
 const h=harness("shared",{invalidFirst:true});
 try{
  await join(tokens.jack,"Adam");await begin(tokens.jack);
  const message="Jack should go hiking on his own and invite Jill to meet at lunch.";
  const result=await talk(tokens.jack,message,randomUUID());
  assert.equal(result.action,message);
  assert.equal(h.messages.filter(x=>x.author==="coach").length,1);
  assert.equal(h.messages.filter(x=>x.author==="character"&&x.kind==="reply").length,1);
  assert.equal(h.aiCalls,2);
 }finally{h.restore()}
});
test("3.0 two private coaches must both confirm; one shared outcome; fresh next-scene character hook",async()=>{
 const h=harness();
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  await begin(tokens.jack);await begin(tokens.jill);
  for(let step=1;step<=5;step++){
   if(step>1){assert.equal((await begin(tokens.jack)).messages.filter(m=>m.kind==="intro"&&m.step===step).length,1)}
   await talk(tokens.jack,"Jack should choose the ridge trail and stay open to meeting Jill later.",randomUUID());
   await talk(tokens.jill,"Jill should say she needs rest and suggest they meet at lunch.",randomUUID());
   await submit(tokens.jack);
   assert.equal(h.room.step,step,"Story must wait for other coach.");
   await submit(tokens.jill);
   assert.equal(h.messages.filter(m=>m.kind==="outcome").length,step);
   assert.equal(h.room.status,step===5?"complete":"active");
  }
  const a=await status(tokens.jack),b=await status(tokens.jill);
  assert.deepEqual(a.shared,b.shared);
  assert.equal(b.messages.some(m=>m.body.includes("Buddy, that happened")),false);
  assert.equal(a.status,"complete");
  const final=await reflect(tokens.jack,"I want to ask about our plans before assuming my idea wins.");
  assert.equal(final.reflectionComplete,true);
  assert.equal((await status(tokens.jill)).reflectionComplete,false);
 }finally{h.restore()}
});
test("3.0 solo scenario doesn't require fictional spouse to have a separate human coach",async()=>{
 const h=harness("individual");
 try{
  await join(tokens.jack,"Adam");await begin(tokens.jack);
  await talk(tokens.jack,"Jack should stop and admit he needs a different plan.",randomUUID());
  const result=await submit(tokens.jack);
  assert.equal(result.step,2);
  assert.equal(h.messages.filter(m=>m.kind==="outcome").length,1);
  assert.equal(h.people.length,1);
 }finally{h.restore()}
});

test("3.0 ordinary conversational advice has an always-available next-move fallback",async()=>{
 const h=harness();
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  await begin(tokens.jack);await begin(tokens.jill);
  const jack=await talk(tokens.jack,"Have you tried talking to her about a compromise? Could you relax together?",randomUUID());
  const jill=await talk(tokens.jill,"You should find a compromise. Could you drive him to the trail, then read your book while he's hiking?",randomUUID());
  assert.equal(jack.messages.filter(m=>m.author==="coach").length,1);
  assert.equal(jill.messages.filter(m=>m.author==="coach").length,1);
  // Even if the language model did not extract a move, both friends can decide.
  const a=await choose(tokens.jack,"Jack asks Jill what she would enjoy and suggests time to relax together.");
  const b=await choose(tokens.jill,"Jill offers to drive Jack to the trail and read while he hikes.");
  assert.match(a.action,/Jack asks Jill/);
  assert.match(b.action,/Jill offers to drive/);
  await submit(tokens.jack);
  assert.equal(h.room.step,1,"Only Jack submitted: one shared story cannot resolve.");
  await submit(tokens.jill);
  assert.equal(h.room.step,2,"Both confirmed moves advance the shared story.");
  assert.equal(h.messages.filter(m=>m.kind==="outcome").length,1);
 }finally{h.restore()}
});
test("3.0 a coach cannot directly command the opposite fictional spouse",async()=>{
 const h=harness();
 try{
  await join(tokens.jack,"Adam");
  await assert.rejects(choose(tokens.jack,"Jill should agree to Jack's plan."),/only choose what Jack will do/);
  assert.equal(h.people[0].pending_action,null);
 }finally{h.restore()}
});

test("3.0 simple agreement to Jack's own suggested plan unlocks a natural story advance",async()=>{
 const h=harness();
 try{
   await join(tokens.jack,"Adam");
   await begin(tokens.jack);
   const first=await talk(tokens.jack,"Maybe you should ask Jill what kind of evening she wants.",randomUUID());
   assert.equal(first.step,1);
   const agreed=await talk(tokens.jack,"Yes, do that.",randomUUID());
   assert.equal(agreed.submitted,true,"Explicit 'do that' automatically commits Jack's fictional action");
   assert.equal(h.people[0].submitted_action,"Jack texts Jill and asks whether she'd like a quiet evening together.");
   assert.equal(h.messages.filter(m=>m.kind==="outcome").length,0);
   const refreshed=await status(tokens.jack);
   assert.equal(refreshed.submitted,true,"The fictional action is durably confirmed across refreshes");
 }finally{h.restore()}
});

test("3.1 evolving story accumulates five causal consequences and preserves both coaches' privacy",async()=>{
 const h=harness("shared",{evolving:true});
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  assert.equal((await status(tokens.jack)).version,ENGINE_VERSION);
  await begin(tokens.jack);await begin(tokens.jill);
  for(let step=1;step<=5;step++){
   if(step>1){await begin(tokens.jack);await begin(tokens.jill)}
   await talk(tokens.jack,"Jack should invite Jill to try a new activity but respect her answer.",randomUUID());
   await talk(tokens.jill,"Jill should try a surprising adventure and tell Jack when she is tired.",randomUUID());
   await submit(tokens.jack);
   assert.equal(h.room.step,step,"No shared event without Jill's confirmation");
   await submit(tokens.jill);
   assert.equal(h.events.length,step,"One evolution event per step");
   assert.equal(h.room.evolution_state.completedBeats,step);
   assert.equal(h.room.evolution_state.arc.beats.length,step);
   assert.equal(h.room.status,step===5?"complete":"active");
  }
  const a=await status(tokens.jack),b=await status(tokens.jill);
  assert.deepEqual(a.shared,b.shared);
  assert.equal(a.shared.length,5);
  assert.equal(h.events[0].before.completedBeats,0);
  assert.equal(h.events[4].after.completedBeats,5);
  assert.equal(h.room.scene.closure?.jackChange?.length>25,true);
  assert.equal(h.room.scene.closure?.jillChange?.length>25,true);
  assert.equal(h.room.scene.closure?.sophiaInsight?.length>35,true);
  assert.equal(h.room.scene.closure?.invitation?.length>20,true);
  assert.equal(h.room.evolution_state.arc.lastDilemma,"","The story must not leave a fresh unresolved decision");
  assert.equal(h.room.evolution_state.arc.closure?.relationshipTruth?.length>20,true);
  assert.ok(h.room.evolution_state.characters.jill.meters.agency<
    h.events[0].before.characters.jill.meters.agency);
  assert.equal(b.messages.some(m=>m.author==="coach"&&m.body.includes("Jack should invite Jill")),false,
   "Jill cannot read Jack\'s actual private coach message");
  assert.equal(a.messages.some(m=>m.author==="coach"&&m.body.includes("Jill should try a surprising")),false,
   "Jack cannot read Jill\'s actual private coach message");
  assert.equal((await progress(tokens.jack)).shared.length,5,
   "Repeated progress requests cannot publish a duplicate shared outcome");
 }finally{h.restore()}
});
test("3.1 individual Deep Dive applies consequences even without a second human coach",async()=>{
 const h=harness("individual",{evolving:true});
 try{
  await join(tokens.jack,"Adam");await begin(tokens.jack);
  await talk(tokens.jack,"Jack should try something surprising without hiding it from Jill.",randomUUID());
  const result=await submit(tokens.jack);
  assert.equal(result.step,2);
  assert.equal(h.events.length,1);
  assert.equal(h.people.length,1);
  assert.ok(validEvolution(h.room.evolution_state));
 }finally{h.restore()}
});

test("3.1 both conversational go-aheads advance a shared outcome with zero advance-button calls",async()=>{
 const h=harness("shared",{evolving:true});
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  await begin(tokens.jack);await begin(tokens.jill);
  const j=await talk(tokens.jack,"Jack should ask Jill what she wants and make a plan.",randomUUID());
  assert.equal(j.submitted,false,"Brainstorming alone must not auto-commit");
  const a=await talk(tokens.jack,"So go make a plan and see if it works out.",randomUUID());
  assert.equal(a.submitted,true,"Jack's explicit permission commits his action");
  assert.equal(h.room.step,1,"The shared story cannot advance before Jill acts");
  await talk(tokens.jill,"Jill should plan the morning hike then some lake time.",randomUUID());
  const b=await talk(tokens.jill,"I think that will work and it's worth the risk. Give it a try.",randomUUID());
  assert.equal(h.room.step,2,"Second explicit go-ahead triggers automatic consequence");
  assert.equal(h.events.length,1,"Exactly one evolving story event is published");
  assert.equal(b.shared.length,1);
  assert.equal(h.people.every(p=>p.submitted_step===1),true);
 }finally{h.restore()}
});

test("3.1 Jill texting Alissa can say Sounds good after Jill's own proposed plan; no stall",async()=>{
 const h=harness("shared",{evolving:true});
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  const opening=await begin(tokens.jill);
  assert.equal(opening.name,"Alissa");
  assert.equal(opening.messages[0].role,"jill");
  const first=await talk(tokens.jill,"What do you think about the wind?",randomUUID());
  assert.equal(first.submitted,false,"Open-ended weather discussion must not commit a choice");
  assert.equal(first.messages.at(-1).author,"character");
  const accepted=await talk(tokens.jill,"Sounds good.",randomUUID());
  assert.equal(accepted.submitted,true,"A friend approving Jill's concrete previous plan is sufficient");
  assert.match(h.people.find(p=>p.role==="jill").submitted_action,/Jill plans to ask Jack/);
  assert.equal(h.room.step,1,"The shared story waits for Jack's independent action");
 }finally{h.restore()}
});

test("Alissa chooses wait-and-see and the shared story uses Jack's separate committed plan",async()=>{
 const h=harness("shared",{evolving:true});
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  await begin(tokens.jack);await begin(tokens.jill);
  const jack=await talk(tokens.jack,"So go make a plan and see if it works out.",randomUUID());
  assert.equal(jack.submitted,true,"Jack carries out Adam's explicit advice");
  assert.equal(h.room.step,1,"The storyteller waits for Jill's separate decision");
  const before=h.aiCalls;
  const jill=await talk(tokens.jill,"Wait and see how it turns out.",randomUUID());
  assert.equal(h.aiCalls,before+1,"One story AI call, not a new round of Jill second-guessing Alissa");
  assert.equal(h.room.step,2,"Alissa's watchful nonintervention lets the shared event happen");
  assert.equal(h.events.length,1);
  const choices=h.events[0].after.arc.beats[0].actions;
  assert.equal(choices.length,2);
  assert.ok(choices.some(a=>a.character==="Jill"&&/chooses to wait/.test(a.action)));
  assert.ok(choices.some(a=>a.character==="Jack"&&/ask Jill/.test(a.action)));
  assert.equal(jill.messages.some(m=>m.author==="coach"&&/go make a plan/.test(m.body)),false,
    "Alissa does not receive Adam's private coaching transcript");
  assert.equal(jill.shared.length,1);
  assert.equal(h.messages.filter(m=>m.kind==="outcome").length,1);
 }finally{h.restore()}
});
test("a nonintervention choice can arrive before the other character acts",async()=>{
 const h=harness("shared",{evolving:true});
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  await begin(tokens.jack);await begin(tokens.jill);
  const first=await talk(tokens.jill,"Wait and see how it turns out.",randomUUID());
  assert.equal(first.submitted,true);
  assert.equal(h.room.step,1);
  const second=await talk(tokens.jack,"Go ahead and make the plan.",randomUUID());
  assert.equal(second.step,2);
  assert.equal(h.events.length,1);
 }finally{h.restore()}
});

test("3.1 the real moment-four supportive messages advance the story without more questions",async()=>{
 const h=harness("shared",{evolving:true});
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  await begin(tokens.jack);await begin(tokens.jill);
  h.messages.push({id:9001,room_id:rid,role:"jack",author:"character",kind:"reply",step:1,
    body:"Yeah, honestly, I am. Breakfast with Jill was lovely, and now we’re poking around for something fun we can do safely here.",
    request_key:null});
  h.messages.push({id:9002,room_id:rid,role:"jill",author:"character",kind:"reply",step:1,
    body:"We started with cards, and I got smug enough about winning to make the cabin feel lively. We’re going to make lunch together next and see how the afternoon feels.",
    request_key:null});
  const earlierCalls=h.aiCalls;
  const jack=await talk(tokens.jack,"I am glad to hear it man. Sounds like you're having a great weekend.",randomUUID());
  assert.equal(jack.submitted,true,"Jack's ongoing afternoon is accepted as conversational closure");
  assert.equal(h.room.step,1,"The story cannot advance before Alissa finishes");
  assert.equal(h.aiCalls,earlierCalls,"A courtesy message must not demand another AI conversation");
  const jill=await talk(tokens.jill,"Let me know how it turns out.",randomUUID());
  assert.equal(jill.step,2);
  assert.equal(h.events.length,1);
  assert.equal(h.aiCalls,earlierCalls+1,"Only the shared consequence needs AI generation");
  const a=h.events[0].after.arc.beats[0].actions;
  assert.ok(a.some(x=>x.character==="Jack"&&/stay present/.test(x.action)));
  assert.ok(a.some(x=>x.character==="Jill"&&/make lunch/.test(x.action)));
  assert.equal(jill.messages.some(x=>x.author==="coach"&&x.body.includes("great weekend")),false,
    "Alissa never receives Adam's private text");
 }finally{h.restore()}
});

test("3.2 autoplay requires only one private answer each, then plays five consequential scenes and closes",async()=>{
 const h=harness("shared",{evolving:true,autoplay:true});
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  await begin(tokens.jack);await begin(tokens.jill);
  const first=await talk(tokens.jack,"Yes dude. Screw the timer.",randomUUID());
  assert.equal(first.autoplay,true);
  assert.equal(first.submitted,true);
  assert.equal(first.step,1,"Must wait for both humans only at the beginning");
  assert.equal(h.messages.filter(m=>m.kind==="reply").length,0,"Characters do not text back acknowledging the coaching");
  const second=await talk(tokens.jill,"I'd make your point and let the duck crash.",randomUUID());
  assert.equal(second.step,2,"Both friends' first advice produces the next shared scene");
  assert.equal(h.events.length,1);
  assert.equal(h.messages.filter(m=>m.kind==="coach").length,2,"One text from each human");
  assert.equal(h.messages.filter(m=>m.kind==="reply").length,0,"No extra private character chatter");
  assert.match(h.events[0].after.arc.beats[0].actions[0].action,/timer/);
  assert.match(h.events[0].after.arc.beats[0].actions[1].action,/lets the contraption fail/);
  const jackStart=await status(tokens.jack),jillStart=await status(tokens.jill);
  assert.equal(jillStart.messages.some(m=>/Screw the timer/.test(m.body)),false,
   "Jill's private screen does not contain Adam's advice");
  assert.equal(jackStart.messages.some(m=>/duck crash/.test(m.body)),false,
   "Jack's private screen does not contain Alissa's advice");
  for(let nextStep=3;nextStep<=5;nextStep++){
   const result=await progress(tokens.jack);
   assert.equal(result.step,nextStep,"Auto director must not stall at moment "+(nextStep-1));
   assert.equal(result.autoRetrying,false);
  }
  const final=await progress(tokens.jill);
  assert.equal(final.status,"complete");
  assert.equal(final.shared.length,5);
  assert.ok(final.scene.closure?.sophiaInsight);
  assert.equal(h.events.length,5);
  assert.equal(h.messages.filter(m=>m.kind==="coach").length,2);
  assert.equal(h.messages.filter(m=>m.kind==="reply").length,0);
  assert.equal((await progress(tokens.jack)).shared.length,5,
   "Revisiting progress must never double publish a scene");
 }finally{h.restore()}
});
test("legacy 3.1-style rooms do not auto-advance just because a coach revisits",async()=>{
 const h=harness("shared",{evolving:true,autoplay:false});
 try{
  await join(tokens.jack,"Adam");await join(tokens.jill,"Alissa");
  await begin(tokens.jack);await begin(tokens.jill);
  const before=h.aiCalls;
  await progress(tokens.jack);
  assert.equal(h.aiCalls,before);
  assert.equal(h.room.step,1);
  assert.equal(h.messages.filter(m=>m.kind==="coach").length,0);
 }finally{h.restore()}
});
