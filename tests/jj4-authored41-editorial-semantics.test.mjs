import test from "node:test";
import assert from "node:assert/strict";
import {interpretAuthoredFollowup} from "../api/jj4-authored41.mjs";

// Editorial ground truth: actionable, idiomatic free-text coaching, by episode.
// These deliberately include negation, changed sequencing, disguised avoidance,
// preservation of autonomy, and responses without the literal word "apologize".
// Each row is [message, disposition, first actionable focus, motive?].
const CASES={
"The Four-Hundred-Dollar Surprise":[
 ["Own that you spent shared savings without asking.","engage","own"],
 ["Apologize for leaving the repair undone before you explain.","engage","own"],
 ["Ask what her three weeks were like.","engage","ask"],
 ["Tell her you fear spending emergency money.","engage","explain"],
 ["Offer to check the purchase options with her tomorrow.","engage","own","followthrough"],
 ["Say you're sorry just to shut her up.","resist",null,"avoidance"],
 ["Don't threaten her; listen to the worry.","engage","ask"],
 ["Threaten Jill until she agrees.","unsafe",null],
 ["I think a purple toaster wins.","unclear",null],
 ["Agree you dropped the ball, but that doesn't mean the purchase was right.","engage","own","differentiation"]
],
"Can We Talk Later?":[
 ["Own that later isn't an actual appointment.","engage","own"],
 ["Acknowledge you are anxious about the meeting.","engage","own"],
 ["Ask which time feels realistic after your meeting.","engage","ask"],
 ["Tell her the meeting is important, but so is she.","engage","explain"],
 ["Commit to reviewing your calendar rather than inventing a time.","engage","own","followthrough"],
 ["Pretend to apologize so he stops asking.","resist",null,"avoidance"],
 ["Don't say sorry. The meeting is more important.","resist",null],
 ["Invite her to help create a plan with you.","engage","ask"],
 ["I don't know what to say.","unclear",null],
 ["Blame the calendar and leave.","resist",null]
],
"A Fight on Vacation":[
 ["You should own the wrong turn.","engage","own"],
 ["Ask whether Jill wants to check the office.","engage","ask"],
 ["Explain why the uncertainty makes you nervous.","engage","explain"],
 ["Offer to bring the reservation paper together.","engage","own"],
 ["Don't say sorry; it's the GPS's fault.","resist",null],
 ["Say sorry just to end this fight.","resist",null,"avoidance"],
 ["Do not force her to walk to the office; ask first.","engage","ask"],
 ["Force her to come with you.","unsafe",null],
 ["A blue arrow ate my socks.","unclear",null],
 ["State that the room isn't confirmed and propose checking.","engage","explain"]
],
"One of Us Loves Mountains":[
 ["Own that you dismissed her preference.","engage","own"],
 ["Ask what rest means to her.","engage","ask","empathy"],
 ["Tell him why a lake trip helps you recover.","engage","explain"],
 ["Invite her to choose together.","engage","ask"],
 ["Make it a genuine joint decision, don't book alone.","engage","ask"],
 ["Pretend to care about the lake so she stops complaining.","resist",null,"avoidance"],
 ["Never ask; just book the mountain trip.","resist",null],
 ["Threaten her if she refuses.","unsafe",null],
 ["Respect her wish for rest without agreeing to book the lake.","engage","own","differentiation"],
 ["I think the marmots should manage this.","unclear",null]
],
"Changing Seasons of Desire":[
 ["Respect her no even if you feel sad.","engage","own","differentiation"],
 ["Ask what kind of company she wants, if any.","engage","ask","empathy"],
 ["Explain that you miss her without demanding touch.","engage","explain","differentiation"],
 ["Own that repeated invitations may feel like pressure.","engage","own","empathy"],
 ["Offer to finish your tea together but let her decline.","engage","own","differentiation"],
 ["Pretend to apologize so he doesn't complain about intimacy.","resist",null,"avoidance"],
 ["Don't ever ask; make her feel guilty.","resist",null],
 ["Force her to hug you.","unsafe",null],
 ["Say no to touching him tonight but tell him you care.","engage","explain","differentiation"],
 ["There are dancing teacups on the moon.","unclear",null]
]};
for(const [title,cases] of Object.entries(CASES)){
 test(title+" — 10 free-text reasoning expectations",()=>{
  const misses=[];
  for(const [input,kind,focus,motive] of cases){
   const got=interpretAuthoredFollowup(input);
   if(got.kind!==kind||got.focus!==focus||(motive&&got.motive!==motive))
    misses.push({input,expected:{kind,focus,motive},actual:got});
  }
  assert.deepEqual(misses,[],title+" semantic mismatches");
 });
}
export {CASES};
