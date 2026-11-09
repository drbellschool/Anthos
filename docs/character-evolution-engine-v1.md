# Anthos Character Evolution Engine 1.0 — Locked Design Contract

**Current target engine:** `3.1.0` (pilot)  
**State schema:** `evolution-1`  
**Application:** shared Jack-and-Jill Deep Dives and one-person individual Deep Dives, independent of petal or scenario.

## Product requirement

A participant's advice must have a genuine opportunity to change the fictional characters and the world. Jack's enthusiasm and Jill's need for rest are **opening conditions**, not permanent personality restrictions. A participant can persuade Jill to pursue an exhausting weekend; she may enjoy it and feel closer to Jack while simultaneously losing energy and a sense of personal agency. Her next discussion must acknowledge BOTH experiences, and it must not reset to the original hiking-versus-reading argument.

The engine must not force a particular lesson, a happy ending, a reconciliation, or a simulated clinical score. Gottman, Schnarch, and Aron inform opportunities for reflection and consequences, not predetermined judgments of a client's choices.

## Immutable vs mutable character properties

**Stable throughout one episode:** character identity, distinctive voice, continuity of observed actions, the privacy boundary, and the verified educational framework.

**Expected to change:** what the character wants, experiences of closeness, independent voice, trust, energy, friction, curiosity, recent beliefs, and unfinished relationship tensions.

The six numerical signals (`connection`, `agency`, `trust`, `energy`, `friction`, `curiosity`) are private, approximate **fiction-writing controls**. They are not assessments of the participating marriage. Never show numbers to consumers or infer an actual couple's mental state.

## One authoritative transition

1. Each coach speaks privately with their own character.
2. Only a fictional character-owned move is previewed. Confirmation is explicit.
3. A shared scenario waits for BOTH human coaches. A solo scenario uses one coach and lets the story director handle the fictional other character.
4. The storyteller reads confirmed actions, the shared observable canon, and an evolving fictional state. It **never receives a partner's confidential conversation**.
5. The storyteller generates the next observable consequence, a new dilemma, narrative gains and costs, and bounded character impacts.
6. The validator rejects duplicate dilemmas, ungrounded impacts, unbounded deltas, and missing actions. A failed AI response is retried; no half-published state is accepted.
7. One SQL transaction publishes the shared consequence, advances the room, writes the new state, and appends an immutable evolution event.
8. Each character's next private message receives the updated fictional context for **that character** and observable shared events; the initial personality remains only a baseline.

## Locked progression rules

- **No reset:** after a consequential choice, the next dilemma must differ meaningfully from the last dilemma. The opening disagreement should transform, not recur unchanged.
- **Mixed outcomes:** an action may create a benefit and a cost at the same time. Connection can rise as agency or energy falls.
- **Agency:** the model can disagree, but it cannot repeatedly veto a coach's possible move for being imperfect. Story consequences, not approval ratings, carry the learning.
- **Causality:** a change in character state must be supported by observable story text and a confirmed action. No unexplained conversion, mind reading, or dramatic teleportation.
- **Continuity:** the newest two events and each character's own gains, costs, and evolving wants are included in further private messages.
- **Privacy:** no raw spouse chat, private learning logs, or personal disclosures reach the shared storyteller. Neither side reads the other's private messages.
- **Experience:** learning remains embedded in the eight checkpoints and six internal phases; no quizzes, forced research labels, therapist lectures, or visible psychometric scores.

## Permanence of revisions

Rooms are pinned to an `engine_version`; all older rooms remain on `3.0.0`. New rooms are pinned to `3.1.0`. Additive schema changes do not mutate prior transcripts or room states.

Every published step is stored in `anthos_jj3_evolution_events`, including the fictional before-and-after states and narrative effects. The database enforces one event per room per step. To change the algorithm in the future, create a newer engine version and keep prior-version tests.

Automated tests assert the contract on **four divergent five-decision stories**: all-in, separate, collaborative, and double-down. A second test runs live-shaped API calls through shared and solo episodes. Tests assert no double-publication, no progress without committed choices, and no reuse of private partner chats.

## Acceptance criteria and limitations

Passing deterministic and mocked API tests confirms structure, privacy boundaries, persistence logic and four different state trajectories. It **does not prove** that live AI will consistently be fun or recognize every unusual suggestion. Human beta reviewers must score at least four genuinely different runs for character voice, listening, consequence quality, surprise, cost/benefit realism, and scenario progression before customer release.

Editorial approval of each of the 120 scenarios still belongs in the 12-Petal Manager. A theme is not automatically customer-ready merely because the engine works.


## GPT-6 Luna Deep Dive inference configuration

Both Jack's and Jill's private conversations, their step introductions, and the shared Character Evolution story director use **GPT-6 Luna** through the OpenAI Responses API with strict structured outputs. The model identifier is \`gpt-6-luna\`.

- The Deep Dive-specific Vercel variable is \`ANTHOS_JJ_MODEL=gpt-6-luna\` in production and preview.
- \`ANTHOS_JJ_MODEL\` takes precedence over the hardcoded Luna default; the legacy global \`OPENAI_MODEL\` no longer controls Jack & Jill. This prevents unrelated Anthos features from being changed incidentally.
- Private character replies use \`reasoning.effort=none\` to prioritize responsive natural conversation; shared story/causal evolution outcomes use \`low\` to allow additional planning.
- First-attempt structured output budgets are 2,100 tokens for individual replies and 3,900 for story outcomes; retries get 3,000 and 5,000 respectively. These are budgets, not fixed usage.
- Preserve \`store:false\` and schema-constrained JSON outputs. The API key stays in a server-only environment variable.
- Automated request-interception tests verify model identifier, reasoning effort, schema and token budgets. A green build does not prove live story quality or provider-side permissions; validate with the normal private pilot before customer launch.

Official documentation: https://developers.openai.com/api/docs/models/gpt-6-luna

## Developer files

- `api/jj-evolution.mjs`: pure versioned evolution engine and schema
- `api/jj3-model.mjs`: character voices and prompts
- `api/jj3-core.mjs`: confirmed actions, outcome generation, version routing
- `supabase/migrations/20261108210000_jj_character_evolution_v1.sql`: state persistence and atomic publication
- `tests/jj-evolution.test.mjs`: four divergent complete-arc tests
- `tests/jj3-integration.test.mjs`: live-shaped API and privacy integration tests

**Don't retire these regression tests or lower their requirements just to obtain a green build.**
