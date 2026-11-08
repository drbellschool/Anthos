# Anthos 2.1 — Twelve-Petal Deep Dive Scenario Library

## Curriculum scope
The source curriculum lives in `anthos_petals` and `deep_dive_stories`. The new Jack & Jill scenario catalog lives in `anthos_jj2_scenarios` and references the existing story records without modifying legacy chapter flows.

Exactly **12 petals × (5 shared + 5 individual) = 120 scenario seeds**. One older Trust & Commitment story remains in the legacy catalog rather than being deleted. All new scenarios initially have editorial status `draft`.

### Petals
1. Friendship & Admiration
2. Communication & Understanding
3. Conflict & Repair
4. Emotional Safety & Vulnerability
5. Romance & Courtship
6. Desire & Physical Intimacy
7. Trust & Commitment
8. Partnership & Family
9. Money & Stewardship
10. Faith & Purpose
11. Adventure & Play
12. Individuality & Growth

## Content contract
Each scenario has a source story, petal, stable shared or individual mode, ordinal slot, unique title, **original unfinished opening scene**, learning objective, research lenses, editorial status, and optimistic concurrency version. The introduction must define a concrete fictional tension without dictating the choices, responses or ending. The scene is a seed for improvisation, **not a scripted chapter**.

### Shared (5 per petal)
Two real adult coaches participate separately: one privately directs Jack, one privately directs Jill. Each talks freely with Sophia and submits a character-owned choice. The shared story advances only once both choices are committed. Neither has access to the other's private transcript. Canonical outcomes may describe characters' actions, not human confidential disclosures.

### Individual (5 per petal)
One adult privately coaches Jack *or* Jill. The other fictional character is an AI-directed supporting character, not a second real participant. The single decision can resolve immediately into a private outcome, without waiting for a spouse. Never infer or reveal anything about the real spouse's thoughts from the fictional NPC.

## Unified instructional foundation
Every scenario uses the seven adult learning principles, six flexible narrative phases, eight formative milestones, and seven invisible agent responsibilities documented in `docs/jack-jill-2-unified-model.md`. Different topics change the learning objective, research sources, narrative stakes and humor—not the privacy and transition rules. Milestone evidence never controls whether a participant can proceed.

## Editorial workflow
The authenticated Anthos admin Deep Dive Objectives tab contains the **12-Petal Scenario Manager**. Filter by petal, mode, status and text. Edit titles, scene seeds and objectives. Statuses are `draft`, `in_review`, `beta_ready`, `retired`. Editor changes increment `content_version`; an out-of-date editor must reload rather than silently overwrite work. Review before marking beta-ready.

Admin-only **Create private test room** supports either a two-person shared pilot or a one-person solo pilot with role selection. Drafts can be tested privately with explicit confirmation; testing does not automatically publish them or send SMS. Each test room snapshots the selected opening into its own canon. Later edits to the library cannot rewrite an ongoing session.

## Acceptance checks
- 12 distinct petals; 10 scenarios per petal; 5/5 mode split; 120 authored opening seeds
- No empty title, objective or scene; no duplicate source story link
- At least one research lens aligned with each source petal
- Room creation selects exact catalog scenario and correct number of participants
- Shared flow requires two distinct submitted choices; solo flow requires one
- Unique, atomically committed fictional outcome per decision
- Research and phases remain invisible to participants
- Editorial status stays draft until explicit review
- The entire catalog and any pilot are independent of SMS-provider readiness
- Full human two-coach and individual end-to-end QA is required before public launch

## Current verification
Supabase counts verified: 120 total (60 shared, 60 individual), 12 petals, all 120 scene seeds populated. Separate automated tests cover catalog creation, per-mode invitations and solo/shared synchronization. The historical repository suite still contains legacy expectations outside this new catalog and must not be described as completely passing.
