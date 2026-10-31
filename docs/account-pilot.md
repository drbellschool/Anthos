# Anthos private couple-account foundation — draft pilot

This branch is intentionally **not a production enrollment launch**.

## What is in the branch

1. `supabase/migrations/20261030_01_account_foundation.sql` sets up self-only participant access, read-only private Deep Dive state, and read-only couple membership access for authenticated users. All messaging, shares, consent-event and partner-linking writes remain server-only.
2. `/account/` is an unlinked private pilot screen supporting separate email/password authentication and per-user profile onboarding. It stores a *proposed* wedding date privately until both spouses complete a validated linking flow.
3. `/api/public-config` provides only the public Supabase URL and **publishable** browser key, and only when explicitly enabled.
4. Static and API tests prevent accidental public enrollment, broad DB grants, and confusion between account creation and SMS opt-in.

## Current source-of-truth findings (30 Oct 2026)

- Supabase project Anthos status: ACTIVE_HEALTHY.
- Eight existing `public` tables have RLS enabled and zero rows.
- No public-table RLS policies were found; public roles lacked app-data grants.
- Existing Vercel application is a static preview, and `/experience/` still uses browser-local demonstration data.
- No real account, SMS, spouse linking, billing, or verified Deep Dive delivery is claimed.

## Before enabling pilot

- Review and apply the migration through a controlled Supabase change.
- Run the security advisor and compare the resulting policies/grants with the SQL.
- Add the **public** Supabase URL and **publishable** key as Vercel env values (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`). Never put a service-role key in a public `NEXT_PUBLIC_` variable, git file, or this endpoint.
- Configure Supabase Auth email confirmation and allowed redirect URL `https://anthos.love/account/`.
- Keep `ANTHOS_ACCOUNT_PILOT_ENABLED` **false/unset** until integration tests pass. Never turn on SMS enrollment as part of this step.
- Verify in browser using disposable pilot users: A saves and reloads A's profile; B cannot read or alter A's birthday, wedding date, or story progress; unauthenticated requests cannot see app records; one user cannot insert a participant row for another account.
- Test date validation, email confirmation, session expiry, sign-out, and keyboard/mobile access.
- Verify database queries under actual `authenticated` JWTs rather than trusting static assertions alone.
- Complete deletion/export/retention procedures before customer onboarding.

## Explicitly deferred — blocking launch

- **Spouse linking:** Build a trusted Vercel endpoint with verified Supabase JWT, time-limited single-use hashed invitation codes, both partners' confirmation, and an atomic database transaction. Do not grant browser clients INSERT/UPDATE on `couples` or `couple_members`.
- **Deep Dive writes:** A trusted story engine must evaluate choices and mastery before writing progress; browser clients get SELECT only.
- **Age:** Date of birth is self-reported. This is an 18+ eligibility check, **not** identity verification.
- **SMS:** Separate consent per spouse, durable audit, STOP/HELP handling and Telnyx approval are still required.
- **Commercial readiness:** Payments, abuse controls, full RLS integration tests and release monitoring remain outstanding.

Track the implementation in GitHub issue #4. Do not raise completion percentages simply because this draft PR exists; require migration, tests and deployment evidence.
