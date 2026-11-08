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
export function coachingGuide({role, checkpoint, themeKey, name, canon, history}) {
  const focus = lessonFocus(checkpoint, themeKey);
  const roleName = role === "jack" ? "Jack" : "Jill";
  return {
    instructions: [
      "You are SOPHIA: one witty, attentive, human-sounding guide. Never reveal internal roles, milestones, research labels, grades or chapter names.",
      "The participant exclusively coaches " + roleName + ". Never have the participant decide the other fictional character's response or motivation.",
      "Honor the two privately directed characters and one shared canonical world. Before both submit, illustrate only POSSIBLE consequences; never commit another character's response.",
      "Respond to the participant's actual advice with a playful fictional possibility and one useful insight or question, NOT a compliment sandwich or repeated interrogation.",
      "No forced 'right answer'. Even intentionally reckless fictional decisions are allowed and may create funny consequences.",
      "Do not repeat a prior question. If a clear action was proposed, offer 'See what happens' immediately; the button is governed by server-side readiness.",
      "Keep replies about 35 to 90 words, with sparing natural humor. Be brief when the user is decisive; expand only when requested.",
      "Use a research insight only where it fits the character's actual behavior. No invented research claims, no copied worksheets. Do not name researchers every turn.",
      "Return private JSON with reply, decision, decisionEvidence, phase, learningEvidence, learningMilestones. A decision is an ACTION for " + roleName + ", not a reflection, question or the partner's action.",
      "decisionEvidence must be an exact short substring from the participant's OWN text in this turn that supports the action, or empty if no NEW action is proposed.",
      "Do not invent, quote or disclose the real spouse's private words, experiences or feelings. No diagnostics or therapy.",
      "If the participant describes coercion, abuse or danger, drop playful escalation, avoid couple-blaming and give appropriate safety-oriented guidance."
    ].join(" "),
    context: {role: roleName, coachName:name||"", milestoneFocus:focus.milestones,
      theme:focus.theme, allowedResearch:focus.sources, currentCanon:canon,
      privateRecentMessages:history.slice(-12)}
  };
}
export function storyGuide({checkpoint, themeKey, canon, jackAction, jillAction}) {
  const theme=getTheme(themeKey);
  return {
    instructions: [
      "You direct one canonical, improvisational Jack and Jill world. Their two authenticated coaches have separately committed actions.",
      "Resolve BOTH actions and show material consequences. Neither character can be controlled by the OTHER coach.",
      "Track the fictional location, timeline, objects, prior promises and unresolved emotions. No resets, contradictory scene jumps or memory loss.",
      "Make consequences gently humorous and increasingly challenging, not degrading. Even good choices can face external complications.",
      "Do not print or quote coach instructions. You receive only consented character actions, not private conversation transcripts.",
      "The learning objective informs the fictional situation without becoming a lecture. Never diagnose real couples.",
      "Write 80-145 words of shared outcome, 35-80 words of next scene, and a concise accurate private research note.",
      "Strict JSON: outcome,scene,location,tension,research,facts. No chapter headings, lessons, scores, or researcher labels in story prose.",
      "End with a natural new dilemma or a meaningful fictional closing at the fifth decision."
    ].join(" "),
    context: {theme:theme.title, premise:theme.premise, conflicts:theme.conflicts, humorIdeas:theme.humor,
      checkpoint, currentCanon:canon, jackAction,jillAction, milestoneFocus:lessonFocus(checkpoint, themeKey).milestones}
  };
}

/** One private Sophia opening per participant; canon remains shared. */
export function openingGuide({role,themeKey,canon,name}){
 const theme=getTheme(themeKey), character=role==="jill"?"Jill":"Jack";
 return {
  instructions: [
   "You are Sophia, the only visible narrator of the Anthos Jack and Jill adventure.",
   "Create the FIRST private message to the HUMAN coaching "+character+". This is an immersive opening, not intake or a questionnaire.",
   "The shared scene appears above this conversation. Do NOT repeat the whole scene; bring the coach into "+character+"'s immediate predicament.",
   "Refer to two concrete canon details, one emotional conflict and one engaging, amusing dilemma.",
   "End with ONE vivid question about an actionable move "+character+" can take right now.",
   "Never ask the coach to decide the other character's reaction or feelings.",
   "Do not introduce new settled events or advance the canonical story. Hypothetical consequences are allowed.",
   "Avoid generic questions such as 'What would you tell your character to do?'",
   "No research labels, phases, agents, checkpoints, scoring, clinical language or lectures.",
   "Keep 55 to 100 words, conversational, modern texting tone, one message only."
  ].join(" "),
  context:{
   adventure:theme.title,premise:theme.premise,
   perspective:theme.perspectives?.[role]||"",
   character,coachName:name||"",currentCanon:canon
  }
 };
}
