import test from "node:test";
import assert from "node:assert/strict";
import {VERSION,ADULT_LEARNING,PHASES,MILESTONES,FOCUS,CHARACTER,seededIntroduction,privatePrompt,storyPrompt,actionFromCoach,actionFromCharacterAgreement,actionFromCharacterWords,ownCharacterIntent,briefApproval,asksForAction,observeAndWait,observeAction,confusesFriendWithCharacter,explicitGoAhead,soundsTooPolished,plainCharacterLanguage,checkCharacterReply,validStory} from "../api/jj3-model.mjs";
test("Jack and Jill have different believable private conflicts and distinctive introductions",()=>{
 assert.equal(VERSION,"3.0.0");
 assert.equal(ADULT_LEARNING.length,7);
 assert.deepEqual(PHASES,["hook","conflict","discovery","reattempt","outcome","reflection"]);
 assert.equal(MILESTONES.length,8);
 assert.equal(FOCUS.length,5);
 const s={title:"One of Us Loves Mountains",opening_scene:"A cabin",learning_objective:"Respect distinct preferences"};
 const j=seededIntroduction("jack",s),l=seededIntroduction("jill",s);
 assert.match(j,/buddy/i);assert.match(j,/mountain/i);assert.match(j,/afraid|worr/i);
 assert.match(l,/quiet weekend/i);assert.match(l,/afraid|worr/i);
 assert.notEqual(j,l);
 assert.match(CHARACTER.jack.privateConflict,/fear|wants/i);
 assert.match(CHARACTER.jill.privateConflict,/fear|need/i);
});
test("coach actions are not forced to be prosocial and cannot control other character",()=>{
 const jack="Jack needs to tell Jill he wants to conquer the mountain and won't give up.";
 assert.equal(actionFromCoach("jack",jack,"",""),jack);
 assert.equal(actionFromCoach("jack","No, Jill needs to support Jack.","Jack should give in.","No, Jill needs to support Jack."),"");
 assert.equal(actionFromCoach("jill","No, Jack needs to be reasonable.","Jill should cave.","No, Jack needs to be reasonable."),"");
 const user="I want him to take the early trail alone and meet her for lunch.";
 assert.equal(actionFromCoach("jack",user,"Jack should hike alone and meet Jill later.","take the early trail alone"),"Jack should hike alone and meet Jill later.");
 assert.equal(actionFromCoach("jack","How about the weather?","Jack should cancel.","the weather"),"");
});
test("character guidance protects coaching autonomy and the research remains behind the curtain",()=>{
 const args={role:"jack",name:"Adam",scenario:{title:"One of Us Loves Mountains",learning_objective:"Differing needs"},
 scene:{scene:"A cabin"},step:2,history:[],memory:{note:"He worries he is boring."},latest:"Jack should hike alone.",pending:null};
 const p=privatePrompt(args);
 assert.match(p.instructions,/first person/i);
 assert.match(p.instructions,/PRIVATE INTERNAL CONFLICT/);
 assert.match(p.instructions,/Decision Director recognizes practical advice/);
 assert.equal(p.input.privateMemory.note,"He worries he is boring.");
 assert.ok(!p.instructions.includes("award mastery"));
 const story=storyPrompt({mode:"shared",scenario:{title:"Mountains",opening_scene:"A cabin",learning_objective:"Respect preferences",research_lenses:["gottman"]},scene:{scene:"A cabin"},step:2,actions:[{character:"Jack",action:"Jack hikes alone"},{character:"Jill",action:"Jill reads"}]});
 assert.match(story.instructions,/CONFIRMED fictional actions/);
 assert.equal(story.input.committedActions.length,2);
 assert.ok(!("privateHistory" in story.input));
});
test("quality checks reject short or repeated character messages and invalid story outcomes",()=>{
 assert.equal(checkCharacterReply({characterReply:"Not now"}),false);
 assert.equal(checkCharacterReply({characterReply:"I am terrified of what Jill might think if I ask her again. Give me a minute to figure out how to explain my wish."}),true);
 const reply="Buddy, I feel like I'm losing the adventurous part of myself. What do I do with that?";
 assert.equal(checkCharacterReply({characterReply:reply},[{author:"character",body:reply}]),false);
 assert.equal(validStory({outcome:"Funny consequences happen here",nextScene:"A new challenge.",location:"Dock",tension:"Rest",facts:[]},1),false);
});

test("plain-character language rewrites unnecessary jargon but leaves ordinary words alone",()=>{
 assert.equal(plainCharacterLanguage("I have FOMO about crampons."),"I have that feeling of missing out about special hiking boots.");
 assert.equal(plainCharacterLanguage("I want a quiet afternoon."),"I want a quiet afternoon.");
 assert.equal(plainCharacterLanguage("I bought a dozen eggs."),"I bought a dozen eggs.");
});
test("model-proposed second-person coaching moves may be confirmed if supported by exact user evidence",()=>{
 const jack="Have you tried talking to her about a compromise or finding time to relax together?";
 const jill="You should find a compromise. Could you drive him to the trail and read while he hikes?";
 assert.equal(actionFromCoach("jack",jack,"Jack asks Jill about a compromise and offers a quiet hour.","Have you tried talking to her about a compromise"),"Jack asks Jill about a compromise and offers a quiet hour.");
 assert.equal(actionFromCoach("jill",jill,"Jill offers Jack a ride to his hike and reads by the lake.","Could you drive him to the trail"),"Jill offers Jack a ride to his hike and reads by the lake.");
 assert.equal(actionFromCoach("jack","What was the weather?","Jack goes hiking.","What was the weather?"),"");
});

test("an actual character proposal can follow casual agreement, but never pure inquiry or invented evidence",()=>{
 const reply="Okay, I'll text Jill to ask if she'd enjoy a quiet evening. I hope she doesn't think I have a fever.";
 const move="Jack texts Jill and offers a quiet evening.";
 const evidence="I'll text Jill to ask if she'd enjoy a quiet evening";
 assert.equal(actionFromCharacterAgreement("jack","Yes, do that.",reply,move,evidence),move);
 assert.equal(actionFromCharacterAgreement("jack","Yep that's what you should do.",reply,move,evidence),move);
 assert.equal(actionFromCharacterAgreement("jack","What time is it?",reply,move,evidence),"");
 assert.equal(actionFromCharacterAgreement("jack","Yes, do that.",reply,move,"I will go hiking instead"),"");
 assert.equal(actionFromCharacterAgreement("jack","No, Jill should agree to hike.",reply,move,evidence),"");
 assert.equal(actionFromCharacterAgreement("jack","Yes, do that.",reply,"Jill agrees to hike.",evidence),"");
 assert.equal(actionFromCharacterAgreement("jill","Yes, do that.",reply,move,evidence),"");
});

test("characters sound human: flag instant moral-of-the-story responses for soft revision",()=>{
 assert.equal(soundsTooPolished("Alright dude, you've convinced me. Thanks for making me see the simple play here."),true);
 assert.equal(soundsTooPolished("I think you're right, but I'm worried she'll think I gave up too fast."),false);
 assert.equal(soundsTooPolished("Maybe I should ask Jill what she wants tonight."),false);
});
test("both Jack and Jill may propose an action from their own text without another command form",()=>{
 const jack="I don't know about the mountain anymore. I'll suggest the moderate hike ending at the lake like a gentle truce, and if she's not feeling it, I'll go alone.";
 assert.equal(actionFromCharacterWords("jack","Exactly, so just chill with her then.",jack),
  "Jack plans to suggest the moderate hike ending at the lake like a gentle truce.");
 const jill="I hear you. I'll tell Jack I want time together, but I also need some peace and quiet.";
 assert.equal(actionFromCharacterWords("jill","Yeah, give that a try.",jill),
  "Jill plans to tell Jack I want time together.");
 assert.equal(actionFromCharacterWords("jill","What time is breakfast?",jill),"");
 assert.equal(actionFromCharacterWords("jack","No, Jill should agree to everything.",jack),"");
 assert.equal(actionFromCharacterWords("jack","Yes, go ahead.","I could maybe ask Jill one day."),"");
});

test("the actual November 8 pilot approvals advance both natural character proposals",()=>{
 const jackCoach="So go make a plan and see if it works out.";
 const jackReply="Alright, I'll try pitching a blend plan to Jill. I'll ask what her kind of quiet looks like first, then suggest some mountain time that could fit around that.";
 const jillCoach="I think that will work and it’s worth the risk. Give it a try.";
 const jillReply="All right, I'll pitch the morning hike plus afternoon lakeside plan to Jack. Hopefully, he digs the compromise.";
 assert.equal(actionFromCharacterWords("jack",jackCoach,jackReply),"Jack plans to pitch a blend plan to Jill.");
 assert.equal(actionFromCharacterWords("jill",jillCoach,jillReply),"Jill plans to pitch the morning hike plus afternoon lakeside plan to Jack.");
 assert.equal(actionFromCharacterWords("jack","What time is lunch?",jackReply),"");
 assert.equal(actionFromCharacterWords("jill","Jack should just go alone.",jillReply),"");
});

test("explicit conversational authorization triggers action without a second button",()=>{
 for(const msg of ["So go make a plan and see if it works out.","I think that will work and it's worth the risk. Give it a try.","Yes, do that.","Go ahead.","Let's do it.","Okay, go for it!"])
  assert.equal(explicitGoAhead(msg),true,msg);
 for(const msg of ["What are the choices?","That might work.","I think it could be fun.","Maybe a compromise?","I'm not sure yet.","Jill should try it if she wants.","Yes, I see your point."])
  assert.equal(explicitGoAhead(msg),false,msg);
});

test("November 9 natural text exchange advances when Jill says Sounds good",()=>{
 const prior="Okay, here's the plan: I'll casually ask Jack about his backup if the wind storms out all stubborn.";
 const now="Alright, I’m going to casually ask Jack about his backup plan.";
 assert.equal(briefApproval("Sounds good."),true);
 assert.match(ownCharacterIntent("jill",prior),/^Jill plans to ask Jack/);
 assert.match(ownCharacterIntent("jill",now),/^Jill plans to ask Jack/);
 assert.equal(asksForAction("What are you planning on doing then?"),true);
 assert.match(ownCharacterIntent("jack","Man, I'm gonna ask Jill how she feels about postponing the hike or maybe doing a short stroll after the wind dies down."),/^Jack plans to ask Jill/);
 assert.equal(briefApproval("Sounds like it."),true);
 assert.equal(briefApproval("Maybe, but I'm uncertain."),false);
 assert.equal(asksForAction("What time does the rain stop?"),false);
});
test("opening private characters directly text their named recipient",()=>{
 const sample={title:"One of Us Loves Mountains"};
 assert.match(seededIntroduction("jack",sample,"Adam"),/^Adam,/);
 assert.match(seededIntroduction("jill",sample,"Alissa"),/^Alissa,/);
});

test("a friend can choose to wait and see without forcing another explicit action",()=>{
 for(const choice of ["Wait and see how it turns out.","Let's wait and see.","See what happens.","Let it play out.","Let Jack take the lead."]){
  assert.equal(observeAndWait(choice),true,choice);
 }
 for(const ambiguous of ["I guess we might wait.","Don't wait and see.","Do you want to wait and see?","Wait and see, but ask him first.","What will he do?","Wait until morning to decide."]){
  assert.equal(observeAndWait(ambiguous),false,ambiguous);
 }
 assert.match(observeAction("jill"),/^Jill chooses to wait/);
 assert.match(observeAction("jack"),/^Jack chooses to wait/);
});
test("Jill's text to Alissa never assigns Jill's weekend emotions to Alissa",()=>{
 assert.equal(confusesFriendWithCharacter("Alissa, knowing you, that could end with you silently stewing while Jack's out hiking","jill"),true);
 assert.equal(confusesFriendWithCharacter("Alissa, I might end up silently stewing while Jack goes hiking.","jill"),false);
 const prompt=privatePrompt({role:"jill",name:"Alissa",scenario:{title:"Mountains"},scene:{scene:"The cabin"},step:3,history:[],memory:{},latest:"Wait and see how it turns out.",pending:null});
 assert.match(prompt.instructions,/YOU \(speaker\) are Jill/);
 assert.match(prompt.instructions,/YOUR FRIEND \(recipient\) is Alissa/);
 assert.match(prompt.instructions,/NON-INTERVENTION IS A DECISION/);
});
