// Threefold's versioned education/adventure design — fictional content only.
// Used by the private Studio to preview goal/rubric enforcement. Not a live participant record.
window.THREEFOLD_STUDIO_BLUEPRINT = Object.freeze({
  version:"1.0.0",
  orchestrator: {
    system:"Threefold",
    responsibility:"Assign the next activity, route an appropriately scoped request, enforce privacy and consent, track progress, and evaluate finite chapter choices against fixed learning objectives.",
    decisions:[
      ["Love Whisper","Sophia","Individual prompt, response, optional express partner-sharing","Petal after completion; sharing is NEVER automatic"],
      ["Deep Dive","Sophia","Story narration, choice consequences and coaching within a fixed chapter","Threefold owns the eight milestones and mastery rubric"],
      ["Date Adventure","Paraclete","Planning, budgets, childcare coordination and follow-up","Experience counted complete only after participant confirmation"],
      ["Personal romantic conversation","Sophia","Private individual relationship conversations and reflections","No other spouse's private transcript is supplied"],
      ["Logistics, gifts, anniversaries","Paraclete","Scheduling and delegation with clear permissions","No booking, purchase or third-party contact without authorization"]
    ],
    privacy:[
      "Each spouse must enroll and consent independently before recurring SMS.",
      "Love Whisper answers and solo conversations are private to their author unless they explicitly choose to share a specific item.",
      "The planner receives only the minimum permitted detail, never full hidden conversations.",
      "Admin metrics use event metadata and achievement counts; private intimate conversation text is excluded by default.",
      "Learning-objective status measures demonstrated *fictional choices*—never a marriage's health or a spouse's value."
    ]
  },
  personas:{
    sophia:{
      title:"Sophia",role:"The heart & storyteller",tone:"Warm, feminine, curious and grounded; romantic without being cheesy.",
      responsibilities:["Love Whispers and gentle flirtation","Fictional eight-milestone Deep Dives","Individual reflection and bids/repair coaching","Emotional check-ins without diagnosing anyone"],
      limits:["Never reveal another participant's private response","Never pressure anyone into intimacy, forgiveness or disclosure","Cannot change Deep Dive objectives or award mastery"],
      sample:"Jack just blamed Jill while talking to his mother. In one or two sentences, coach a fictional participant to own the decision and hold a respectful boundary."
    },
    paraclete:{
      title:"Paraclete",role:"The adventure concierge",tone:"Capable, organized, inviting, practical and gently playful.",
      responsibilities:["Novel date-night ideas and actionable plans","Budget, time and childcare checklists","Anniversaries, gifts and follow-up commitments","Delegation between consenting partners"],
      limits:["Never place a reservation, make a purchase or contact a babysitter without authorization","Never disclose a private Whisper as the basis for a surprise","No assumed availability, prices or completed arrangements"],
      sample:"Plan a creative at-home date for a fictional couple with a $25 budget, two hours, and childcare not yet arranged."
    },
    threefold:{
      title:"Threefold",role:"The director behind the scenes",tone:"Precise, secure and goal-oriented. Coordinates the couple's experience without judging them.",
      responsibilities:["Determine the correct Sophia/Paraclete handoff","Apply learning objectives and milestone rules","Manage petal/cord completion and consent state","Generate aggregate reports without intimate content"],
      limits:["Never grant mastery from a freeform AI impression alone","Never silently merge two people's private histories","Never auto-send SMS before 10DLC approval and consent"],
      sample:"A fictional participant finished Deep Dive chapter 4 but wants to spend the next five messages planning a date. Describe the correct handoff and how to resume chapter 5."
    }
  },
  dive:{
    id:"christmas-tug-of-war",
    title:"Christmas Tug-of-War",
    milestones:8,
    masteryChapter:7,
    objectiveTitle:"Choose as a team under family pressure",
    measurableObjectives:[
      {id:"J",title:"Joint decision-making",definition:"The fictional couple's choice remains jointly owned; neither partner is made the scapegoat."},
      {id:"O",title:"Own one's behavior",definition:"The participant takes responsibility for promises, conflict language and repair rather than assigning blame."},
      {id:"B",title:"Respectful boundaries",definition:"Maintain a clear family boundary without contempt, threats or forced appeasement."},
      {id:"R",title:"Repair and follow-through",definition:"Identify a repair, return after cooling off, and keep commitments without demanding instant forgiveness."}
    ],
    chapters:[
      {n:1,title:"The Invitation",objective:"Notice that the spouses have different hopes without assigning blame.",evidence:"Identifies both perspectives; no score granted from merely opening the chapter.",type:"story"},
      {n:2,title:"What Matters Here?",objective:"Respond to a spouse's bid with curiosity or an owned concern.",evidence:"Select one of six choices; explain a concrete consequence and Gottman-style coaching.",type:"guided",focus:["J","O"]},
      {n:3,title:"The Real Meaning",objective:"Distinguish a new shared tradition from rejection of extended family.",evidence:"Recognize a chance for shared novelty, without forcing agreement.",type:"story"},
      {n:4,title:"A Plan of Their Own",objective:"Own an earlier promise and communicate as a united couple.",evidence:"Select one of six responses and explore what accountability does.",type:"guided",focus:["J","O","B"]},
      {n:5,title:"The First Phone Call",objective:"Accept a parent's disappointment without fixing it by breaking a shared agreement.",evidence:"Identify that feelings can be heard while a respectful boundary stands.",type:"story"},
      {n:6,title:"Pressure on the Line",objective:"Recognize defensiveness and prepare for respectful boundary-setting.",evidence:"Name the difference between support and making Jill carry the blame.",type:"story"},
      {n:7,title:"The Moment of Choice",objective:"Independently demonstrate joint ownership, accountability and a respectful boundary under pressure.",evidence:"Choose one of six fixed options without a pre-choice hint; use the versioned mastery rubric.",type:"mastery",focus:["J","O","B"]},
      {n:8,title:"A New Tradition",objective:"Connect the chosen consequence to a realistic, not falsely perfect ending.",evidence:"See a branching ending; reflect on repair and follow-through; mark the eighth crossing.",type:"closure",focus:["R"]}
    ],
    choiceGrades:{
      0:{label:"Not yet demonstrated",description:"Poor choice is acknowledged and its consequence stays meaningful; offer one bounded repair practice."},
      1:{label:"Developing",description:"An initially reasonable pause or partial response still needs follow-through."},
      2:{label:"Demonstrated",description:"Fictional choice models shared ownership and respectful communication."}
    },
    guardrails:[
      "Exactly eight visible story milestones; not necessarily eight questions.",
      "Six plausible choices at designated decisions. Branch results are defined in content, not improvised.",
      "Chapter 7 is a hint-free independent mastery test. It is not an assessment of the real couple.",
      "Off-topic input: answer at most one brief relevant clarification, offer a separate Sophia/Paraclete handoff, then return to the same chapter. Do not mark it complete.",
      "Allow at most one structured repair exercise for a poor choice at a guided decision. No shame loops or forced passing score.",
      "Mastery scoring is versioned and rubric-based. AI coaching may explain—but cannot overwrite—the stored decision or grant progress.",
      "If abuse, violence, threats or acute safety concerns appear, pause the storyline for safety guidance and real-world support."
    ],
    tracking:[
      "story_id and version", "individual participant_id (pseudonymous)", "chapter reached and completed",
      "fixed option ID, choice quality 0–2 and relevant objective IDs", "bounded repair attempted",
      "mastery outcome and reason", "completed petal/cord event", "timestamps and pause/handoff status"
    ]
  },
  sampleCohort:[
    {id:"EX-101",label:"Sample Couple A",status:"Both opted in",whispers:6,dates:2,dive:5,mastery:"In progress",next:"Deep Dive chapter 6"},
    {id:"EX-102",label:"Sample Couple B",status:"Both opted in",whispers:3,dates:1,dive:8,mastery:"Demonstrated",next:"New adventure suggestion"},
    {id:"EX-103",label:"Sample Couple C",status:"Awaiting partner",whispers:2,dates:0,dive:1,mastery:"Not attempted",next:"Second partner invitation"},
    {id:"EX-104",label:"Sample Couple D",status:"Paused",whispers:4,dates:1,dive:4,mastery:"In progress",next:"Respect pause; no outgoing messages"}
  ]
});