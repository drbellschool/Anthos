// A manually approved Episode Studio graph fixture sourced from the real
// saved 'What Makes Us Feel Close' draft. It demonstrates how ANY episode
// supplies actions; no new model, rooms, API keys or episode-specific engine.
import {episode,qualityContract,offlineProbe} from "./jj43-what-makes-us-feel-close.mjs";
import {SCENARIO_GRAPH_VERSION} from "../../api/jj43-scenario-graph.mjs";
const definitions=[
 {cues:["dinner itinerary is better","put real work into it"],
  set:{jackPressed:true},strainDelta:1,behavior:{"g-world":2},
  coachingRatings:{"g-world":2}},
 {cues:["want quiet conversation","thank him for the thought"],
  set:{jillPreferenceStated:true},behavior:{"s-diff":4},
  coachingRatings:{"s-diff":4}},
 {cues:["ask what she'd actually enjoy","ask what she would enjoy"],
  set:{jackAsked:true},strainDelta:-1,behavior:{"a-curiosity":4},
  coachingRatings:{"a-curiosity":4}},
 {cues:["ask why the outing mattered","ask what matters to him about the outing"],
  set:{jillAsked:true},strainDelta:-1,behavior:{"a-curiosity":4},
  coachingRatings:{"a-curiosity":4}},
 {cues:["offer a porch hour first","leave dinner optional"],
  set:{porchOffered:true},strainDelta:-1,behavior:{"s-diff":4},
  coachingRatings:{"s-diff":4}},
 {cues:["say what sounds good","not agreeing to the whole day"],
  requires:{porchOffered:true},set:{jillPorchAccepted:true},
  behavior:{"s-diff":4},coachingRatings:{"s-diff":4}},
 {cues:["tell her she's ungrateful","tell her she is ungrateful"],
  set:{jackRejectedInsult:true},strainDelta:0,behavior:{"s-diff":4},
  coachingRatings:{"g-world":1}},
 {cues:["acknowledge his effort","your needs don't cancel his"],
  set:{jillAcknowledged:true},strainDelta:-1,behavior:{"g-world":4},
  coachingRatings:{"g-world":4}},
 {cues:["agree to the porch conversation","before revisiting the dinner idea"],
  requires:{jillPorchAccepted:true},set:{fridgePlan:"porch-first"},
  strainDelta:-1,behavior:{"s-diff":4},coachingRatings:{"s-diff":4}},
 {cues:["make a specific invitation","leave the rest undecided"],
  requires:{fridgePlan:"porch-first"},set:{porchHourAgreed:true},
  strainDelta:-1,behavior:{"g-world":4},coachingRatings:{"g-world":4}}
];
const approved=offlineProbe.map((script,i)=>({
 id:script.eventCode.split(":")[1],role:script.role,
 cues:definitions[i].cues,requires:definitions[i].requires||{},
 set:definitions[i].set,strainDelta:definitions[i].strainDelta||0,
 coachingRatings:definitions[i].coachingRatings,
 behavior:definitions[i].behavior,event:script.event,reply:script.reply
}));
const variants=[
 {id:"jack-contempt",role:"jack",cues:["call her selfish for wanting the porch"],
  set:{jackPressed:true},strainDelta:2,
  coachingRatings:{"g-world":1},behavior:{"g-world":1},
  event:"Jack called Jill selfish about her porch preference and made the disagreement more hostile.",
  reply:"I called her selfish. That wasn't fair, and it definitely didn't make either of us feel close. I'm still hurt, but I made the talk worse."},
 {id:"jill-withdraws",role:"jill",cues:["stay silent about the porch and go along with dinner"],
  set:{jillWithdrew:true},strainDelta:1,
  coachingRatings:{"s-diff":2},behavior:{"s-diff":2},
  event:"Jill avoided discussing her porch preference and withdrew from the conversation.",
  reply:"I went quiet rather than tell Jack what I wanted. He gets to keep his plans, but now I'm sitting on the part of Saturday that matters to me."}
];
export const scenarioGraph={
 version:SCENARIO_GRAPH_VERSION,episodeId:episode.id,qualityContract,
 fieldDomains:{
  jackPressed:[false,true],jillPreferenceStated:[false,true],
  jackAsked:[false,true],jillAsked:[false,true],
  porchOffered:[false,true],jillPorchAccepted:[false,true],
  jackRejectedInsult:[false,true],jillAcknowledged:[false,true],
  fridgePlan:["competing","porch-first"],porchHourAgreed:[false,true],
  jackWithdrew:[false,true],jillWithdrew:[false,true],
  dinnerBooked:[false,true],dinnerAgreement:["undecided","accepted","declined"]
 },
 initialState:{
  jackPressed:false,jillPreferenceStated:false,jackAsked:false,jillAsked:false,
  porchOffered:false,jillPorchAccepted:false,jackRejectedInsult:false,
  jillAcknowledged:false,fridgePlan:"competing",porchHourAgreed:false,
  jackWithdrew:false,jillWithdrew:false,dinnerBooked:false,
  dinnerAgreement:"undecided",strain:2,events:[
   "Jack has circled a dinner idea on the refrigerator. No reservation is confirmed.",
   "Jill has not agreed to the outing; she wants quiet conversation on the porch.",
   "Their competing plans are pinned on the fridge at breakfast."
  ]
 },
 roleOpenings:{
  jack:"I made a plan for an outing and dinner, and Jill says she'd rather sit on the porch. I can't tell whether she's turning down the idea or all the effort I put into it. What would you say?",
  jill:"I love that Jack wants us to spend time together, but I wanted a porch hour without a timetable. We have two plans on the fridge and nobody has chosen an afternoon yet. How can I tell him?"
 },
 days:[
  {skills:["g-world"],cue:"How does the other person define closeness?",
   prompt:"I'm still trying to figure out what the word close means to each of us. What should I ask?"},
  {skills:["a-curiosity"],cue:"What assumption could be checked with a real question?",
   prompt:"I don't want to make this all about guessing motives. What question would help?"},
  {skills:["s-diff"],cue:"How can two different needs remain legitimate?",
   prompt:"It matters that our preferences aren't identical. How can I say mine without overruling hers or his?"},
  {skills:["g-world","a-curiosity"],cue:"Will you listen under real disappointment?",
   prompt:"I'm feeling the pull to prove my own point. What response would be fair?"},
  {skills:["s-diff","g-world"],cue:"What chosen agreement could each person own?",
   prompt:"We still haven't decided on the full day. What can I offer without pretending we're done?"}
 ],
 rules:[...approved,...variants]
};
