# Anthos transactional registration SMS

## Implemented in PR #92

- Existing /signup/ questionnaire preserved for each spouse.
- On successful signup, the server generates a private 24-hour verification session and six-digit code.
- When `TELNYX_REGISTRATION_ENABLED=true`, the registration-only sender uses the existing `TELNYX_API_KEY` and `TELNYX_FROM_NUMBER` in Vercel.
- Customer phone verification uses a database-backed, one-time hashed code; no code or API key is exposed in the browser.
- Codes expire in 10 minutes; up to eight wrong attempts per session; at most five sends; minimum 60-second resend interval.
- Supabase's private `anthos_phone_verifications` table has RLS enabled, no public read/write grants, and server-only RPC privileges.
- Verified status updates only the matching person's `phone_verified_at`. It never sets `auth_user_id` or enables member login automatically.
- A spouse receives a code only after they independently complete their signup.
- New directory signup invitations use the standard customer program, not the old pilot program.

## Environments

Production Vercel variables:
- `TELNYX_REGISTRATION_ENABLED=true`
- `TELNYX_PILOT_MESSAGING_ENABLED=false`

Existing secret variables `SUPABASE_SECRET_KEY`, `THREEFOLD_SESSION_SECRET`, `TELNYX_API_KEY`, and `TELNYX_FROM_NUMBER` are server-side only. Never commit their values.

Preview builds currently lack production Supabase and Telnyx API keys, so they demonstrate buildability and UI, not live SMS delivery.

## Validation

- JavaScript syntax parsing passed for all touched modules and signup UI.
- Supabase transactional dry-run: begin session, reject immediate resend, reject invalid code, accept correct code and update customer record; synthetic records rolled back.
- Confirmed anon and authenticated roles cannot call the verification RPCs.
- Vercel preview built successfully.

## Remaining operational checks

- Verify sender delivery and 10DLC/carrier approval using a consenting test recipient before inviting the public.
- Have both spouses complete their individual forms and verify their own numbers.
- SMS provider acceptance does not prove delivery; inspect the Telnyx message log if necessary.
- **Phone verification does not provide authenticated login.** Customer auth and account dashboard access remain separate work.
- Jack/Jill pilots, Sophia Whispers, Paraclete messaging, and phone calls remain disabled for SMS.
