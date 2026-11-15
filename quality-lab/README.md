# Anthos AI Quality Lab — reproducible baseline and usage

Tracking: [Quality Lab #120](https://github.com/drbellschool/Anthos/issues/120) · [Editorial completion #113](https://github.com/drbellschool/Anthos/issues/113)

## Verified initial evidence (2026-11-15)
Read-only audits of the connected **Anthos Supabase** project, **GitHub** and **Vercel**:
- Production Vercel deployment **READY** on commit `b3ad8d23be1cd41074d1f6ec69e70a3da4b29db7`.
- Supabase: `anthos_jj2_scenarios` 120, `anthos_jj4_rooms` 27, `anthos_jj4_simulation_events` 14.
- **11 completed** v4 rooms (six scenes plus Sophia closure), but just **two scenario IDs**. This is NOT a stratified AI-quality sample.
- Latest clean run `Clean Six-Scene QA After Label Fix · 2026-11-15`: 6 scenes; 4 coach submissions; 6 simulation commits; positions Jack undecided, Jill favor; replacement box sealed; no structured humor beats. Scene words **147, 120, 112, 141, 133, 140** (mean **132.2**).
- Scene 5 asserts a **next-Friday return deadline** without a grounded store policy. Sophia repeats that deadline as an achieved return window. This is an **unsupported-fact hard failure**.
- `jj4-continuity.mjs` explicitly scopes stricter continuity review to a single microwave scenario; `jj4-core.mjs` targets 75–110 words only for that focused pilot, while other episodes instruct 130–200 words. `initialSimulation` contains microwave-specific world defaults. These are generalization gaps.
- The editorial tracker #113 reports **only 2/120** episodes with substantial Jack/Jill motivations and humor direction. Most are not pilot-ready.

## One-run preliminary narrative rating (NOT the official catalog baseline)
A qualitative analyst review of the latest run, before a human-calibrated independent judging pipeline:
| Dimension | Provisional score / 10 | Evidence |
| --- | ---: | --- |
| Coaching (25%) | 6.0 | Jack's museum idea and pause influenced actions; Jill's requested explicit admission and verified repair estimate were not fully realized |
| Autonomy (20%) | 7.0 | The two characters retained opposing/undecided positions, but several conciliatory beats felt easy |
| Continuity (20%) | 4.0 | Sealed box preserved, yet a specific return date was fabricated |
| Humor (15%) | 3.0 | Museum callback appeared; weak partner reactions and zero committed humor beats |
| Pacing (10%) | 5.0 | All six scenes exceeded 110 words, with repeated emotional and symbolic framing |
| Sophia (10%) | 5.0 | Unresolved conflict acknowledged, but closure adopted the unverified return window |
| **Weighted** | **5.15 / 10** | **HARD FAIL: unsupported factual assertion** |

This is an **illustrative, uncalibrated assessment of one archived run**. It MUST NOT be used as a claimed average, pass rate, or conclusion for 120 episodes. No controlled cost/latency baseline has yet been captured. Historical production token costs cannot be inferred from message counts.

## First reproducible harness
- `evaluator.mjs`: rubric; six hard gates; deterministic phase/event/coach-lineage checks; no score if judge evidence is missing; statistics with unknown cost represented honestly.
- `synthetic.mjs`: seeded profiles: helpful, unhelpful, contradictory, humorous, vague, stubborn, emotionally difficult, adversarial. These are synthetic only.
- `run-live.mjs`: opt-in driver for the **existing** `/api/admin` v4 pilot creator and `/api/jack-jill-v4` coach/advance/closure routes. Does not send SMS or touch customer accounts. Writes a local run JSON without invitation tokens.
- `report.mjs`: aggregates only `qa-*.json` synthetic artifacts into `metrics.json` and an offline `dashboard.html`. Unknown gate evidence, missing costs and unscored runs are never presented as accepted.
- `../tests/quality-lab.test.mjs`: automated node:test regressions, exercised by the existing Anthos CI workflow.

Run deterministic unit tests:

```bash
node --test tests/quality-lab.test.mjs
```

Generate a private dashboard after a synthetic run:

```bash
node quality-lab/report.mjs qa-artifacts qa-artifacts
```

### Live synthetic tests (deliberately opt-in)
In a trusted environment with separately configured secrets, set:
- `ANTHOS_QA_ENABLE_LIVE=1` (no live testing otherwise)
- `ANTHOS_QA_BASE_URL` (verified preview URL preferred, HTTPS)
- `ANTHOS_QA_ADMIN_COOKIE` (protected secret; do not print or commit)
- `ANTHOS_QA_SCENARIO_IDS` (comma-separated **editorially playable** episode UUIDs)
- `ANTHOS_QA_PROFILE` (one of the eight profiles)
- `ANTHOS_QA_SEED` (integer)
- Optional `ANTHOS_QA_MAX_RUNS` (defaults to 1, upper cap 8)

```bash
node quality-lab/run-live.mjs
node quality-lab/report.mjs qa-artifacts
```

**Live runner limitations:** The existing browser pilot API provides displayed scenes but not its privileged simulation event ledger, inference usage, or token cost. Generated runs will correctly remain **UNVERIFIED** until a service-only export attaches those records and independent (ideally human-calibrated) narrative evaluation fills evidence and hard gates. Do not put service credentials, private tokens, or raw real customer text into repository artifacts.

## One-call automated narrative judging (opt-in, synthetic only)
After a completed synthetic pilot, the independent judge evaluates the six requested
dimensions using **literal evidence excerpts** from the synthetic replay. It makes one
OpenAI structured-output call with `store:false`; judge model and token usage are
recorded separately from scene generation costs.

```bash
# In a trusted environment with OPENAI_API_KEY already configured:
ANTHOS_QA_ENABLE_JUDGE=1 node quality-lab/judge.mjs qa-artifacts/qa-RUN-ID.json
node quality-lab/report.mjs qa-artifacts
```

A numeric AI estimate **does not approve a run**. Even if the judge says all six
hard gates pass, those flags remain **unverified** until independent
evidence review/calibration. Evidenced suspected violations can automatically
**fail** the run. The static dashboard intentionally shows scores, missing evidence,
and unverified states separately; it does not claim a release-grade success rate.

Judge prompt quality should be calibrated by at least two human raters on a
balanced set of episodes and coaching styles, with excerpts, disagreements,
false-fail/false-pass analysis and explicit adjudication before any `ACCEPTED`
quality status is assigned. The judge cannot compensate for absent saved
world-state snapshots or unsupported scene facts; those require server-side
instrumentation.

**CI note (2026-11-15):** the quality-lab tests pass but the repository-wide
suite has 7 other failures in customer signup/directory and admin progress
tests. No customer infrastructure was modified as part of this PR.

## Next implementation increments
1. Service-only, audit-safe QA export of before/after simulation events, coach disposition, factual provenance, model usage and cost for synthetic room IDs, protected by existing admin authentication.
2. Generalize authored seed/object state and continuity review across episodes; remove only episode-specific shortcuts after matched regression evidence.
3. Add coaching consequence coverage checker and grounded fact ledger before story commits, not merely a prompt that says not to invent facts.
4. Add humor action/reaction/callback instrumentation and evaluate situational appropriateness.
5. Capture matched-seed before/after **stratified** pilots across 6+ ready episodes and at least 3 petals, including individual/shared and adversarial styles.
6. Calibrate narrative judges against human double ratings, document inter-rater disagreement and thresholds. Make zero hard failures, minimum score >=8 on accepted runs, and cost/latency budgets prerequisites for release.
7. Hand editorial readiness to #113. Preserve approved author locks and customer-account infrastructure.

**Promotion policy:** This branch is evaluation-only. A green unit test or a successful six-scene pilot is NOT evidence that the engine is ready for paying customers.
