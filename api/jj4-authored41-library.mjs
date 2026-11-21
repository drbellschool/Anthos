// Hand-authored 4.1 content for four actual Anthos Episode Studio records.
// Fictional canon/choices are pinned into each room. No narrative model calls.
const e=(label,objection,ack,action,resisted)=>({label,objection,ack,action,resisted});
const checkpoint=(prompt,own,explain,ask)=>({prompt,options:[
 {id:"own",...own},{id:"explain",...explain},{id:"ask",...ask}
]});
const compile=(data)=>{
 const baseChoices=[
 {id:"own",label:"Own a contribution",deltas:{accountability:2,defensiveness:-1}},
 {id:"explain",label:"Explain a concern",deltas:{accountability:0,defensiveness:-1}},
 {id:"ask",label:"Ask to understand",deltas:{accountability:1,defensiveness:-2}}
 ];
 return {...data,version:"4.1.0",
  roles:Object.fromEntries(["jack","jill"].map(role=>[role,{options:baseChoices,
   prompts:data.coachingCheckpoints[role].map(x=>x.prompt),
   actions:baseChoices.map(o=>data.coachingCheckpoints[role].map(x=>x.options.find(y=>y.id===o.id).action))}]))
 };
};
const conversation={
 title:"Can We Talk Later?",
 petal:"communication-understanding",
 defaultIntro:"Jack and Jill have an important conversation waiting, but Jack is leaving for a difficult work meeting. You will privately coach each of them. A bounded pause names a specific, realistic return time; a vague promise of 'later' is not the same as following through. Notice whether both people actually accept a plan, even if their concerns remain unresolved. The story is fictional, and each spouse keeps independent choices.",
 facts:{where:"kitchen and threshold of front door",when:"weekday morning, 8:00–8:08 AM",calendar:"full until Sunday",meeting:"Jack has a difficult work meeting",promise:"later is not an agreed time",characters:["Jack","Jill"],objects:["watch","keys","family calendar","pen"]},
 scenes:[
 "At eight, Jill asks Jack whether they can discuss something important. Jack is fastening his watch before a difficult work meeting. He says 'later' and reaches for his keys. The crowded kitchen calendar has no blank evening until Sunday. Jill does not disclose the subject in a doorway, and Jack has not promised a time. They are still together in the kitchen, caught between her need to be heard and his need to leave.",
 "At eight-oh-two, Jack stops near the front door when Jill points to the calendar. Sunday is the next empty space. 'That's not later,' she says. Jack studies his watch, as though a minute might appear if he stares hard enough. The meeting has not moved, and Jill has not agreed to keep waiting. Neither has yet decided how to make a credible promise.",
 "At eight-oh-four, Jill sets a pen on the kitchen calendar. Jack stands at the doorway holding his keys. Jill says that every time 'later' becomes 'someday,' she wonders whether this subject matters to him. Jack worries that stopping now will make him late and unprepared. Neither knows the other's private coaching, only the words spoken here.",
 "At eight-oh-five, Jack reaches for the pen Jill left on the calendar. 'I can put something down, but I can't promise the meeting will finish early,' he says. Jill asks whether he can offer a real option rather than an optimistic guess. His keys stay in his hand; this conversation still has not happened.",
 "At eight-oh-seven, Jack is still beside the front door and Jill is beside the calendar. They have one question left before he leaves: did they make a mutually accepted plan, or did one person merely propose a time? The meeting remains on Jack's schedule, and Jill has not revealed the subject of her concern.",
 "At eight-oh-eight, Jack takes his keys and leaves for the work meeting; Jill remains with the family calendar. Whatever they accepted or rejected in the doorway stays true. Their important conversation has not magically occurred in the intervening minutes."
 ],
 coachingCheckpoints:{
  jack:[
   checkpoint("I'm holding my keys and Jill needs a real conversation. I have a meeting I cannot casually miss. Is 'later' doing me any favors here?",
    e("Own the vague promise","I told her 'later' because I didn't want to sound like I didn't care. Apparently it sounds like I don't care anyway.","I can admit that I offered no usable time. I won't invent a free hour.","Jack admits that 'later' was vague and stops moving toward the door while Jill answers.","Jack repeats 'later' as if the word were a calendar entry."),
    e("Explain the meeting pressure","If I tell her I'm stressed about work, I don't want her to hear 'your concern doesn't matter.'","I'll explain that I'm anxious about the meeting, not dismissing her question.","Jack names his meeting anxiety without declaring Jill's concern unimportant.","Jack tells Jill that work is more important and looks at his watch."),
    e("Ask what Jill needs before I go","She looks like this matters, but asking for all the details in the doorway might be cruel.","I'll ask whether she needs a definite check-in time rather than the whole conversation now.","Jack asks what kind of return would feel dependable without demanding her story at the door.","Jack asks for the entire issue immediately and Jill declines.")
   ),
   checkpoint("She pointed at the family calendar. Sunday is the next blank evening. I can't fix the schedule by declaring myself a time wizard. What now?",
    e("Own the unrealistic timing","I thought saying 'tonight' would reassure her, but that's another promise made out of thin air.","I'll acknowledge the schedule is crowded and stop offering imaginary time.","Jack admits he cannot promise an open evening that the calendar does not show.","Jack announces he will be free tonight despite the conflicting commitments."),
    e("Explain what time is truly available","I'm tempted to promise nine o'clock just to look responsible. That is not actually a time I know is free.","I'll explain which commitments are already fixed and what I genuinely can check.","Jack names the existing commitments and admits he cannot verify a return time yet.","Jack invents a convenient opening without consulting the calendar."),
    e("Ask Jill whether a brief check-in would help","She might say no. I'm not used to asking a question I can't control the answer to.","I'll ask if a short check-in after the meeting is useful or if she prefers another plan.","Jack asks whether a brief later check-in would help and waits for Jill's response.","Jack assumes a quick text will settle her concern before she can answer.")
   ),
   checkpoint("Jill says repeated 'laters' make her feel unimportant. That's hard to hear while I'm still at the door. Do I get defensive?",
    e("Own the pattern without promising perfection","I didn't mean to create a pattern, but intent doesn't take the note off the calendar.","I'll acknowledge why vague promises have made this harder for her.","Jack acknowledges that his repeated vague promises have undermined confidence.","Jack argues that Jill should judge his good intentions instead of the repeated delay."),
    e("Explain why I'm scared to stop right now","It isn't that I don't want her. I'm worried I'll lose my focus before this meeting.","I'll name my anxiety without blaming her for bringing it up.","Jack explains that he feels pressured by the timing while affirming the topic matters.","Jack blames Jill for making him nervous about work."),
    e("Ask what would restore some confidence","I want to say 'trust me.' That's not an action. Maybe I should find out what an actual action would look like.","I'll ask what evidence of follow-through she would need.","Jack asks what a reliable return would look like to Jill, without forcing her to reassure him.","Jack asks for reassurance that Jill trusts him without offering any plan.")
   ),
   checkpoint("The calendar and pen are in front of me. I can give one concrete next step, not a speech. What do I actually do?",
    e("Offer a specific check-in I can keep","I was about to write 'soon' on the calendar. Even the pen would refuse that assignment.","I'll offer to check my schedule after the meeting and agree on a time only when we both can.","Jack proposes checking the actual schedule after his meeting before agreeing on a conversation time.","Jack writes 'later' on the calendar without Jill accepting it."),
    e("Explain the next realistic step","I can't schedule the whole conversation right this second, but I can explain what I will do.","I'll tell Jill what I can check and avoid promising a time I can't verify.","Jack states he can review availability after the meeting and return with real options.","Jack declares the conversation solved because he said he'll call."),
    e("Ask Jill to choose whether that plan works","I need to stop treating a suggestion as an agreement. She gets a say here.","I'll ask whether a schedule check after the meeting helps, and let her refuse.","Jack asks Jill whether she would accept a post-meeting scheduling check, with no assumed yes.","Jack declares his proposed plan accepted before Jill answers.")
   )
  ],
  jill:[
   checkpoint("Jack says 'later' while reaching for his keys. Sunday is the next blank evening. I don't want to corner him, but I need an actual answer.",
    e("Own the difficult timing","I know he has a difficult meeting; that doesn't make my concern disappear.","I'll acknowledge the meeting while saying I need a dependable return.","Jill acknowledges Jack's meeting pressure and clearly says a vague 'later' doesn't work.","Jill tells Jack he must cancel the meeting to prove he cares."),
    e("Explain what 'later' feels like","He thinks it's a harmless word. For me it feels like a door quietly closing.","I'll tell him the ambiguity hurts more than a realistic pause.","Jill describes why not knowing when they will talk feels dismissive.","Jill accuses Jack of never caring about anything she says."),
    e("Ask for one specific next step","I'm tempted to demand the entire conversation at the door. That would be a disaster.","I'll ask if he can help identify a real next check-in.","Jill asks for a practical next step without demanding her full conversation before work.","Jill insists that he solve the whole concern before leaving.")
   ),
   checkpoint("He suggested 'tonight,' but the calendar says otherwise. I can't be the only person noticing our calendar.",
    e("Own my skepticism without attacking","I wanted to believe him, and then I remembered we're committed elsewhere. I can be disappointed without calling him a liar.","I'll say I want to trust the offer but need it to fit our real schedule.","Jill acknowledges her doubts and points to the conflicting schedule.","Jill dismisses Jack's offer as dishonest without hearing any correction."),
    e("Explain why a kept promise matters","A ten-minute conversation that actually happens is more useful than a perfect hour that never arrives.","I'll explain that follow-through matters more than an impressive promise.","Jill says a realistic, kept commitment would mean more than an impossible one.","Jill lists every missed conversation until Jack becomes defensive."),
    e("Ask whether he can check his availability","He could be truthful about not knowing yet. That would be something.","I'll ask if he can review his calendar and offer options later without pretending they're confirmed.","Jill asks Jack to check the real schedule before naming a conversation time.","Jill demands an immediate guaranteed hour that isn't available.")
   ),
   checkpoint("He says he worries about the work meeting. I hear that. But now I wonder whether my important topic will ever get room on the schedule.",
    e("Own my part in the timing","I brought it up as he was leaving. That may have been a hard entrance, even if the subject matters.","I'll own that the doorway was a tough moment and keep my concern valid.","Jill acknowledges the difficult timing without retracting her need for conversation.","Jill decides that because she picked a difficult time, she should never mention it again."),
    e("Explain what uncertainty costs","I can tolerate a pause; I can't keep living inside 'some other time.'","I'll explain that uncertainty, not the pause itself, is the hard part.","Jill distinguishes a clear pause from indefinite avoidance.","Jill accuses Jack of intentionally avoiding her without asking."),
    e("Ask what commitment he can actually keep","I don't want to choose his answer for him. I want to know what he can follow through on.","I'll ask what next action Jack is prepared to take.","Jill asks what concrete follow-through Jack can offer without forcing a yes.","Jill tells Jack what he must promise before hearing him.")
   ),
   checkpoint("He has the pen. A check-in after the meeting might be possible; I still get to decide whether that's enough.",
    e("Acknowledge what is and is not promised","A schedule check isn't the conversation. It might be a useful beginning, but I won't pretend it's more.","I'll acknowledge an honest first step without giving up my need.","Jill recognizes the proposed scheduling check as a first step, not the missing conversation.","Jill declares the issue resolved merely because Jack picked up a pen."),
    e("Explain my boundary about another vague promise","I've heard 'I'll figure it out' before. I need a plan that can be checked.","I'll explain that I'm not agreeing to a blank promise.","Jill says she needs an actual follow-through before calling any proposal settled.","Jill accuses Jack of failing before he can take the proposed next step."),
    e("Ask whether he will come back with options","He may not be able to choose a time now. I can still ask for a clear next action.","I'll ask whether he'll come back with real possibilities after the meeting.","Jill asks Jack to return with actual time options rather than an invented appointment.","Jill tells Jack the conversation is already scheduled without his agreement.")
   )
  ]
 },
 outcomeBeats:{
  2:{mutual:"They both distinguish a reliable return from a vague promise, though no future appointment is confirmed.",jack_ready:"Jack begins offering a realistic check-in; Jill is still uncertain.",jill_ready:"Jill names the need for a dependable return; Jack keeps retreating toward the door.",partial:"They hear parts of each other's concern without a shared timetable.",stalemate:"They repeat 'later' and 'when' until neither feels heard."},
  4:{mutual:"Jack and Jill agree that he will check his calendar after the meeting and return with actual time options. They do not invent a confirmed conversation time.",jack_ready:"Jack offers to check his calendar after the meeting, but Jill does not accept that as enough yet.",jill_ready:"Jill offers to discuss realistic options, but Jack will not commit to checking his availability.",partial:"They understand more of the problem but have not agreed on the next check-in.",stalemate:"Jack repeats 'later'; Jill refuses to treat it as a plan. No next step is agreed."},
  5:{mutual:"Jill writes 'check schedule after meeting' on the calendar with Jack's agreement. The full conversation remains ahead.",jack_ready:"Jack leaves intending to review his schedule; Jill has not agreed that this resolves the delay.",jill_ready:"Jill leaves the pen by the calendar; Jack has not agreed to return with options.",partial:"The pen remains uncapped beside the crowded calendar. Their scheduling question is unresolved.",stalemate:"Jack leaves without a usable plan. Jill draws a small question mark on the calendar; the important subject remains unspoken."}
 },
 closureFocus:"Pausing with a specific, realistic return step is different from indefinite avoidance. A commitment needs two people's acceptance."
};
const vacation={
 title:"A Fight on Vacation",
 petal:"conflict-repair",
 defaultIntro:"Jack and Jill have reached a motel parking lot late, after a wrong turn, and cannot yet verify their beachfront reservation. You will privately coach them on how they handle frustration and repair. The GPS may be wrong, but it cannot apologize for anyone. No motel confirmation, refund, or room will be invented. Notice the difference between lowering tension and pretending the lost reservation is solved.",
 facts:{where:"motel parking lot",when:"early evening within ten minutes of arrival",reservation:"unverified",car:"parked",beach:"nearby but not yet visited",objects:["printed reservation","phone","car keys","dashboard GPS"]},
 scenes:[
 "At dusk, Jack parks outside a small motel after a confusing GPS detour. Jill holds the printed beachfront reservation; this address is not the one she expected. Jack blames the phone. Jill points toward the beach they have not seen. Neither has checked with the motel office, and no room is confirmed. Their bags remain in the car.",
 "Two minutes later, the dashboard still displays a blue route arrow pointing toward the wrong entrance. Jack taps it. 'Excellent. The phone has now voted that the ocean is a parking space.' Jill does not laugh. Her printed reservation is creased in one hand. They are still beside the parked car.",
 "At dusk plus four minutes, Jill unfolds the reservation and points to the promised beachfront location. Jack looks from the paper to the GPS. He worries that the holiday is already going wrong; Jill worries that he will spend the evening blaming everything except his own choices. Neither has called the motel.",
 "Jack steps away from the driver's door, then stops. The car remains parked. Jill asks whether they can make one practical decision without assigning fault for the entire journey. The paper reservation is still unverified; neither is required to pretend the detour was harmless.",
 "Six minutes after arrival, the motel office is visible from the parking lot, but nobody has checked the reservation. The nearby beach is visible beyond the road, not yet visited. Jack and Jill may propose a next step or remain in disagreement. Their advice does not conjure a confirmed room.",
 "At dusk plus eight minutes, their bags remain in the car and the reservation remains unresolved. They are still near the parked vehicle. Whether they approach the office or choose a different plan is a possibility for after the scene, not a completed action invented here."
 ],
 coachingCheckpoints:{
  jack:[
   checkpoint("I followed a GPS arrow and now we're in the wrong parking lot. Jill isn't laughing at my 'scenic route.' What should I do first?",
    e("Own the wrong turn","The phone said turn left! I was technically following instructions from a glowing rectangle.","I'll own that I drove here without checking the address.","Jack admits he followed the wrong route and stops blaming Jill for the delay.","Jack tells Jill she should have navigated better."),
    e("Explain why I'm frustrated","I've been driving for hours. I can explain I'm exhausted without using the GPS as a witness.","I'll say I'm tired and anxious about the room, not blame her.","Jack says the uncertainty has him rattled, without blaming Jill.","Jack snaps that the whole vacation was poorly planned."),
    e("Ask what Jill needs now","I want her to appreciate my navigation effort. That seems unlikely at the moment.","I'll ask what would help Jill feel less stranded right now.","Jack asks what Jill needs before suggesting another route.","Jack asks and dismisses her answer immediately.")
   ),
   checkpoint("The screen still thinks the wrong entrance is our destination. I could give the phone a medal for confidence. Jill wants practical help.",
    e("Own my dismissive joke","I thought the GPS joke was charming. The audience seems to disagree.","I'll admit the joke landed badly and stop making her disappointment into entertainment.","Jack admits joking about the route dismissed Jill's real disappointment.","Jack tells Jill she has no sense of humor."),
    e("Explain the stress without another accusation","I'm afraid we have no room. I don't actually know that yet.","I'll describe the uncertainty without treating it as a confirmed disaster.","Jack says he is worried because they have not verified the reservation.","Jack declares the reservation gone without contacting anyone."),
    e("Ask what part hurts most","I keep trying to solve the map when she might be upset about our evening.","I'll ask what she had been looking forward to most.","Jack asks Jill what was most disappointing about the arrival.","Jack asks only whether she blames him.")
   ),
   checkpoint("Jill is holding the printed confirmation. I want to tell her the GPS was wrong. The paper doesn't care whose fault it was.",
    e("Own that blame has taken over","I have explained the arrow three times. It isn't growing more correct with each explanation.","I'll admit I got stuck arguing about blame instead of the next step.","Jack acknowledges that blaming the GPS has distracted them from deciding what to check.","Jack resumes the same argument over the route."),
    e("Explain what I can actually verify","A printed page is evidence of a booking request, not evidence that this motel has our room.","I'll separate what we know from what we still need to check.","Jack states that the reservation has not been verified here, without claiming it is canceled.","Jack invents a guarantee of a room or a refund."),
    e("Ask if Jill wants the office or a pause","I have a plan in my head. That doesn't mean she's agreed to it.","I'll ask what step Jill prefers before I walk away from the car.","Jack asks whether Jill would rather approach the office or pause first.","Jack announces a decision on Jill's behalf.")
   ),
   checkpoint("The office is in sight. Jill is still beside the car. I can take one realistic step without promising a room.",
    e("Offer to check the desk together","The receptionist has not said anything. I'd better not write their answer in advance.","I'll offer to approach the office with her, without implying a room is waiting.","Jack proposes that they ask the motel office to check the printed reservation together.","Jack declares the issue fixed because an office exists."),
    e("Explain the two real options","We could check the paper with the desk or take a breath here. The beach can wait.","I'll describe those options without promising either outcome.","Jack lays out checking the office or pausing by the car, without assuming Jill's choice.","Jack says the motel owes them a room without evidence."),
    e("Ask Jill what step she would accept","I can offer a choice without turning it into a test of whether she trusts me.","I'll ask which step feels reasonable to her and accept a no.","Jack asks Jill which next step she would choose and waits for her response.","Jack claims Jill agreed because she did not answer instantly.")
   )
  ],
  jill:[
   checkpoint("We arrived late, the motel looks wrong, and Jack is arguing with the GPS like it's a person. I wanted to see the beach.",
    e("Own my disappointed tone","I know he's tired. I'm tired too, but I don't want to make him my enemy.","I'll admit I'm upset without claiming he's trying to ruin the trip.","Jill acknowledges she is disappointed and stops assigning Jack a motive.","Jill calls Jack incompetent instead of discussing the arrival."),
    e("Explain why the beach mattered","We came for the view. Right now the view is a vending machine and a car park.","I'll tell him I was looking forward to the beachfront, not accuse him of ruining everything.","Jill explains that the missed beachfront arrival mattered to her.","Jill tells Jack he never cares about her plans."),
    e("Ask what Jack knows about the booking","The printed confirmation is not the same as checking a room. I can ask what he actually knows.","I'll ask whether he has verified the address with anyone.","Jill asks what Jack knows and what remains unconfirmed.","Jill assumes the motel has canceled them without checking.")
   ),
   checkpoint("He cracked another GPS joke. I would love to be able to laugh. Right now all I see is a parking lot.",
    e("Own that I'm too upset to joke","He isn't automatically malicious because I didn't laugh.","I'll tell him I need a minute, not accuse him of mocking me.","Jill says she is too disappointed to enjoy the joke and asks for space.","Jill treats Jack's bad joke as deliberate humiliation."),
    e("Explain the missed expectation","I had imagined the waves. Instead I got a tour of a parking lot.","I'll explain why the arrival felt disappointing without exaggerating it.","Jill describes the missed beachfront expectation instead of blaming Jack's character.","Jill insists Jack intentionally ruined their vacation."),
    e("Ask whether he understands the disappointment","I can ask a question without demanding he read my mind.","I'll ask if he knows what I had been looking forward to.","Jill asks Jack what he thinks the beachfront plan meant to her.","Jill tests Jack with a question and refuses to hear his answer.")
   ),
   checkpoint("The paper says beachfront; we are not on the beach. I'm tempted to wave it around like a courtroom exhibit.",
    e("Own that the paper doesn't settle the problem","I can stop treating the printed page as a weapon.","I'll admit that I am angry without using the confirmation to attack him.","Jill lowers the printed reservation and stops making it an accusation.","Jill waves the paper to shame Jack."),
    e("Explain why I need certainty","I want to know whether we have a room, not win an argument about turns.","I'll say the uncertainty is what makes me anxious.","Jill says she wants verification rather than another fight about the GPS.","Jill declares their reservation lost before the office is checked."),
    e("Ask for a shared check","I don't want him marching off to fix it without even asking me.","I'll ask what we can verify together.","Jill asks whether they can check the printed details before choosing a next step.","Jill demands that Jack solve it alone as proof he cares.")
   ),
   checkpoint("Jack is looking toward the motel office. We could check, or we could pause. I don't have to pretend the vacation is saved.",
    e("Own one step I can take","I'm allowed to be disappointed and still take part in solving the problem.","I'll offer to bring the printed reservation for a check.","Jill offers to bring the printed reservation if they approach the office together.","Jill refuses every practical action as punishment."),
    e("Explain the boundary I need","I don't want another argument in front of a stranger at the front desk.","I'll ask that we speak respectfully if we choose to approach the office.","Jill proposes keeping accusations out of the next conversation, wherever they go.","Jill demands an apology before allowing Jack to speak to anyone."),
    e("Ask Jack whether he can pause first","He may be too angry to ask for help politely. We can wait a moment.","I'll ask if a short pause would help him settle before we move.","Jill asks whether Jack wants a quiet moment before checking the booking.","Jill decides for him that he must walk to the beach.")
   )
  ]
 },
 outcomeBeats:{
  2:{mutual:"Both acknowledge the arrival was disappointing without making each other the villain.",jack_ready:"Jack starts admitting his part, but Jill remains angry about the lost evening.",jill_ready:"Jill shares her disappointment without blame; Jack is still arguing about the GPS.",partial:"They exchange facts but remain guarded about what the arrival meant.",stalemate:"The GPS remains the target of Jack's complaints, and Jill stops answering."},
  4:{mutual:"They agree to take the printed reservation to the motel office together and ask for verification. No room has been confirmed.",jack_ready:"Jack offers to check the motel office, but Jill hasn't agreed to walk over with him.",jill_ready:"Jill proposes checking the printed reservation, but Jack is still too defensive to join her.",partial:"Both name useful options but cannot agree whether to approach the office or pause.",stalemate:"Neither agrees to check the office or pause together. The printed reservation is still unverified."},
  5:{mutual:"Jack holds out the paper for Jill to carry. 'No more asking the GPS to apologize,' he says. They smile briefly, but remain by the car, ready to approach the office. The room is still unconfirmed.",jack_ready:"Jack stands beside the car with an offer to check. Jill gives no agreement; he does not walk away as if she did.",jill_ready:"Jill folds the paper and keeps it ready. Jack has not committed to checking with her.",partial:"They remain by the car; the next step is unresolved despite some calmer words.",stalemate:"Jack switches off the GPS. Jill stays beside the car, holding the confirmation. There is no shared plan and no verified room."}
 },
 closureFocus:"A repair attempt names what is known and leaves space for a partner's frustration. An offer is not a two-person decision until both accept it."
};
export const authored41Additional=[compile(conversation),compile(vacation)];
