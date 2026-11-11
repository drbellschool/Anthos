# Anthos Telnyx registration rollout

Status: **implementation preparation only — not deployed; no SMS sent**.

## Intended behavior

- Each spouse completes their own signup at `/signup/`.
- After saving, each spouse must verify their own phone via a six-digit, single-use SMS code.
- The couple remains `pending_verification` until **both** phones are verified. Neither a phone-owner checkbox nor optional ongoing SMS consent counts as verification.
- Verification messages are strictly transactional. Do not enroll anyone in Sophia, Jack/Jill, Paraclete, marketing, or pilot messaging.
- The existing spouse invitation link and separate participant identities remain intact.
- Pilot messaging stays disabled independently of registration verification.

## Server-side environment

Configure in Vercel (never in browser source, GitHub, or screenshots):

- `TELNYX_API_KEY`: secret API credential
- `TELNYX_VERIFY_PROFILE_ID`: Verify profile ID if using Telnyx Verify
- `TELNYX_REGISTRATION_ENABLED=true` **only after implementation and test**
- `TELNYX_PILOT_MESSAGING_ENABLED=false`

Do not assume the existing Telnyx credential is attached to the Anthos Vercel project; check the environment without displaying secret values.

## Implementation checklist

1. Add a server-only verification start/confirm endpoint backed by Telnyx Verify (confirm exact current API contract in official Telnyx documentation).
2. Persist verification status on the correct participant in Supabase only after Telnyx confirms success; never accept a client-submitted `verified` flag.
3. Verify the authenticated signup session/invitation belongs to the phone being verified. Do not allow an arbitrary caller to submit a target number.
4. Apply rate limits per phone, account, and IP; prevent account enumeration. Codes should expire after ten minutes, have bounded retries and resend cooldowns, and never appear in logs.
5. Make registration completion and couple activation depend on both independently verified phone records.
6. Add an accessible six-digit entry and resend state to `signup/index.html` without removing existing questionnaire fields or spouse linking.
7. Use generic responses for unknown phone numbers; mask numbers in display and logs. Keep Telnyx credentials server-side.
8. Test in staging with explicit permission from both recipients. Do not automatically send test codes merely because numbers are in documentation.
9. Confirm the production registration switch is on and pilot messaging switch is off; run a real end-to-end two-spouse test.

## Current code findings

- `api/customer-signup.mjs` currently records `phone_owner_attested_at` and `sms_consent_at`, but does **not** send SMS or confirm phone ownership.
- `api/couple-registration.mjs` already references `phone_verified_at` for both spouses.
- `api/signup.mjs` only supports `preview` and `submit`.
- `signup/index.html` currently submits the questionnaire but does not present a code entry step.

Do not merge or activate registration verification until these pieces are wired and tested.
