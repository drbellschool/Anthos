# Anthos Deep Dive 2.1 — Unified Mental Model
Status: Pilot implementation contract (not a clinical intervention or a validated assessment)
Code: api/jj2-learning-model.mjs, api/jack-jill-pilot-core.mjs

## Purpose
Two adults privately coach Jack and Jill through a single improvised fictional adventure. One visible Sophia responds in each private thread; confirmed **character actions**, not private transcripts, affect the shared fictional world. Each experience ends in an optional personal reflection and practical marriage action.

## Adult learning constraints (7)
Need to know; self-directed learning; practical relevance; prior experience; learning by doing; readiness to learn; motivation. Each is a design check; none should appear as a quiz screen or grade. The model is informed by adult-learning principles and should not claim scientific validity as a psychometric instrument.

## Narrative progression (6)
Hook, Conflict, Discovery, Reattempt, Outcome, Reflection. These are flexible instructional objectives, not scripted chapters. Participants control whether to advance; Sophia may discuss or revisit a concept as naturally required.

## Formative milestones (8)
Recognize (underlying problem); Interpret (connection bids); Navigate (escalation and repair); Regulate (self-regulation); Differentiate (maintain self and connection); Discover (curiosity and novel perspectives); Apply (use principles within fiction); Reflect (choose a real-life action).
Tracking states: not observed/explored, not passed/failed. Sophia records private evidence but the application never treats this as a readiness gate.

## Seven internal agent contracts (one visible Sophia)
- Story Director: stage a coherent dilemma and material consequences; reads canonical scene plus committed character actions. Does not see raw spouse transcripts at shared resolution.
- Learning Guide: choose only relevant, accurately represented research; observes the participant's own private context. Does not force a correct answer or automatically show citations/labels.
- Dialogue Coach: respond to what was actually said, with playful personality; avoid repeated questions and excessive praise; one meaningful question at a time.
- Decision Director: extracts a proposed character-owned action, requiring an exact evidence excerpt from that participant's latest message. Deterministic server code enables progression as soon as a validated action exists. Never decides learning mastery.
- Privacy Guardian: authenticated per-role access; shared engine receives sanitized character actions only. Never reveal raw private conversation or personal disclosures to the other coach.
- Reflection Guide: after shared story, invite a voluntary practical action; do not diagnose a relationship, compare spouses, or demand disclosure.
- Quality Assurance: check schema, continuity, unintended repetition, meaningful branching, privacy, and duplicate delivery. No self-graded 'success' metrics in participant view.

These are functional roles, not seven independent API calls on each SMS. The browser pilot currently uses one structured coaching call, one structured story call after BOTH confirm, deterministic server validation, and SQL-atomic shared commitment.

## Guided decision semantics
1. A participant may talk at any length. Sophia can show only hypothetical mini-consequences before submission.
2. The participant's instruction must be an actionable command for their OWN character, with verbatim evidence grounded in their message; previous decisions persist when they ask an unrelated follow-up.
3. When an action is validated, **See what happens** is enabled immediately; no knowledge quiz, praise, timer, or second question is required.
4. Explicit client confirmation submits the character's action.
5. One spouse can finish and leave. The shared world waits without inventing the other's choice.
6. Two submitted actions enter a locked transaction; one validated outcome and one canonical next scene are committed atomically. Concurrent retries do not duplicate the event.
7. The participant returns to private coaching for the next decision. After five story-changing decisions, invite a private reflection.

## Research catalog
Use Gottman's bids/repair, Schnarch's differentiation/self-regulation, and Aron's novel shared activities/self-expansion only when the fictional event warrants it. Keep a bibliography of underlying publications. Avoid reproduction of proprietary questionnaires/exercises, claims of endorsement, and therapeutic diagnoses.

## Theme packs
Versioned packs supply unique stakes, opening scene, conflict tensions, research options and comedic affordances. The same orchestrator and schema support Christmas, Anniversary and Getaway; future packs should not clone the entire engine.

## Quality gates for new themes
- Clear action after one coaching exchange => server offers advance.
- Question-only exchange does not invent an action.
- Different choices lead to different fictional consequences.
- Only own character can be directed; no private transcript appears in canon.
- When one coach finishes early, nothing resolves until the other explicitly commits.
- Exactly one shared outcome, including under repeated, concurrent requests.
- No stage/grade/research-source labels appear in participant UI.
- Story never teleports, resets emotion, or disregards prior commitments without explanation.
- AI errors do not write contradictory canon; support safe retry.
- Unsafe real-world disclosures should stop comedic escalation.
- Final reflection is optional, private, and never a diagnosis.

## Pilot limitations
This is browser-first; real SMS opt-in, delivery, deduplication, consent/STOP controls and accessibility reviews remain separate launch requirements. QA tests using mocked AI and Supabase do not prove a full two-human production trial. Old version-1 pilot tests are retained for historical review; their failures must not be claimed as passed.
