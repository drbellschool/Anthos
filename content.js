/* Threefold — Stage 1 demo content. Fictional and local-only; not live AI advice. */
window.THREEFOLD_CONTENT = Object.freeze({
  whispers: [
    {theme:"Notice",question:"What is one ordinary thing your partner does that makes your day a little lighter?",nudge:"Specific moments mean more than a general compliment."},
    {theme:"Desire",question:"What small gesture makes you feel genuinely wanted—not just needed?",nudge:"You can name a desire without demanding a response."},
    {theme:"Adventure",question:"What is something new you would secretly love to try together?",nudge:"An invitation works better than an expectation."},
    {theme:"Memory",question:"What moment in your story would you happily experience all over again?",nudge:"Notice what made it meaningful."},
    {theme:"Curiosity",question:"What do you admire about who your partner is becoming?",nudge:"Keep discovering the person beside you."},
    {theme:"Tenderness",question:"When did your partner make you feel safe, understood, or welcome?",nudge:"Share an example they may not realize mattered."},
    {theme:"Play",question:"If we had two unexpected free hours, what would you hope we'd do?",nudge:"Let the answer be playful, not productive."},
    {theme:"Gratitude",question:"What's one quiet sacrifice your partner makes that deserves to be seen?",nudge:"Appreciation can be concrete and unforced."}
  ],
  dates: [
    {
      id:"first-braid", title:"The First Braid", category:"Make something meaningful",
      mood:["romantic","creative","quiet"], baseCost:20, minutes:75,
      intro:"Make a small three-strand cord or wall hanging together. With every knot, give that strand a meaning: you, me, and what holds us together.",
      supplies:"Three lengths of cotton cord or yarn, scissors, and a place to hang it.",
      steps:[
        "Choose three cord colors and decide what each strand represents.",
        "Tie the first knot together. Each person shares one hope for this season.",
        "Braid slowly and alternate a favorite memory with a future adventure.",
        "Hang the cord somewhere you'll notice it. Add a few more folds after future Deep Dives."
      ],
      atHome:true
    },
    {
      id:"passport", title:"The Two-Person Passport", category:"A taste of somewhere new",
      mood:["playful","romantic"], baseCost:35, minutes:90,
      intro:"Pick a place neither of you has visited, then make one small evening feel like a trip there.",
      supplies:"A new recipe or snack, a playlist, and a sheet of paper for your pretend passport.",
      steps:[
        "Each person picks a place they'd love to explore.",
        "Choose one destination together and make or buy a snack inspired by it.",
        "Play music from the destination and trade three curiosity questions.",
        "Stamp your imaginary passports and choose your next destination."
      ],
      atHome:true
    },
    {
      id:"sunset", title:"The Golden-Hour Detour", category:"Get out of routine",
      mood:["quiet","playful","romantic","creative"], baseCost:0, minutes:60,
      intro:"Take the longer way to a familiar place. Bring a favorite drink from home and turn an ordinary evening into a first-date conversation.",
      supplies:"Comfortable shoes, a drink from home, and an agreed-upon public place.",
      steps:[
        "Pick a safe, public spot where you can talk without rushing.",
        "Each choose a song for the trip or walk.",
        "Ask: 'What have I not learned about you lately?'",
        "End by choosing one small thing you'd like to do again."
      ],
      atHome:false
    }
  ],
  dive: {
    id:"christmas-tug-of-war",title:"Christmas Tug-of-War",
    eyebrow:"Deep Dive 01 · A story about choosing together",
    overview:"Two people. One holiday. Competing family traditions. Explore how connection, boundaries, and repair shape the next chapter.",
    characters:"Jack and Jill are fictional. Your choices shape their next conversation, not your own partner's behavior.",
    chapters:[
      {
        title:"The Invitation",location:"Chapter 1 · Friday evening",
        story:"Jack's mother has planned Christmas breakfast at her home. Jill has quietly pictured their first Christmas morning at home. Both people are excited—and neither knows how much the tradition matters to the other.",
        takeaway:"Different hopes do not mean opposing teams. Curiosity comes before the calendar.",
        transition:"Later that night, Jill brings up their Christmas plans."
      },
      {
        title:"What Matters Here?",location:"Chapter 2 · At the kitchen table",
        story:"Jill says, 'I'd love Christmas morning to be ours this year.' Jack feels a flash of worry about disappointing his mother. Jill notices him go quiet.",
        prompt:"What should Jack say next?",
        options:[
          {text:"Tell me what Christmas morning at home means to you.",impact:"Jill relaxes a little. Jack still has concerns, but they now have a conversation rather than competing declarations.",coach:"Gottman's curiosity and a response to a bid for connection create room for both perspectives.",quality:2},
          {text:"My mom expects us there; this really isn't up for debate.",impact:"Jill feels dismissed. She stops offering ideas, and the distance grows.",coach:"Certainty skips over a partner's bid. A repair would begin with acknowledging that dismissal.",quality:0},
          {text:"Fine. We'll stay home, but you can explain it to Mom.",impact:"The words sound like agreement, but the responsibility has been pushed onto Jill.",coach:"Compliance with resentment is not joint decision-making. Jack still needs to own his part.",quality:0},
          {text:"I want some time to think. Can we talk again after dinner?",impact:"Jill is uncertain, but Jack returns later as promised and can participate more calmly.",coach:"A time-out can help when it includes a concrete promise to return to the conversation.",quality:1},
          {text:"I'm worried my mother will be hurt. Can we find a way to honor both traditions?",impact:"Jack makes his fear visible without putting it on Jill to fix.",coach:"Differentiation means expressing a genuine concern without surrendering a shared decision.",quality:2},
          {text:"Why does your family always have to change everything?",impact:"The discussion turns defensive, though Jill says she only wants to talk about their own morning.",coach:"Global blame obscures the actual request. Name the fear rather than attributing motives.",quality:0}
        ]
      },
      {
        title:"The Real Meaning",location:"Chapter 3 · A quieter conversation",
        story:"Jill explains that she isn't trying to take Jack away from his family. She wants the two of them to build memories that belong to their marriage. Jack realizes he has been trying to prevent someone else's disappointment before listening to his wife.",
        takeaway:"Aron's work on shared new experiences suggests that building a tradition together can deepen connection. It's not a replacement for loving extended family.",
        transition:"They sketch a plan: Christmas morning at home, then alternating grandparent dinners."
      },
      {
        title:"A Plan of Their Own",location:"Chapter 4 · Making the calendar",
        story:"They agree: Christmas morning belongs to their home, and grandparent dinners will alternate, starting with Jill's mother this year. Jack remembers he promised his own mother they'd always come for breakfast.",
        prompt:"How should Jack handle that old promise?",
        options:[
          {text:"Own the promise and tell Jill he will personally explain the new plan.",impact:"Jill feels like a teammate. Jack prepares to have an uncomfortable but honest conversation.",coach:"Owning one's commitment and communicating a shared decision is a differentiated response.",quality:2},
          {text:"Ask Jill to call his mother because she proposed staying home.",impact:"Jill reluctantly agrees, but feels she will be blamed for the decision.",coach:"Delegating the hard conversation can create an unfair alliance against a partner.",quality:0},
          {text:"Say nothing and hope his mother forgets about breakfast.",impact:"The short-term tension disappears, but the surprise later is likely to hurt everyone.",coach:"Avoidance protects immediate comfort but often makes a future repair harder.",quality:0},
          {text:"Call his mother and explain that Jill won't let them come.",impact:"His mother becomes angry at Jill. Jack has disguised the couple's joint choice.",coach:"Speak as a 'we' when a decision belongs to both people. Blame erodes trust.",quality:0},
          {text:"Ask Jill if they can agree on exactly what they'll say before calling.",impact:"They find language that respects both families without bargaining away the decision.",coach:"Shared planning supports connection while allowing one spouse to hold a boundary.",quality:2},
          {text:"Reconsider everything because upsetting his mother feels unbearable.",impact:"Jill hears that agreement may disappear whenever family pressure arrives.",coach:"Discomfort is real, but it does not have to control a jointly made decision.",quality:1}
        ]
      },
      {
        title:"The First Phone Call",location:"Chapter 5 · Saturday afternoon",
        story:"Jack calls his mother. He tells her they won't attend breakfast this year. She's disappointed and reminds him how important Christmas morning has always been. Jack feels the pull to fix her feelings immediately.",
        takeaway:"A loving boundary leaves room for another person's feelings. Respect is different from taking responsibility for their disappointment.",
        transition:"His mother calls back that evening, upset."
      },
      {
        title:"Pressure on the Line",location:"Chapter 6 · Saturday evening",
        story:"Jack's mother says she has already set out the special breakfast dishes. Jill overhears the conversation and starts to worry that Jack will resent her. Jack can notice that worry without making Jill responsible for the call.",
        takeaway:"A relationship can hold a difficult feeling without turning a partner into the problem. A gentle check-in is often a stronger bid than withdrawing.",
        transition:"His mother's next words are sharper: 'After all I've done, Jill is pulling you away from your family.'"
      },
      {
        title:"The Moment of Choice",location:"Chapter 7 · The independent mastery test",
        story:"Jack hears his mother blame Jill. He's angry and embarrassed. Jill is watching him, unsure whether he'll stand beside their decision or make her defend it. His mother is still on the phone.",
        prompt:"What should Jack do now? Choose independently. There is no hint before your decision.",
        mastery:true,
        options:[
          {text:"Mom, I understand you're disappointed. This was our decision, and I won't let Jill be blamed for it.",impact:"His mother remains upset and ends the call. Jill sees Jack take responsibility without attacking his mother.",coach:"Strong demonstration: joint ownership, a respectful boundary, and differentiation under pressure.",quality:2},
          {text:"You always manipulate me with guilt. That's why nobody wants to visit!",impact:"His mother hangs up feeling attacked. Jill appreciates the intention to defend her but is unsettled by the escalation.",coach:"He defended a boundary through contempt and global blame. Repair would mean apologizing for the attack while keeping the decision intact.",quality:0},
          {text:"Jill is the one who wants this, but I have to support her.",impact:"His mother targets Jill more intensely. Jill feels exposed and alone.",coach:"This abandons shared ownership and turns support into a reluctant favor.",quality:0},
          {text:"I'm not doing this on the phone right now. We'll talk when we're calmer.",impact:"He ends the call without escalation. Later he must follow through and clearly state the couple's decision.",coach:"A bounded pause can help. It demonstrates partial mastery only if followed by respectful ownership.",quality:1},
          {text:"You're right, Mom. We'll come to breakfast after all.",impact:"His mother is relieved, but Jill finds out their agreement was changed without her.",coach:"The immediate pressure ended by sacrificing joint decision-making.",quality:0},
          {text:"I love you, Mom, and I'm looking forward to seeing you later. Christmas morning will be at our house this year.",impact:"His mother sounds hurt. Jack stays kind, consistent, and accountable for the decision.",coach:"Strong demonstration: warmth without surrendering the boundary or blaming Jill.",quality:2}
        ]
      },
      {
        title:"A New Tradition",location:"Chapter 8 · Christmas morning",
        story:"Christmas arrives quietly. Their morning is imperfect: the cinnamon rolls burn, the phone rings twice, and Jack is still a little sad his mother is disappointed. Jack and Jill laugh at the ruined breakfast and start a tradition that belongs to them. Later, they visit Jill's family as planned. The family tension hasn't magically vanished, but they've learned to face it side by side.",
        takeaway:"A satisfying ending need not be a perfect one. Partnership grows through repeated choices, ordinary repair, and moments of shared discovery.",
        transition:"Complete this Deep Dive to add the eighth crossing to your threefold cord."
      }
    ]
  }
});