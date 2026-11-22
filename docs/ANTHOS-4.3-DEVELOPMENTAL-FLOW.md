# Anthos 4.3 — Developmental Flow pilot

4.3 extends the existing JJ4 weekly conversation strategy; it does not replace 4.2 or create a new database. The current validated pilot is **The Four-Hundred-Dollar Surprise**, with the selected Schnarch/Gottman skill set. Do not treat the other 119 scenarios as validated or enable weekly SMS on the basis of these tests.

## Editorial contract

The existing Episode Studio JSON stores a separate `developmentalFlow` map under the stable six phase IDs. The display names are Recognize, Interpret, Navigate, Regulate, Differentiate, Discover. Each has editable objective, evidence, and per-selected-skill emphasis (1–5). Objective and evidence guide model-written check-ins. Priority weights influence the pilot's next decision selection and weighted assessment. Legacy authored story phases and check-ins remain unchanged, in a collapsed legacy editor. The UI exposes the three supported skill-specific rubrics and labels other skill rubrics unvalidated.

## Runtime

The existing 4.2 canon and private room lifecycle are reused. Five bounded, fact-safe dilemmas are ordered using actual story state and the current developmental phase's skill emphasis; the first and last dilemmas are reserved in this pilot. Intermediate tasks may move, so recipients can repeat naturally while each spouse receives at least two private check-ins. This is not unrestricted AI story generation.

For each prior private coaching reply, the engine separately records:
- Coaching recommendation and skill ratings, inferred from advice with an evidence-checked model classifier or conservative offline fallback.
- Enacted action and skill ratings, based on committed behavior and authored fictional speech. Unobserved is null, not zero or failure.
- Fictional consequence and bounded story pressure. High-quality coaching does not compel character compliance; high pressure can cause resistance. Constructive behavior does not prove a resolved marriage or even a successful practical outcome.

The admin-configured skill emphasis controls weighted evidence and can change the next selected dilemma. Daily assessments reside only in the server-side canonical event rows. The normal customer views contain Sophia's introduction, only their own character's message and reply, and Sophia's final reflection. No scores or other spouse's private text are returned. The 4.3 immediate reply is a deterministic, ephemeral reaction in the browser, not an action or SMS.

The existing scene claim is used to pin the selected recipient to its room checkpoint before the existing atomic scene/prompt commit; the PATCH is conditional on the current scene claim. No live database migration was needed. Saturday's Sophia review cites observed fictional actions, distinguishes effective behavior, missed opportunities and absent evidence, and never implies a completed repair or agreement where none exists. The 1–5 scales are authored instructional rubrics, not clinically validated measurements.

## Verification

The initial and final focused suites cover the original 4.2 engine, 4.3 scoring, variable decision opportunities and role order, distinct coaching and behavior, existing HTTP handler with an in-memory implementation of the database, privacy and Saturday-only closure. Live AI quality, live database round-trip, actual browser visual checking, other episodes, scheduling and carrier SMS still require validation. No new API keys and no real SMS.


## Open Character Conversations (4.3 browser pilot)

New 4.3 rooms use open conversation mode. After Monday begins, both authenticated private coaches can initiate and repeat messages on any fictional day, independent of the optional character check-in. Sending text does not advance time. Fast-forward QA uses a separate manual next-day action. The existing day/prompt commit remains in use with the wait-for-reply gate disabled; silence does not generate fictional coaching. Non-fast-forward calendar access is still guarded by the existing schedule, not an automatic SMS scheduler.

The role-scoped text endpoint commits a private message, private reply, and bounded world transition together in the existing room JSON. Conditional PATCH filters on room stage, day and updated_at prevent conflicting concurrent writes; duplicate request keys return the already-saved result. If a day is being committed, clients retry. The physical world changes only through supported fictional actions; the two roles receive only their own text/reply history. A voluntarily shared report is stored under the recipient role, is not treated as verified, and is not copied into the shared event ledger. Visible event disclosures (for example, Jack telling Jill he made a call) are committed as fictional events so the other character can react. Model inputs include the current role's own private conversation and verified shared facts, not the other spouse's private text. Natural response phrasing uses the existing model configuration with factual guards and deterministic fallback. These guards are not proof against every possible hallucination.

The microwave pilot can now accept early repair advice to Jack on Monday, after which his planned call can occur on Tuesday without Jill purchasing a microwave. Further messages can change that plan. A purchase or opened box is not silently reversed. Unresolved decisions, recent contact and skill emphasis influence the optional daily check-in recipient; no customer response is required. Sophia uses observed events and actual actions from asynchronous turns as evidence; private text and scores are not exposed in the shared closing.

Current limits: browser-only, microwave scenario, bounded action vocabulary, 24 turns per fictional day/120 per room, no carrier messages or automatic delivery scheduler. The other 119 scenario worlds, live provider dialogue quality, production database concurrency and actual browser visual interaction still require validation. Existing released 4.2 remains unchanged. Earlier closed-turn 4.3 test fixtures remain available for comparison.
