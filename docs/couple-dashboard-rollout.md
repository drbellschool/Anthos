# Anthos couple dashboard rollout (review branch)

## Goal
After a verified email sign-in, redirect each person to `/dashboard/`, the approved feathered Yearly Cord dashboard. Keep `/` as the public Anthos homepage.

## Included
- `/login/`: separate passwordless email sign-in for each spouse.
- `/dashboard/`: exact approved interactive Yearly Cord, feathered at the advancing tip; 96 checkpoint display and three selectable strand colors.
- `/dashboard/session.js`: converts one-time magic-link URL fragments into HttpOnly, Secure, SameSite=Lax cookies through the server, removes fragments from the address, reads real progress.
- `/api/couple-home`: verifies Supabase Auth sessions, resolves customer profile **only by `auth_user_id`**, and returns a limited signed-in view. Never matches or links by an unverified registration email. Server role keys remain server-side.
- Homepage couple sign-in link, plus non-indexing and no-cache headers for private routes.

## Release blockers — do not merge to production until verified
1. Configure the Anthos Supabase Auth Site URL / allowed redirect URL to include `https://anthos.love/dashboard/`. If testing a specific protected Vercel preview, set `ANTHOS_AUTH_REDIRECT_URL` to its allowed HTTPS redirect and add it to Supabase Auth URL configuration. Do not add arbitrary wildcard domains.
2. Confirm Auth email provider / sending limits with a test account, including session refresh, signed-out behavior, and expired magic links. This has **not** been exercised live.
3. Verify `SUPABASE_SECRET_KEY` (or compatible service role key) is present on the intended Vercel project; it is required to read authorized customer records. Never expose it to the browser.
4. Explicitly and securely associate existing `anthos_customer_directory.auth_user_id` values with verified individual users using an admin-reviewed process. At the time of implementation, two customer directory records existed but zero were linked to Auth accounts. **No automatic pairing or email-only claim is performed.**
5. Verify `deep_dive_progress` is written by the actual learning checkpoint engine for that participant and that 12 Deep Dives x 8 checkpoints represents the intended production progress model. Dashboard currently reflects only recorded progress for the signed-in participant and year; it is not yet an authoritative shared-couple completion aggregator.
6. Decide how three strand color preferences should sync between devices. This version retains browser-local color preferences from the prototype and does not store them server-side.
7. Test mobile and keyboard accessibility, same-device spouse switching, Vercel route health, and email redirect URLs before releasing.

## Security model
- Public homepage stays public.
- The dashboard shell is static, but personalized data is returned **only** after validating a Supabase session; each read is filtered by the authenticated `auth.users.id` via the existing `auth_user_id` column.
- User-controlled `user_metadata` or signup-form email cannot authorize data access.
- Unlinked accounts see 0 recorded checkpoints and a linking message; the UI must never reuse fake demo completion.
- No SMS/phone consent is inferred from email sign-in.
- Test data and pending pilot records should never be exposed to arbitrary accounts.

## Tests completed during implementation
- Chromium desktop/mobile simulated signed-in accounts: 0/96 (unlinked), 37/96 (linked), 8/96 (mobile). No browser JS errors.
- Node smoke checks on the session API for unauthenticated GET, invalid email, cross-origin POST, and logout.
- Live login/email and customer linking: **not yet verified**.

## Operator test
Open `/login/`, request sign-in email, follow the one-time link to `/dashboard/`, verify your own existing profile is explicitly linked and only your recorded milestones appear, change strand colors, sign out, then test the second spouse separately.
