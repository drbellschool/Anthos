# Deep Dive 4.4 — The Adventures of Jack & Jill

This branch replaces the private SMS-driven **experience** for new 4.4 shared pilot rooms with one shared, co-authored story. 4.3 rooms and their existing SMS routes are deliberately unchanged until the replacement passes validation. Existing petal library, editorial studio, role tokens, scene claim and atomic commit, and developmental phases are reused.

## Weekly experience
- Monday Recognize: concrete opening conflict and two distinct contributions.
- Tuesday Interpret: consequences and the next decision.
- Wednesday Navigate: meaningful outcomes and understandable situational humor.
- Thursday Regulate: emotional pressure and a turning point.
- Friday Differentiate: earned connection or further tension.
- Saturday Discover: honest resolution, not necessarily a happy ending.
- Sunday: publish the six scenes as one chapter and Sophia's grounded reflection, with an optional question for the couple.

Both coaches submit one contribution on each Monday–Friday page. The next page requires both; no simulated spouse answers. Fast-forward is a separate QA choice. Sunday has its own date gate. Private coaching text is not returned in the shared page; fictional behavior reflects both contributions.

## Engineering contract
A single author receives committed prior pages, recorded events, unresolved threads, editorial boundaries, skill emphasis and both latest contributions. A structured page schema bounds narrative length and validates distinct prompts. An independent editorial review checks continuity, plausible dialogue, both contributions, humor clarity, private text leakage and the art brief. At most three drafts; a failed page remains unpublished. The existing atomic room claim/commit avoids multiple competing page commits. This is a model-based review, not a guarantee of factual perfection.

The illustration brief is separate from the authoritative story text. Final artwork must use fixed character references and text-free art. Render headings, day labels, prices, captions and dialogue as normal application text, never by the image generator. A future art pipeline must check the actual generated image against the committed story, including object state, clothing, location and visible action. Artwork must not change the narrative.

## Release gates (not yet complete)
- Integrate image generation, consistent character references, visual validation and durable private asset storage using existing credentials; text-only pilot currently.
- Improve browser presentation to a seven-day illustrated book, add durable library/print view, opt-in catch-up, and Sunday shared chapter publication.
- Verify authentication, room concurrency, retries and calendar behavior with actual database/provider; verify solo episodes separately.
- Run the fictional microwave chapter and adversarial branches with real model calls; evaluate both spouses' enjoyment and humor, not merely AI scores.
- Validate all selected shared episodes before enabling the catalog. Do not infer 120 validated worlds from one pilot.
- Connect Sophia-only SMS notices and daily delivery to 4.4 after pilot approval; retain registration and Love Whispers. Prevent old 4.3 SMS runtime from claiming 4.4 rooms.
- Replace old studio launch controls and production customer routing only after end-to-end tests and pilot approval.

No database migration, new keys, production deployment or carrier SMS is part of this initial implementation. Current browser pilot is an incremental implementation, not a completed release.
