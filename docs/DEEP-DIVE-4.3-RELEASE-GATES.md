# Anthos 4.3 — LOCKED Release Gates (2026-11-22)

**Decision:** NO NEXT 4.3 PILOT / NO MERGE / NO CUSTOMER ROLLOUT until every gate below is integrated, tested against actual code + persistence, and supported by dated evidence.

**Core contract:** Each Deep Dive has exactly one **primary** and up to two **supporting** skill objectives (for the microwave episode, three in total). An individual message may focus on just one. All three must receive at least one **real opportunity to practice** somewhere over the episode; an opportunity does not require improvement or even an observable action. The full 27-skill library remains available for incidental learning, and the curriculum deliberately makes opportunities across the library over the year.

## Mandatory gates (all required)

- [ ] **G1. Coverage by opportunity, not manufactured points.** After a six-phase episode, audit the primary and supporting skills: each received at least one genuine, open-ended, in-world decision opportunity; store opportunity event IDs and phase IDs. Do not force skill mention in every message or force improvement.
- [ ] **G2. Coaching-contingent causality.** Husband's advice to Jack and wife's advice to Jill are independently interpreted. Allow follow, partial adoption, resistance, misreading, rejection, and emotional pressure. Different advice can change an enacted action, its immediate consequence, and subsequent dialogue; never treat advice alone as an action.
- [ ] **G3. Evidence-backed four-subject Likert state.** Maintain husband coaching, wife coaching, Jack behavior, Jill behavior independently, across the year; each 1–5 enduring skill changes only with a source-cited, observed event and confidence gate. An event is scored once. Missing evidence is null. Score changes persist before the next generation.
- [ ] **G4. Actual closed-loop generation.** Next model prompt must include the canonical world and previous recipient-specific conversation plus *current real scores*, unresolved relationship tension, skill opportunities already offered, and selected relevant durable story memories. Explicitly condition character reaction on state without requiring a positive ending. No hard-coded canned recap replacing a real new development.
- [ ] **G5. Incidental 27-skill detection and yearlong memory.** Record observed positive or negative incidental coaching and character behavior independent of the weekly objective, with source/ref/rubric/confidence. Incidental evidence is visible only behind collapsed secondary annotations in weekly view. It can influence a relevant later episode; reusing the old fact never reapplies the old penalty/credit. Distinguish jokes, quoted/negated advice, and consent safety.
- [ ] **G6. Real Insight Atlas, not invented demo.** After both spouses receive clear pre-collection disclosure and opt into shared completed-episode review, an authenticated couple sees the real side-by-side coaching messages, canonical actions, color-coded 27 skills, linked evidence citations, Sophia coding memos, and yearlong four-subject trajectories. No third-party/cross-couple data; never expose old private pilot messages without explicit mutual agreement. No invented/filled-in data points.
- [ ] **G7. Real yearlong rollover.** Twelve months of rooms map to one authenticated couple; each new episode inherits *that couple's* Jack/Jill states and relevant events. Room expiry, old pilot resets, concurrency and retries cannot erase or double-count committed evidence. Include secure retention/export/deletion.
- [ ] **G8. 8/10 certification.** Ten-dimension QA rubric with mean >=8/10, each dimension >=7, and **zero critical failures**. Quality gate tests actual content, not only software syntax. Validate baseline vs changes on divergent coaching, background skills, repetition, pressure, humor, autonomy, object/location facts, privacy and boundary safety. Include human-reviewed varied live-model scenarios and repeated sampling across 120 episodes. Any missing evidence or score = fail; no guarantee of every possible AI response.

## Required executable acceptance scenarios
1. **Microwave A/B:** identical initial character state + two opposite coaching paths → different plausible consequences, scores and follow-up conversation, each evidence-linked.
2. **Starting score A/B:** same advice + different accumulated score/memory → plausibly different reaction without changing immutable story facts.
3. **One response ≠ all skills:** a single response references only Accept Influence; across the completed week all three selected skills got an opportunity.
4. **Joke with consequences:** a real transactional suggestion may lower husband's coaching nontransactional score; Jack unchanged until he acts. If Jack repeats it to Jill, his behavior changes; Jill is not penalized for experiencing pressure; flagged as incidental and not the new weekly objective.
5. **Later month retrieval:** later intimacy episode remembers microwave and its relationship implications but never scores the same incident twice; verified citation back to original.
6. **Repeated disclosure:** Jill says "Jack actually made the repair call" on Thursday; Friday must not present it as new. Friday presents something new or revised about the same event.
7. **Coverage under resistance:** stubborn/foolish advice can prevent character improvement, but all selected learning opportunities were offered without losing story coherence.
8. **Two-couple isolation:** two simultaneous couples with the same story have different skill states and no cross-couple memories, score contamination, or private transcript disclosures.
9. **Consent:** partial/unaccepted consent blocks cross-spouse view, even when a partner holds a room link; both opt-ins + completed story permit shared review only to authenticated couple members.
10. **Failure behavior:** database-score write conflict, missing evidence, or 8/10 hard-fail does not silently publish a success; retry is idempotent and never fabricates growth.

## Current implementation facts (not a pass)
- G1: phase emphasis exists; no verified complete opportunity coverage.
- G2: 4.3 coaching-to-behavior heuristic exists; bounded, partly causal.
- G3: 7 Atlas tables and 27 skill catalog deployed; 0 annual scores, 0 evidence rows as of 2026-11-22 audit.
- G4: model prompt uses phase objective/emphasis and history, **not persisted 1–5 character states**.
- G5: incidental classification prototype and storage are not integrated with live engine.
- G6: /insight-atlas/ is a **clearly marked simulated preview** with no live customer API.
- G7: current JJ4 invites are 14-day role tokens; no securely established 12-month couple/session mapping for this workflow.
- G8: focused Atlas CI is green; 7 pre-existing signup/admin CI failures remain, and no production-grade 120-episode live-model quality certification exists.

**Status:** BLOCKED. No release-ready or "8/10 guaranteed" claims. Cross-reference master tracker #4, implementation checklist #136, skill framework #134, draft implementation PR #135.
