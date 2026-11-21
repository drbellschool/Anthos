# Anthos Deep Dive 4.2 — Character Conversations (pilot)

This is a **versioned delivery strategy on the existing JJ4 room and privacy system**, not a parallel product or new database. The current 4.2 pilot applies only to the saved **The Four-Hundred-Dollar Surprise** episode while we validate voice, continuity, and pacing.

## Experience
- Monday: Jill privately messages the wife **before** deciding whether to buy the microwave.
- Tuesday: Jack privately messages the husband, using only what has actually happened.
- Wednesday: Jill checks in with the wife.
- Thursday: Jack asks the husband what concrete action to take.
- Friday: Jill checks in with the wife about the consequences.
- Saturday: Sophia sends the first and only shared closing reflection.

The story is **not** a public narrator or shared transcript. Jack and Jill talk in first person to their own coaches. Each coach's message is stored under that participant's role and never inserted into the shared event ledger.

## Canonical state
The existing JJ4 `shared` scene record contains a private-to-the-server JSON event ledger for the day. It is hidden from both client views. The ledger tracks whether the replacement was bought, consulted about, or postponed; whether the box was opened; which positions were acknowledged; and which repair steps were planned versus actually completed.

One shared event ledger is committed atomically with a role-specific private prompt using the existing `anthos_jj4_commit_scene` RPC. The next day is computed from committed events and the previous authorized coach's text. This makes dramatic irony possible without inventing actions the other character never took.

OpenAI uses the **existing** configured API key to (a) classify advice into a fixed allowable decision for the day and (b) write a single natural character text. Neither model may edit past events or create an unapproved new state. Factual checks reject invented purchases, repairs, opened boxes, missing notes and unearned accomplishments. A verified text is used as the fallback.

## Timing and QA
The room pins next Monday–Saturday, 10:00 a.m. **America/Chicago**. Normal rooms cannot be advanced before the relevant day. Admin-created 4.2 **fast-forward QA** rooms skip calendar gating without skipping coaching, role separation, the five committed event transitions, or Sophia's Saturday-only closure.

Launch in Episode Studio with **Test Character Conversations 4.2**. This creates two private browser invitations and a preview with immediate Monday–Saturday progression.

## Deliberate launch boundary
**No 4.2 production SMS dispatch is enabled.** The 4.1 SMS setup and carrier pathway remain unchanged and still reject 4.2 rooms. A new, tested 4.2 delivery adapter must implement scheduled outbound checks, delivery receipts/retries, STOP/HELP and missed-day behavior before a real-week SMS launch. Creating a 4.2 browser room does not send texts.

## Validation
- `node --test tests/jj42-character-conversations.test.mjs tests/jj4-authored41-integration.test.mjs`
- Covers three differing decisions, verified role privacy, five single-role coaching gates, natural-message fact guards, limited semantic interpretation, both partners' actual HTTP API behavior, fast-forward and real schedule, and Saturday Sophia.
- The existing 4.0/4.1 rooms, SMS webhook code, and schema remain unchanged.
