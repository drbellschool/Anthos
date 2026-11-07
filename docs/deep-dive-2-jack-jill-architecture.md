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
