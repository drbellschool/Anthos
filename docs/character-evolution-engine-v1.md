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

## Shared autoplay — one steer, then lived consequences

In shared 3.2 rooms created with `autoplay=true`, each real participant gives ONE private piece of advice during the opening scene. The engine extracts one observable character-owned action from each message and stores those actions without sending filler acknowledgement texts. It waits for the two separate private decisions, then publishes their combined fictional outcome.

After that, **Jack and Jill act independently** through the remaining scenes without further human coaching, submissions or chapter buttons. The shared character-state ledger and current public scene drive their next actions. Each progress request does ONE bounded stage: either commits two fictional autonomous moves or publishes the next shared consequence. This separation lets the next browser poll retry after an AI timeout without losing actions or double-publishing an event.

The public story director never receives raw private coaching text, participant names, private memories or private learning notes. It receives only fictional canonical actions and prior shared outcomes. A signed-in pilot screen automatically checks for the next event; completing the full adventure without a browser open would require a separate server-side scheduler, which is not part of this pilot.

In these autonomous runs, Luna uses medium reasoning for intermediate story scenes to control serverless latency and high reasoning for the final meaningful closure. A short server-side claim lease guards single-writer publication. SQL RPCs for first-turn advice and later autonomous turns are restricted to the server service role.

Old 3.1 rooms and shared 3.2 rooms without the opt-in autoplay flag retain their original multi-turn conversation rules. Solo Deep Dives are not silently converted to a two-participant autoplay pattern.

## Fifth-beat closure contract

The fifth story consequence **ends the episode** instead of generating a sixth problem. Jack and Jill's final confirmed actions resolve the immediate practical situation, including safety concerns. The fiction may still contain ordinary unresolved feelings, but no new cliffhanger, crisis, task or request for another character decision.

The version 3.1 Character Evolution Engine uses a separate strict JSON schema (`EVOLUTION_FINAL_SCHEMA`) at the final step. It requires observable character development for both Jack and Jill, a grounded relationship truth, one short non-judgmental Sophia insight connected to research-informed relationship skills, and a voluntary invitation for the actual couple to consider. It requires `newDilemma=""` at step five and rejects new open conflicts.

Closure is saved atomically in `scene.closure` and in the versioned fictional event ledger, alongside the final canonical outcome. Both private screens display the same shared ending without revealing either human coach's private messages. The conversation ends clearly. Each coach may optionally send one last private reflection to Jack or Jill, but neither needs to complete a questionnaire or another exercise.

The fifth beat is still the **last character decision** (the room is currently designed for five decisions). The final scene should clearly invite a concrete, meaningful choice that resolves its immediate issue. Future experiences could move to an automatic four-choice epilogue only after changing and testing the state and SQL contracts; do not silently fabricate a client's final action.

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
- Private character replies use \`reasoning.effort=medium\` to understand nuanced advice and natural permissions; shared story/causal evolution outcomes use \`high\` to coordinate both choices and their lasting consequences.
- First-attempt output budgets are 3,900 tokens for character replies and 7,500 for story outcomes; retries get 5,500 and 10,000 respectively. Hidden reasoning tokens count toward these budgets. Response timeouts allow more time for the higher reasoning effort.
- Preserve \`store:false\` and schema-constrained JSON outputs. The API key stays in a server-only environment variable.
- Automated request-interception tests verify model identifier, reasoning effort, schema and token budgets. A green build does not prove live story quality or provider-side permissions; validate with the normal private pilot before customer launch. Higher reasoning might reduce redundant conversation turns, but may increase latency and per-request cost; measure both.

Official documentation: https://developers.openai.com/api/docs/models/gpt-6-luna

## Developer files

- `api/jj-evolution.mjs`: pure versioned evolution engine and schema
- `api/jj3-model.mjs`: character voices and prompts
- `api/jj3-core.mjs`: confirmed actions, outcome generation, version routing
- `supabase/migrations/20261108210000_jj_character_evolution_v1.sql`: state persistence and atomic publication
- `tests/jj-evolution.test.mjs`: four divergent complete-arc tests
- `tests/jj3-integration.test.mjs`: live-shaped API and privacy integration tests

**Don't retire these regression tests or lower their requirements just to obtain a green build.**
