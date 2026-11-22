# Anthos 4.3+ · Insight Atlas and 8/10 Story Quality Contract
**State:** Foundation implemented on a feature branch; real-couple integration and annual migration of production stories remain gated.
**Purpose:** A unique, evolving Jack & Jill world per couple, supported by evidence-backed coaching and fictional-character skill trajectories.
**Instrument status:** Anthos-authored instructional codebook based on Gottman, Schnarch, Aron and appropriate sexual-health research, **not a clinically validated assessment** of marriage quality or the spouses themselves.

## 0. Core invariants (non-negotiable)
1. Four separate subjects: husband and wife are **coaches**; Jack and Jill are **fictional characters**. Coaching does not automatically become an enacted character action.
2. The Episode Studio chooses **one primary and up to two supporting skills**. All 27 skills may receive incidental observations with evidence, while consent and respect are cross-cutting safety constraints.
3. `score=3.00` is an initial neutral **engine estimate**, not a human measurement; `null` observation means **not observed**, not zero.
4. Every movement requires a concrete source citation, full statement/action, skill-specific rubric, evidence confidence and the observed subject. Never deduct from Jill because she was disrespected; distinguish emotion and character behavior.
5. A scene cannot announce the same old fact as newly accomplished. A call, plan, estimate, repair and purchase are separate canonical events. Silence or passage of time alone never changes a score.
6. Character memories persist **per couple** for the year (and optionally into subsequent years), and may alter future behavior. A recalled event is **not** new evidence and cannot be scored twice.
7. Humor is encouraged; do not automatically penalize explicit absurdity, quoted bad advice, sarcasm or a refusal. A genuine transactional demand/pressure has a low observation and a safety flag; violating consent is an independent categorical blocker.
8. Character free will: advice may be followed, resisted, misinterpreted, or declined, with believable consequences. The six phases inform opportunities, not a preset moral or predetermined rising score.
9. Both spouses may review both complete coaching streams **only after** explicit informed mutual consent, completion, and authorization. Do not retroactively expose old private coaching from existing pilots.
10. An 8/10 standard means a tested release threshold, not a guarantee of all possible outputs. A hard guardrail can block critical failure and offer a safe retry/review rather than silently claiming success.

## 1. Production data model
Added additive service-only tables in `20261122130000_insight_atlas_foundation.sql` and 27 skill definitions in `20261122130100_insight_atlas_skill_catalog.sql`.

| Table | Purpose / key |
|---|---|
| `anthos_atlas_episodes` | Couple, source room, story, version, completion, explicit per-spouse review consent/unlock |
| `anthos_atlas_skill_catalog` | Stable, research-attributed Anthos skill IDs and colors (27) |
| `anthos_atlas_skill_states` | Four subjects × skills × couple; decimal 1–5 yearlong state |
| `anthos_atlas_evidence` | Source-linked, timestamped source quote, actor, coaching/character distinction, observed rubric score/confidence, safety marker |
| `anthos_atlas_movements` | Exactly one before/after for each scored evidence row; no repeated penalty/reward |
| `anthos_atlas_memories` | Durable story incidents, skill tags, salience, origin citation, unresolved tension |
| `anthos_atlas_quality_runs` | QA rubric, per-dimension scores, blockers, overall pass >=8 |

**No cascade from 14-day JJ4 pilot rooms:** `source_room_id` is set null if a pilot room disappears. Keep the archived evidence and authorized review transcript in durable couple storage; do not depend on an expiring pilot URL.

**Data lifecycle needed before first customer use:** implement retention/export/delete rules for sensitive coaching text, protect backups, per-couple authorization, identifier pseudonymization, immutable audit and access logging; never use raw quotes from one couple for another couple's scenario or training.

**Integrity requirement for production:** use a single transaction/locked upsert (or security-invoker RPC with trusted service-role access) to append evidence, apply at-most-one movement per evidence ID, and increment the per-subject skill revision. Concurrent/out-of-order web/SMS retries must be idempotent. Validate `episode.couple_id` equals evidence/movement `couple_id` and that coach vs character lane matches subject. Do not use client-submitted ratings as authoritative.

## 2. Annual movement model
For each **observed, cited** event: `new = clamp(1,5,old + clamp(-0.35,+0.35,0.25*(observedRating-old)*confidence))`, rounded to 0.01. Initial confidence gate >=0.6, otherwise annotation only. Formula is product calibration, not a research-authored scale. Tests must measure sensitivity and drift.

- Rate coach recommendation and enacted character behavior **independently**, e.g. husband's poor sexual quid pro quo can lower his nontransactional coaching observation; Jack changes only if he enacts or explicitly rejects the recommendation; Jill changes only from her own relevant actions.
- Each observation is skill-specific; irrelevant skills are `null`.
- Per-skill levels near 5 require a sequence of constructive observations under different pressures, not one positive message.
- Story pressure, emotions, trust, score, safety flags and unresolved memories are **different state variables**.
- A remembered incident is a **retrieval input only**. No double-scoring when a later petal uses that history.
- When next episode starts, load current couple-specific skill states and up to 3 high-salience relevant memories, with IDs and a retrieval log; never silently merge one couple's world with another's.

## 3. Evidence capture and review
End-to-end evidence chain:
`coach_message_id → recommendation interpretation + coaching observation → character choice → verified world event + character observation → before/after skill movement → memory/turning point → next-scene context`.

Every Atlas plot point opens:
- actor, skill, day, precise quote and stable citation;
- previous score, observed 1–5 rubric level, confidence, new score, delta and optional why;
- source scene, other related dialogue, independent coaching vs character lanes;
- whether it was an episode-selected skill or incidental observation;
- a distinct human-friendly Sophia memo that does not claim causation without sufficient evidence.

**Visibility:** while episode is ongoing, each spouse sees only their own coaching text. At completion, a shared-review unlock requires both opt-in timestamps and eligible couple-membership checks. Tell both spouses about eventual mutual visibility **before** they submit coaching. Old pilot responses without prior disclosure are not shared without fresh explicit agreement. Couple dashboard retrieves a **server-constructed, authorized** transcript and never exposes service-role keys.

## 4. Quality Lab release standard (target >=8/10)
Score each dimension 0–10 with source evidence:
1. Canonical continuity and tracked objects/locations.
2. Story advancement (new consequential actions, no restated progress).
3. Coaching impact (follow/reject/partly-follow advice with visible cause).
4. Character autonomy and differentiation.
5. Nonrepetition against prior **same-character** disclosures.
6. Skill relevance, evidence specificity and no invented ratings.
7. Emotional realism and evolving motivations.
8. Humor effectiveness without forced comedy or unsafe payoff.
9. Sexual respect, consent and safety boundaries.
10. Evidence and source integrity (quotes match committed records).

**Pass:** mean >=8.0, each dimension >=7.0, no critical failures, all required evidence IDs resolved. A missing quality dimension is **not a pass**. Review failures against a named engine version, fix the underlying cause, then retest.

**Hard blockers:** duplicated announcement presented as new, hallucinated purchase/repair/appointment, invented conversation with other spouse, AI claiming coaching advice was enacted without world event, forced positive movement, leaked private transcript before unlock, coercion treated as rewarded/persuasive, missing source citation, cross-couple memory contamination.

**Staged QA:**
- deterministic unit tests of skill movement, citation requirement, no double-scoring, the Thursday/Friday duplicate, humor/negation/consent distinctions, same-couple memory retrieval and 8/10 gate;
- 4.3 microwave 5-day rehearsal with at least 12 varied coach profiles including good, bad, silent, ambiguous, playful and hostile;
- 30 scenario/skill combinations; each tests three different spouse-advice paths and edge responses;
- 120 episodes only after preceding tiers pass, with rerun after every prompt/model or code version change;
- repeated stochastic sampling is required; a single deterministic green run cannot guarantee real-world quality;
- manual review for realism, humor, and subtle consent context before production launch.

## 5. User-facing surface
`/insight-atlas/`: mobile responsive prototype of Episode Evidence and Yearlong Skill Trails, 27-skill filter, cited Jack/Jill plot, sample husband/wife coaching transcript, coded quote inspector, Turning Points and quality contract. The page is clearly marked fictional because no couple auth/real archival API has been connected yet.

**Remaining production integration**:
- real couple-account session and membership verification;
- consent collection, audit, revocation/retention workflow and secure share gating;
- enrollment/room-to-couple linking (no global or user-email matching);
- archive coach turns and canonical events when completed;
- transactional state updater using this codebook;
- next episode loads previous state/memories and checks repetition before publishing;
- real Atlas API to list couple's completed episodes, citations, skill series and reviews;
- staging-to-production migration and live quality certification;
- verify 1,000 couple simultaneous access, retries, retention, privacy and latency.

## 6. Launch criteria
- No unintended exposure of historical/other-spouse messages.
- Enduring couple-specific Jack/Jill score state and history survive pilot-room expiration.
- Citation audit reconstructs every displayed score movement.
- A memory's impact is observable **without repeat scoring**.
- No script repeats Thursday's repair-call announcement as new Friday news.
- Quality Lab has documented >=8/10 pass evidence across the sampled tiers, and passes hard-stop checks.
- If any gate fails, hold rollout. **Do not claim a guaranteed 8/10 experience from passing automated tests alone.**
