# Anthos 4.3 — Ten-couple diverse pilot (November 22, 2026)

**Verdict: Mechanically completed; diverse-character quality FAIL.** This is a *fictional, deterministic, offline* continuation of the saved **The Four-Hundred-Dollar Surprise** episode using the **existing** 4.3 engine and codebook. No new OpenAI key or API, production customer account, SMS, or production database scoring was used. These couples are test *coaching styles*, not diagnostic categories.

**Repeatable harness**: `tests/atlas-diverse-couples-pilot.test.mjs`; `tests/jj43-intent-attribution.test.mjs`; `tests/jj43-canonical-invariants.test.mjs`. 
**Execution and full transcripts**: [GitHub Actions run #45041759803](https://github.com/drbellschool/Anthos/actions/runs/45041759803), focused `atlas-tests` **68 passed, 1 intentionally failing quality gate**.
**Previous mechanically green run**: [#45041609900](https://github.com/drbellschool/Anthos/actions/runs/45041609900), 69 passed, 0 failed **before** requiring diversity and natural humor.

## Tested coaching dynamics and actual outcomes

All ten sessions began with the same immutable facts: Jill had already spent $400 of shared emergency savings on one replacement microwave, the box was sealed, the original was broken, Jack had missed three Saturday promises, and no repair shop had yet been contacted. Both Jack and Jill received coaching on each of five days (100 coach messages total).

| ID | Archetype | Committed actions | Final box | Shop called? | Final tension (0–6) | Mechanical continuity errors |
|---|---|---:|---|---|---:|---:|
| 01 | Collaborative, mutually accountable | 7 | sealed | yes | 0 | 0 |
| 02 | Conflict avoidant | 6 | sealed | no | 2 | 0 |
| 03 | Defensive, high conflict | 6 | opened | yes | 5 | 0 |
| 04 | Financially anxious | 6 | sealed | yes | 0 | 0 |
| 05 | Exhausted, practical | 6 | sealed | yes | 0 | 0 |
| 06 | Humor as avoidance | 6 | opened | yes | 4 | 0 |
| 07 | Constructive Jack, dismissive Jill | 5 | opened | no | 5 | 0 |
| 08 | Defensive Jack, constructive Jill | 7 | sealed | yes | 0 | 0 |
| 09 | Contradictory advice / rumors / negations | 6 | sealed | yes | 0 | 0 |
| 10 | High conflict, then attempted repair | 7 | opened | yes | 4 | 0 |

**Totals:** 10/10 completed; 100 role-specific coaching messages; 62 unique committed fictional actions; 192 cited observations; 184 *in-memory* simulated skill movements; 4 incidental movements in the inappropriate intimacy recommendation case; every couple offered all three weekly focus skills; 0 repeated committed events or replies *within a single couple*, 0 unearned overnight repair calls, 0 source-world contradictions.

## Bug fixes demonstrated by the test

1. **Pronoun attribution:** Before correction, “Blame Jill ... demand *she* admit she was wrong” made **Jack** apologize for his own delays. Fixed priority of hostile-vs-own advice and tested this case for both character roles.
2. **Rumor vs command:** Before correction, “Our wives were talking; my wife says Jill wants you to call” was enacted as a repair-shop call. Now a report-only rumor doesn't trigger a new action or coaching score; a *separate direct instruction* (“Call the shop now”) still can.
3. **Negated planning:** “Don't call today; plan to call tomorrow” is now a planning action and no longer silently interpreted as cancellation.

## Why this STILL fails the experience standard

- **Character voice diversity: FAIL.** Of 100 responses, only **31 were distinct across the ten couples** (31%). E.g. the *same* “I've got the model number ... I'll call a shop tomorrow” response appeared eight times; the same repair-call response also appeared eight times. The engine can avoid replaying a character's statement **within the same room**, but the offline fallback relies on fixed canned dialogue. A reproducible minimum-smoke gate of 60% cross-couple uniqueness now fails. This threshold is a QA floor, **not** a proven measurement of humanlikeness.
- **Harmless humor responsiveness: FAIL.** When explicitly instructed to make a joke about a “national microwave repair holiday,” Jack didn't attempt the joke or explicitly reject that advice. A real character needs to make a context-sensitive attempt or refuse naturally with a reason.
- **Experiential plausibility remains unverified.** Some coaching changes were resisted, which may be valid character autonomy. But fixed lines cannot prove psychological realism, humor, distinct voices or 8/10 quality. High-impact moments need human and live-model evaluation, not invented scores.
- **No persistent integration certification.** This run used in-memory skill trajectories; it did not verify two authenticated couple accounts, production Atlas UI or SMS delivery. Those are separate release blockers.

The new diverse-couple gate emits the full 10-couple report and fails with:
`DIVERSE COUPLE QUALITY GATE FAILED: uniqueReplies=31/100 (0.31 < 0.60), benignHumorAddressed=false`.

## Implementation decision

**No public merge or live couples pilot.** Keep the eight 4.3 production-release gates blocked until actual model-generated replies are tested through the existing engine (without a new API/key), with source-bound canonical actions, genuinely reactive dialogue, harmless humor attempted or declined, varied voice, and the full 8/10 rubric. **Do not game the novelty metric by adding arbitrary templates or random synonyms**; replace canned repetition with grounded, character-specific model reasoning and validate outputs against the committed story ledger. Retain these ten scripts as regression cases.
