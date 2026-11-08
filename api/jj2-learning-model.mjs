// Anthos Jack & Jill Method: versioned, reusable learning architecture.
// These are INTERNAL objectives. The customer hears only Sophia's voice.
export const MODEL_VERSION = "2.1.0";
export const ANDRAGOGY = Object.freeze([
  "need_to_know", "self_direction", "practical_relevance", "prior_experience",
  "learning_by_doing", "readiness", "motivation"
]);
export const PHASES = Object.freeze(["hook", "conflict", "discovery", "reattempt", "outcome", "reflection"]);
export const MILESTONES = Object.freeze([
  "Recognize", "Interpret", "Navigate", "Regulate",
  "Differentiate", "Discover", "Apply", "Reflect"
]);
export const AGENTS = Object.freeze([
  "Story Director", "Learning Guide", "Dialogue Coach", "Decision Director",
  "Privacy Guardian", "Reflection Guide", "Quality Assurance"
]);
// A checkpoint is a DECISION, not a test or a particular chapter.
export const LEARNING_ARCS = Object.freeze([
  ["Recognize", "Interpret"],
  ["Interpret", "Navigate"],
  ["Navigate", "Regulate"],
  ["Regulate", "Differentiate"],
  ["Discover", "Apply", "Reflect"]
]);
export const RESEARCH = Object.freeze({
  bids: {
    source: "Gottman", skill: "Interpret",
    claim: "Noticing a partner's small attempts to connect creates opportunities to respond.",
    anchor: "Gottman & DeClaire, The Relationship Cure (2001)"
  },
  repair: {
    source: "Gottman", skill: "Navigate",
    claim: "Attempts to repair tension can interrupt escalating conflict.",
    anchor: "Gottman & Silver, The Seven Principles for Making Marriage Work (1999)"
  },
  regulation: {
    source: "Schnarch", skill: "Regulate",
    claim: "Self-regulation allows an individual to remain engaged despite relational discomfort.",
    anchor: "Schnarch, Passionate Marriage (1997)"
  },
  differentiation: {
    source: "Schnarch", skill: "Differentiate",
    claim: "Partners can maintain a distinct sense of self while staying connected.",
    anchor: "Schnarch, Passionate Marriage (1997)"
  },
  shared_novelty: {
    source: "Aron", skill: "Discover",
    claim: "Shared novel, engaging activities may contribute to relationship quality and closeness.",
    anchor: "Aron et al., Couples' shared participation in novel and arousing activities (2000)"
  }
});
export const THEMES = Object.freeze({
  christmas: {
    id: "christmas", title: "A Christmas Conundrum",
    premise: "Jack and Jill made conflicting holiday commitments without consulting each other.",
    perspectives: {jack:"Jack wants Christmas with his family but hasn't disclosed his promise to Jill.",jill:"Jill wants to honor her family but has not coordinated plans with Jack."},
    conflicts: ["assumptions", "family expectations", "repair", "differing needs"],
    lessonKeys: ["repair", "regulation", "differentiation", "bids", "shared_novelty"],
    humor: ["awkward family calls", "unexpected guests", "overconfident planning", "unfortunate holiday logistics"],
    opening: {
      scene: "Friday, 6:14 p.m. Jack and Jill stand in their kitchen. Jack promised his mother Christmas dinner. Jill already promised hers. Neither mentioned it. Their phones buzz: each mother has sent a photo of place settings with their names on them. The oven timer rings, although nothing is cooking.",
      location: "Jack and Jill's kitchen, Friday evening",
      facts: ["Jack promised Christmas dinner to his mother", "Jill promised Christmas dinner to her mother", "Both mothers sent place-setting photos"],
      tension: "Unspoken conflicting holiday commitments",
      research: "Recognize expectations before choosing a response"
    },
    suggestedApplication: "Ask what a meaningful family tradition represents before agreeing to a plan."
  },
  anniversary: {
    id: "anniversary", title: "The Forgotten Anniversary",
    premise: "A well-intentioned surprise collides with an unspoken expectation.",
    perspectives: {jack:"Jack wanted to create a meaningful anniversary but overlooked an expressed preference.",jill:"Jill expressed a preference and must decide how to handle the surprise on her own terms."},
    conflicts: ["connection", "assumptions", "repair"],
    lessonKeys: ["bids", "repair", "differentiation"],
    humor: ["the wrong restaurant", "a mistaken reservation", "an extravagant unwanted surprise"],
    opening: {
      scene: "Jack proudly presents an elaborate anniversary surprise. Jill smiles, then spots a reservation for the one place she asked not to go. Jack whispers that he got a nonrefundable package. A server approaches holding a sparkler.",
      location: "A restaurant entrance, anniversary evening",
      facts: ["Jack planned a surprise", "Jill previously expressed a different preference"],
      tension: "Good intentions clash with unheard preferences",
      research: "Notice opportunities to understand a bid for connection"
    },
    suggestedApplication: "Ask what makes a special occasion meaningful to each of you."
  },
  getaway: {
    id: "getaway", title: "The Weekend Getaway",
    premise: "Jack wants adventure and Jill wants rest, both imagining the same weekend very differently.",
    perspectives: {jack:"Jack came for adventure but an unexpected early-morning challenge may crowd out Jill's hoped-for rest.",jill:"Jill came for books and quiet, while the cabin hosts expect a surprise sunrise challenge. Jill controls her own response."},
    conflicts: ["differing needs", "shared novelty", "collaboration"],
    lessonKeys: ["differentiation", "shared_novelty", "regulation"],
    humor: ["unexpected weather", "a ridiculous activity brochure", "two incompatible itineraries"],
    opening: {
      scene: "Friday evening. Jack sets his hiking poles beside the cabin door; Jill drops three novels and slippers onto the bed. Between them sits an envelope: 'CONGRATULATIONS! Your Couples Sunrise Challenge begins at 5:45 a.m. Waivers due tonight.' Outside, a guide in a fluorescent poncho unloads two helmets. Neither remembers booking the challenge.",
      location: "A cabin on Friday evening",
      facts: ["Jack hoped for adventure", "Jill hoped for quiet time", "A sunrise challenge is scheduled for 5:45 a.m.", "The guide expects waivers tonight"],
      tension: "Two genuine needs and one short weekend",
      research: "Respect different needs while exploring options together"
    },
    suggestedApplication: "Choose one small new activity that respects both partners' preferences."
  }
});
export function getTheme(key) { return THEMES[key] || THEMES.christmas; }
export function lessonFocus(checkpoint, key = "christmas") {
  const theme = getTheme(key);
  return {milestones: LEARNING_ARCS[Math.max(0, Math.min(4, checkpoint - 1))],
    sources: theme.lessonKeys.map(k => RESEARCH[k]), theme: theme.title};
}
export function hasAction(action) {
  return typeof action === "string" && action.trim().length >= 8 && action.trim().length <= 900;
}
// Conservative fallback: accept only explicit instructions for the coached character.
export function explicitCharacterDecision(role, message) {
 const name=role==="jill"?"Jill":"Jack";
 const cleaned=typeof message==="string"?message.trim():"";
 if(cleaned.length<12||cleaned.length>900)return "";
 const stripped=cleaned.replace(/^(?:no[,.!]?\s*)?(?:(?:i think|i feel|i believe|my advice is that|i would say|i'd say)\s+)?/i,"");
 const pattern=new RegExp("^"+name+"\\s+(?:should|needs to|has to|must|can|could|will|would|ought to|tells?|asks?|suggests?|apologizes?|invites?|decides?|offers?|plans?|chooses?|agrees?|explains?|insists?|says?|goes?|takes?|calls?)\\b","i");
 return pattern.test(stripped)?stripped.slice(0,900):"";
}

export function resolveReadiness({action, priorReady = false}) {
  // A valid, character-owned decision is the gate. It is not an AI mastery test.
  return Boolean(priorReady || hasAction(action));
}
export function avoidRepetitiveResponse(reply, priorSophia = []) {
  if (typeof reply !== "string" || reply.trim().length < 12) return false;
  const r = reply.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const repeated = priorSophia.slice(-2).some(m => {
    const p = String(m.body || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    return p && (r === p || (r.length > 50 && p.length > 50 && (r.includes(p) || p.includes(r))));
  });
  return !repeated;
}
export function storyIsSafe(story, canon, decisions) {
  if (!story || typeof story !== "object" || !Array.isArray(story.facts)) return false;
  for (const f of ["outcome", "scene", "location", "tension", "research"]) {
    if (typeof story[f] !== "string" || story[f].trim().length < (f === "location" ? 3 : 8)) return false;
  }
  if (story.facts.length > 8) return false;
  if (story.outcome.length > 2500 || story.scene.length > 1300) return false;
  if (story.outcome.toLowerCase() === (canon?.scene || "").toLowerCase()) return false;
  // Shared output must not copy a substantial private directive verbatim.
  const shared = (story.outcome + " " + story.scene).toLowerCase();
  if (decisions.some(d => typeof d === "string" && d.length >= 42 && shared.includes(d.toLowerCase()))) return false;
  return true;
}
export function coachingGuide({role, checkpoint, themeKey, name, canon, history, scenario=null, mode="shared"}) {
  const focus = lessonFocus(checkpoint, themeKey);
  const sources=scenario?Object.values(RESEARCH).filter(x=>scenario.research_lenses?.includes(x.source.toLowerCase())):focus.sources;
  const roleName = role === "jack" ? "Jack" : "Jill";
  return {
    instructions: [
      "You are SOPHIA: one witty, attentive, human-sounding guide. Never reveal internal roles, milestones, research labels, grades or chapter names.",
      "The participant exclusively coaches " + roleName + ". Never have the participant decide the other fictional character's response or motivation.",
      "Honor the two privately directed characters and one shared canonical world. Before both submit, illustrate only POSSIBLE consequences; never commit another character's response.",
      "Respond to the participant's actual advice with a playful fictional possibility and one useful insight or question, NOT a compliment sandwich or repeated interrogation.",
      "No forced 'right answer'. Even intentionally reckless fictional decisions are allowed and may create funny consequences.",
      "Do not repeat a prior question. If an action for THIS coached character is proposed, respond and invite advancement immediately. Never demand the participant agree with your advice. Do not treat an instruction controlling the other fictional character as a valid decision.",
      "Keep replies about 35 to 90 words, with sparing natural humor. Be brief when the user is decisive; expand only when requested.",
      "At each NEW checkpoint the canonical event has advanced. Do not recycle the last checkpoint decision or re-teach the same issue. The latest CURRENT scene is your anchor. Offer a specific action that affects the new obstacle.",
      "When the user makes an actionable proposal, reflect its potential fictional consequence then invite advancement; do not request improved phrasing. A bare assent such as Sounds good is NOT a new character action.",
      "Use a research insight only where it fits the character's actual behavior. No invented research claims, no copied worksheets. Do not name researchers every turn.",
      "Return private JSON with reply, decision, decisionEvidence, phase, learningEvidence, learningMilestones. A decision is an ACTION for " + roleName + ", not a reflection, question or the partner's action.",
      "decisionEvidence must be an exact short substring from the participant's OWN text in this turn that supports the action, or empty if no NEW action is proposed.",
      "Do not invent, quote or disclose the real spouse's private words, experiences or feelings. No diagnostics or therapy.",
      "If the participant describes coercion, abuse or danger, drop playful escalation, avoid couple-blaming and give appropriate safety-oriented guidance."
    ].join(" "),
    context: {role: roleName, coachName:name||"", milestoneFocus:focus.milestones,
      theme:scenario?.title||focus.theme, storyObjective:scenario?.learning_objective||null,
      petal:scenario?.petal_slug||null,mode,allowedResearch:sources, currentCanon:canon,
      privateRecentMessages:history.slice(-12)}
  };
}
export function storyGuide({checkpoint, themeKey, canon, jackAction, jillAction, scenario=null, mode="shared", soloRole="jack"}) {
  const theme=scenario?{title:scenario.title,premise:scenario.learning_objective,
     conflicts:[scenario.learning_objective],humor:["An unforeseen complication grounded in the current opening","A comically awkward practical consequence","A genuine choice with competing legitimate needs"]}:getTheme(themeKey);
  return {
    instructions: [
      mode==="individual"?"This is a SOLO, privately visible fictional story. The participant coaches only "+(soloRole==="jill"?"Jill":"Jack")+"; you independently direct the other fictional character as an NPC, never attributing their thoughts to a real spouse.":"This is a SHARED, two-coach fictional story. Both submitted actions are independent.",
      mode==="individual"?"You direct a private, improvisational Jack and Jill story. One human has committed the coached character\'s action; you direct the other character as an NPC.":"You direct one canonical, improvisational Jack and Jill world. Two authenticated coaches have separately committed actions.",
      mode==="individual"?"Resolve the human-coached action and the fictional NPC\'s independent response. Do not pretend the other character has a real human coach.":"Resolve BOTH coached actions and show material consequences. Neither character can be controlled by the OTHER coach.",
      "Track the fictional location, timeline, objects, prior promises and unresolved emotions. No resets, contradictory scene jumps or memory loss.",
      "Make consequences gently humorous and increasingly challenging, not degrading. Even good choices can face external complications.",
      "Do not print or quote coach instructions. You receive only consented character actions, not private conversation transcripts.",
      "The learning objective informs the fictional situation without becoming a lecture. Never diagnose real couples.",
      "Write 80-145 words of shared outcome, 35-80 words of next scene, and a concise accurate private research note.",
      "The NEXT scene must feature a concrete, surprising new obstacle and an immediate meaningful decision for EACH character. It must not merely describe the same negotiation in a new paragraph.",
      "Never falsely claim the characters have agreed when their separately submitted proposals conflict. Show the real collision of their two approaches and carry unresolved friction forward.",
      "Scene must specify place, who is present, a new external event, and a choice with stakes; no generic phrases like they need to communicate or find a plan.",
      "Strict JSON: outcome,scene,location,tension,research,facts. No chapter headings, lessons, scores, or researcher labels in story prose.",
      "End with a natural new dilemma or a meaningful fictional closing at the fifth decision."
    ].join(" "),
    context: {theme:scenario?.title||theme.title, premise:scenario?.opening_scene||theme.premise, conflicts:scenario?[scenario.learning_objective]:theme.conflicts, humorIdeas:theme.humor,
      scenarioMode:mode, soloRole, checkpoint, currentCanon:canon, jackAction,jillAction, milestoneFocus:lessonFocus(checkpoint, themeKey).milestones}
  };
}

/** One private Sophia opening per participant; canon remains shared. */
export function openingGuide({role,themeKey,canon,name,scenario=null,mode="shared",checkpoint=1}){
 const theme=scenario?{title:scenario.title,premise:scenario.learning_objective,perspectives:{}}:getTheme(themeKey);
 const character=role==="jill"?"Jill":"Jack";
 const ongoing=checkpoint>1;
 return {
  instructions:[
   "You are Sophia, the one natural, witty guide in Anthos Jack & Jill.",
   ongoing?"A shared fictional consequence JUST OCCURRED. Create a brand-new private text that pulls the coach into the NEW dilemma, not the previous problem.":"Open the first private fictional dilemma.",
   "The canonical scene is displayed separately. Speak to the coach of "+character+" as if the next fictional moment is happening now.",
   "Do not restate the whole scene or summarize prior learning. Use two concrete details of the CURRENT scene. Make the practical complication urgent and entertaining.",
   "Pose ONE specific, consequential question about what "+character+" will do next. The answer must change the fictional story.",
   "Do not dictate the other character's thoughts, emotions, choices or response. Their coach independently controls them.",
   "If the characters' earlier proposals conflict, do not claim they agreed. Show uncertainty until both choices meet.",
   "Never say 'what would you tell your character', 'how might', or other generic coaching prompts.",
   "Do not cite researchers, educational milestones, phases or agent roles. Weave the underlying skill into the natural situation.",
   "Keep 45–85 words. Be lively, playful, and concrete. No lecturing or repetitive praise."
  ].join(" "),
  context:{adventure:scenario?.title||theme.title,objective:scenario?.learning_objective||theme.premise,
    character,coachName:name||"",mode,checkpoint,currentCanon:canon,
    perspective:scenario?("Guide "+character+" through "+scenario.learning_objective):theme.perspectives?.[role]||""}
 };
}
