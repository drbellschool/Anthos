# Anthos Deep Dive Engine v1 — tested browser rehearsal

## What is implemented

- Reusable deterministic state machine in `deep-dive/engine.js` (browser-loaded; Node-tested through a VM context).
- Story ID and version-bound progress snapshots, resume/revisit, bounded event history.
- Exactly eight authored milestones with decision points at chapters 2, 4, 7.
- Six fully authored options per decision, each with realistic impact and brief research-informed coaching.
- Non-mastery harmful choices require one repair practice. One unsuccessful response receives a guided model; the original outcome is always preserved. No endless loops.
- Chapter 7 independent mastery is assessed from the *first* unprompted choice (Demonstrated / Developing / Not yet demonstrated); it cannot be altered by repair.
- Chapter 8 uses one of six authored endings matching the Chapter 7 choice, including imperfect consequences. Completion is not automatically mastery.
- The existing Anthos demo UI now calls this engine, persists a local demo snapshot, renders repair choices and mastery labels, and preserves the braid crossing counter.

## What is **not** implemented yet

- **Real participant progress persistence:** This is still a fictional, browser-local demo. The Supabase account foundation is in draft PR #17, with RLS and a private login pilot *not yet merged/applied*.
- **Authoritative scores:** Browser state is user-editable. Only a trusted server may grant mastery, credit, rewards, petal completion or paid progress.
- **AI narration:** Sophia's short coaching is authored, not an unconstrained OpenAI chat. For future AI integration, the state machine must own chapter progression and option grading; AI may only phrase allowable coaching within the authored objective.
- **SMS:** No Telnyx integration, phone numbers, opt-ins, or outgoing texts are involved in this engine.
- **Additional Deep Dives / story content library:** This initial engine proves the Christmas Tug-of-War story and supports story versioning; new authored stories require content review, scenario-specific tests, and acceptance checks.

## Acceptance criteria / next integration sprint

1. Automated engine tests pass (choice gates, repaired outcomes, replay, 7th-chapter mastery, branching endings).
2. Preview test the browser on mobile and desktop, including keyboard focus and returning from a past chapter.
3. Perform manual QA of all six Chapter 7 endings and key harmful repair branches.
4. Build a Vercel API for authenticated participants *after* PR #17's account/RLS integration, with trusted ownership/choice validation and optimistic concurrency on progress events.
5. Persist individual progress by participant ID, story ID and version; protect each partner's data, support deletion/export, and keep shared petal completion separate from personal mastery.
6. Keep the public demo clearly labeled and never accept real relationship secrets until private account storage and retention are ready.

## Learning objectives

Primary: **joint decision-making**, **ownership of one's behavior**, **kind and clear boundaries** under pressure.

Secondary: noticing bids for connection; a bounded pause with follow-through; repairing criticism/contempt without giving up the joint decision. Chapter 7 must assess without advance coaching, even if earlier chapters prepared the participant for these skills.

**Evidence policy:** This branch passing a build/test suite is evidence of a prototype engine—not proof that paid customers can use it. Update weighted completion only after documenting a release-ready, fully tested scope.
