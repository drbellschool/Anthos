# Anthos 3.0 — Character-First Jack & Jill Method

Status: private browser pilot; not a validated clinical intervention or a generally available service.

## Core decision
Jack and Jill are recurring fictional people with distinct voices, flaws, motivations, agency, anxieties, memories, and self-deprecating humor. The husband is privately **Jack's trusted friend** and the wife is privately **Jill's trusted friend**. The participant talks with the character themselves, not with Sophia about an absent character.

**Sophia** is an occasional relationship-informed facilitator. She never hijacks the dialogue, demands a correct answer, or presents visible research labels. The narrative director invisibly combines only confirmed fictional actions. The quality validator rejects repetition and incoherent or ungrounded continuations. Technical decisions are deterministic SQL transactions, not language-model judgments.

## Who Jack is
Energetic, passionate, a little reckless, loyal and often embarrassed by his own enthusiasm. His insecurity is not just whether he can go hiking—it is whether he and Jill are losing their shared sense of adventure, and whether she still sees him as interesting. He jokes to avoid vulnerable conversations. His friend hears these private fears and helps him choose a fictional action; Jill's real coach does not see that private discussion.

## Who Jill is
Quick-witted, perceptive, competent and affectionate. Her internal tension is not simply 'books versus hiking.' She wants a weekend when nobody needs a plan from her, and fears that declining Jack's enthusiasm will sound like rejecting him. Her private coach may advise a selfish, generous, funny or imperfect choice without being corrected into an artificial right answer.

## Eight formative milestones (hidden)
Recognize → Interpret → Navigate → Regulate → Differentiate → Discover → Apply → Reflect. Research lenses: Gottman's emotional bids and repair attempts, Schnarch's self-regulation and differentiation, and Aron's shared novelty and self-expansion. Use contextually and modestly. No proprietary questionnaires, implied endorsements, diagnoses or claims of therapy.

## Six phases
1. Hook: meet the characters and their privately felt conflict.
2. Conflict: choices collide and cause meaningful fictional consequences.
3. Discovery: relevant insight emerges inside the interaction, not through lectures.
4. Reattempt: participants can try a different move without being graded.
5. Outcome: independent confirmed decisions produce one coherent shared event, even if imperfect.
6. Reflection: each participant may privately identify one voluntary real-life action.

These instructional phases direct the story **behind the scenes**, not as chapter titles, required quizzes or visible gates.

## Security and state
- New v3-specific Supabase rooms, participants and messages, with row-level security and service-only access.
- Invitation tokens are 32-byte random values; only SHA-256 hashes are stored.
- A private thread is accessible only through its participant's invitation token. Raw private thoughts are never passed to the shared storyteller.
- The chosen character action is explicitly shown for review before it becomes part of the shared narrative.
- Two independent confirmations are required for shared stories. Individual stories need one.
- Atomic database functions prevent duplicate message turns, false advances and duplicate shared consequences.
- Retired v2 rooms are paused and the old browser/API entrance no longer exposes them. Historical data is preserved for regression analysis, not used by version 3.
- SMS is disabled. The trial is browser-only and requires adult consent.

## Quality criteria for every new petal
- Jack and Jill sound distinct and have internal conflicts, not merely external planning problems.
- Each character remembers earlier conversations privately without confusing private confidences with public story facts.
- The user can decline, disagree, challenge the character or choose a reckless fictional move.
- Humor grows out of the characters and consequences; never gratuitously humiliates a partner.
- A new situation follows each canonical outcome and asks a concrete next question.
- Sophia offers sparse accurate guidance and does not dominate.
- Reflection is private, voluntary and non-diagnostic.
- No simulated tests or successful deployments are represented as full human validation.

## Testing
Run `node --test tests/*.test.mjs`. Legacy pilot-specific expectations are marked as retired and skipped, with active coverage in `tests/jj3-model.test.mjs` and `tests/jj3-integration.test.mjs`. The SQL transaction tests independently cover first-message deduplication, private-message isolation, two-person coordination and atomic story publication.

Existing 12-Petal Manager and 120 curriculum scenario seeds remain available. New trials launched there use the v3 engine. Each scenario requires editorial and real human beta review before publication.
