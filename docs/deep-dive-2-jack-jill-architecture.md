# Anthos Deep Dive 2.0 — Jack & Jill Method
Status: architecture contract, implementation pending.

## Invariants
- Husband privately coaches Jack; wife privately coaches Jill. Never expose private messages or inferred vulnerabilities across participants.
- A single canonical, versioned story state is authoritative; no separate competing story generators.
- AI improvises scenes and feedback within bounded, validated state transitions; no prewritten chapters or fixed responses.
- Humor escalates consequences of fictional characters' decisions, never shames real participants.
- Research: Gottman (bids, repair, conflict), Schnarch (differentiation/self-regulation), Aron (shared novelty). Avoid invented citations or overstated claims.
- Asynchronous: either participant can respond independently; each checkpoint resolves exactly once after both submit, with explicit waiting and resume behavior.
- Sophia handles coaching/story; Paraclete handles subsequent real-world adventure planning only after authorized handoff.

## State machine
INVITED -> ACTIVE_CHECKPOINT -> WAITING_FOR_PARTNER -> RESOLVING -> REVEAL_READY -> ACTIVE_CHECKPOINT (repeat) -> REFLECTION -> COMPLETE.
Timeouts produce reminders, not invented partner choices. Pauses/resume preserve progress.
Resolution is idempotent, transactional and version-checked; late retries cannot duplicate story events.

## Data model (proposed, adapt to existing schema)
deep_dive_sessions(id,couple_id,status,checkpoint_index,canon_version,scenario_seed,created_at,completed_at)
deep_dive_participants(session_id,user_id,role,checkpoint_status,last_seen_at)
deep_dive_private_messages(id,session_id,user_id,checkpoint_index,kind,content,created_at)
deep_dive_choices(session_id,user_id,checkpoint_index,option_id,commentary,submitted_at) UNIQUE(session_id,user_id,checkpoint_index)
deep_dive_canon_events(id,session_id,checkpoint_index,version,scene,consequence,lesson_key,created_at) UNIQUE(session_id,checkpoint_index)
deep_dive_outcomes(session_id,skill_focus,individual_reflections,shared_action,paraclete_handoff_consent)
RLS: participant may read own private messages and own choice; both may read canon events for their session; service role alone resolves checkpoints. Do not include private comments verbatim in shared output.

## Checkpoint algorithm
1. Show a shared canonical situation through role-specific private perspective.
2. Offer 3 context-aware options and free-text input, with distinct tradeoffs and no forced correct answer.
3. Sophia responds meaningfully to the participant's actual words, asks at most one focused follow-up if needed, then explicitly confirms submission.
4. If one spouse submits, show a private waiting state and allow safe asynchronous return.
5. On both submissions, lock checkpoint with a transaction/version check.
6. AI proposes one structured canonical consequence considering BOTH choices, prior canon, escalating comedy, emotional safety and research skill. Validate schema and continuity before commit.
7. Save exactly one canon event; generate role-specific explanations from it without revealing private messages.
8. Both participants see consistent canonical consequence; next checkpoint opens after each has acknowledged or via defined asynchronous advancement policy.

## AI contract
Input: bounded canonical history, current dilemma, each participant's submitted choice/allowed summary, research skill, safety constraints.
Output JSON: scene, jack_action, jill_action, immediate_consequence, comedic_escalation, research_lesson, skill_prompt, next_dilemma, continuity_facts, safety_flags.
Never hallucinate spouse's words, invent real-world personal details, disclose private coaching, or treat fiction as therapy.
Validate JSON; reject contradictions, repetitive lessons, unearned scene changes, gender stereotypes, coercive prompts, and outcome-independent choices. Retry with bounded attempts and deterministic fallback.

## Pilot story
Holiday hosting: Jack and Jill each privately advise how to navigate competing family invitations. A poorly coordinated decision can escalate from two invitations to three dinners and an absurd color-coded seating plan; coordinated repair produces a different consequence, not a fixed happy ending. Test all nine 3x3 choice pairs plus write-ins, staggered submissions, retries, refreshes, disconnections, and privacy isolation.

## Acceptance criteria
- Exactly one canonical resolution per checkpoint.
- Every choice combination materially affects story state.
- No duplicate Sophia messages or contradictory locations/timeline.
- Free-text visibly changes private coaching and/or resolution.
- Neither participant can retrieve the other's private messages through client or API.
- Resumable on mobile/SMS-linked web forms; compact screen-first UI.
- At least one accurate research insight and practice prompt per meaningful arc.
- Final outcome contains a concrete shared action and optional consent-based Paraclete handoff.
- Pilot includes human review for tone, humor, research accuracy and participant safety.

## Implementation order
1. Audit existing routes, schema, auth, AI functions, and deployment.
2. Add database migrations and RLS tests without overwriting legacy data.
3. Implement transactional checkpoint engine and AI structured-output validation.
4. Implement separate participant views and compact resume UI.
5. Add observability and admin pilot diagnostics (no private message exposure).
6. Run local/integration test matrix, deploy preview, conduct two-participant trial.
7. Merge only after verification.

## Guided phase progression (approved 2026-11-07)

**Decision:** guided progression. Sophia conducts open-ended private two-way conversations, recommends an explicit `See what happens` action at meaningful boundaries, and never advances a shared story solely because of a message count, elapsed time, or model-assessed readiness.

### Six instructional phases (objectives, not fixed scripts)
1. HOOK — establish shared fictional scene, stakes, timing, and the individual's character perspective.
2. CONFLICT — invite an initial response and explore tradeoffs; allow a small **provisional** fictional consequence for discussion, but do not finalize shared canon until both spouses have submitted.
3. DISCOVERY — identify a research-supported relational pattern relevant to the specific response; give succinct, accurate insight with source attribution available in the linked web experience, avoiding generic lectures and overclaiming.
4. REATTEMPT — offer a fresh decision or revision in light of the insight; accepting or rejecting Sophia's suggestion must remain possible; participant may continue discussing.
5. OUTCOME — only after BOTH participants explicitly submit final choices, resolve one canonical scene with material consequences, coherent emotional and physical continuity, and safe humor.
6. REFLECTION — private learner reflection, one practical application, optional consensual shared action. Lessons need not be identical between spouses.

These phases may recur as instructional *beats* across one coherent adventure, not as six rigid screens at every checkpoint. A participant may revisit DISCOVERY or CONFLICT and request clarification; each educational arc must deliver an attempt, insight, opportunity to apply, and reflective closure. The state machine distinguishes **private phase** from **shared checkpoint**.

### Per-participant checkpoint states
`DISCUSSING` -> `READY_TO_ADVANCE` -> `SUBMITTED` -> `WAITING_FOR_PARTNER` -> `OUTCOME_AVAILABLE` -> `ACKNOWLEDGED`.
- `READY_TO_ADVANCE` means Sophia has offered an actionable invitation, not that submission happened.
- `DISCUSSING` remains available through continued conversation or a "Keep talking" action. Sophia may offer "See what happens" again after meaningful subsequent dialogue, but not nag.
- `SUBMITTED` is reached only by explicit confirmation, e.g. "See what happens" UI action or unambiguous SMS confirmation in the context of a pending invitation. No AI-only advancement.
- Prior to explicit submission, amendments update the *draft* choice. Post-submission changes require an explicit, supported `REOPEN` flow only if BOTH submissions have not locked the checkpoint; otherwise changes affect a future decision.
- `WAITING_FOR_PARTNER`: no invented partner answer, no premature consequence, no shared-canon mutation.
- When both choices are received, one idempotent locked resolution commits the outcome; both receive an `OUTCOME_AVAILABLE` notification, possibly at different times.

### Messaging: SMS transport contract
- A single Anthos number and Sophia identity; distinguish role by authenticated participant phone mapping to (couple_id,user_id,role). Never infer role from the text alone.
- Respect SMS opt-in/opt-out, quiet hours, frequency caps, provider approvals and delivery status. Web-based linked options are optional enhancement, not mandatory: numeric replies and free text must also work.
- Inbound webhook: validate provider signature, normalize inbound event, persist immutable provider message ID, dedupe, then route to the correct active participant session/checkpoint.
- Protect processing with per-(session,participant) queue/lock and monotonically increasing message sequence; handle out-of-order delivery and stale options explicitly.
- Generate ONE Sophia reply per inbound conversational turn using an idempotency key tied to the inbound event or action. Write an outbound message record before sending; retry failed delivery safely without silently generating a second reply.
- Distinguish `FREE_TEXT`, `OPTION_SELECTION`, `CONTINUE_DISCUSSION`, `ADVANCE_CONFIRMATION`, `PAUSE`, `RESUME`, `HELP`, `STOP` intents, with clarification on ambiguous messages. Recognize STOP according to provider/compliance handling and do not let story AI override it.
- Keep choices short and clearly labeled. If a linked questionnaire/form is used, include short-lived signed tokens scoped to that participant and checkpoint; link expiration must allow secure reissue.
- Store delivery states `QUEUED/SENT/DELIVERED/FAILED`, retry appropriately, and distinguish queued outbound from actual completed delivery. Scheduling of spouse completion notifications is separate from scene resolution.
- SMS may be delayed, segmented or arrive out of order. Shared-canon transitions must be atomic in the database, never inferred from provider delivery order.
- Prevent private disclosures through outbound text, link preview, telemetry, logs, admin previews, and quoted participant comments. Shared outcomes may describe **fictional** choices without revealing private coaching dialogue.

### AI response policy
- Sophia listens: reference a specific idea from the participant's own message in natural paraphrase, without mechanically quoting it; answer challenges or objections before offering progression.
- Responses should usually contain one scene beat or insight, one focused prompt, and no repetitive prefabricated opening. Compact SMS by default, with optional web detail for sources.
- Reflect initial instinct; give research guidance only when it is relevant and defensible. The lesson is not a forced "correct" choice and must not diagnose spouses.
- Do not claim a couple agreed, or that a spouse said or felt something, on the basis of private messages. Maintain fictional emotional state only from canonical evidence.
- Maintain a continuity ledger: current location/time, objects and commitments, character goals and feelings, unresolved tension, research skill practiced, humor escalation, and prior consequences. Never teleport back to an earlier setting.
- Story resolution returns validated structured data; individual coaching returns text plus state intents, with server-side authorization and validation. Model cannot directly perform state transitions.
- Use content safety handling for disclosures of abuse, coercion, violence or crisis; suspend playful escalation and offer appropriate support, never treating abuse as an ordinary communication game.

### Minimal contract extensions
`deep_dive_participants`: add `private_phase`, `progression_status`, `pending_advance_nonce`, `phase_updated_at`.
`deep_dive_choices`: add `draft_json`, `confirmed_at`, `confirmation_channel`, `decision_version`.
`deep_dive_private_messages`: add `provider_message_id`, `direction`, `conversation_sequence`, `reply_to_event_id`, `delivery_status`.
`deep_dive_canon_events`: add `continuity_ledger_json`, `research_source_refs_json`, `resolution_input_hash`.
Prefer additive migrations after verifying existing schema; do not assume these columns or tables already exist.
Uniqueness: `(provider, provider_message_id)` for inbound; `(participant, reply_to_event_id)` for replies; `(session_id, checkpoint_index)` for canonical resolution.

### Acceptance tests (additive)
1. Husband sends three clarifying texts while wife submits immediately; no forced husband advancement and no shared resolution until his explicit confirmation.
2. Sophia invites progression, user responds "not yet" and asks research question; Sophia answers, remains DISCUSSING, and does not submit.
3. An unambiguous "See what happens" confirms only the current pending invitation; duplicate tap/text retries create one submission.
4. Different choices produce different shared outcomes; both participants observe identical canon but privately tailored explanations.
5. Late/retried SMS and concurrent web confirmation cannot create duplicate replies or outcomes.
6. Pausing one phone, switching to linked web, returning later: no lost context or crossed sessions.
7. A spouse cannot read the other's original free-text, transcript, source quotes, or private analysis through RLS, web links, AI output, logs, admin.
8. Source-backed research snippet relevant to the actual conflict; open citation access on web without copying copyrighted questionnaires.
9. A participant can disagree with Sophia and continue without being punished by the model.
10. Unsafe disclosure stops comedy/lesson escalation; risk support flow does not disclose private user data.
11. On STOP/opt-out no further automated SMS even when a checkpoint resolves.
12. A canonical scene never advances when a partner has merely read a message or when a reminder timer fires.

### Implementation priority
After repository and schema audit: implement guided state transitions, durable message-event dedupe, authenticated SMS routing, and privacy controls **before** integrating generative story output or running a full couple pilot.
