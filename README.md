# Anthos — The Marriage Adventure

The official source repository for **[anthos.love](https://anthos.love/)** and its Threefold experience.

Anthos gives couples something fun and meaningful to do together. Threefold combines Love Whispers, Date Adventures, interactive Deep Dives, and a shared braid-and-petal journey. Sophia handles connection and conversation; Paraclete handles planning and logistics.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Anthos public homepage |
| `/experience/` | Local-only interactive couple demonstration |
| `/discovery/` | Two-person, same-device Couple Discovery demonstration (no persistent answers, no live AI/booking) |
| `/privacy/` | Privacy policy, individual consent and SMS disclosures |
| `/terms/` | Terms and SMS program disclosures |
| `/admin/` | Password-protected Anthos / Threefold operations studio |
| `/api/admin` | Private server-side integration checks and restricted test functions |

The public site is live, but **real couples, live enrollment, and recurring SMS have not launched**. The primary `/experience/` demo uses browser local storage only. The `/discovery/` demo keeps its responses in memory for one visit and does not persist or transmit them. Fake/local shares do not contact anyone.

## Local development

This is a static HTML/JS/CSS project with a single Vercel serverless admin function. No package installation or build command is required.

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

Run tests with Node.js 22+:

```sh
node --test tests/*.test.mjs
```

The GitHub Actions workflow runs these tests on pushes and pull requests.

## Deployment / repository migration

**Current Vercel project:** `threefold-preview` — keep this project because it already hosts `anthos.love`, `www.anthos.love`, the `/admin/` application, and its configured secrets.

The original deployment was linked to `drbellschool/educationalconsulting` with Vercel Root Directory `threefold/app`. To migrate it:

1. Verify this repository's main branch and successful GitHub Actions tests.
2. In **Vercel > threefold-preview > Settings > Git**, disconnect the old repository, then connect `drbellschool/Anthos` without deleting the Vercel project.
3. In **Settings > Build and Deployment**, change Root Directory to the **repository root** (`./` or blank). Keep Framework Preset as **Other** and no custom build or output directory.
4. Redeploy from the new repository, and confirm `/`, `/experience/`, `/privacy/`, `/terms/`, `/admin/`, and `/api/admin`.
5. Verify production domains and environment variables remained attached to the **same** Vercel project.
6. Once verified, leave the original source copy in the old repository for rollback temporarily; remove it only in a later controlled cleanup.

Do **not** change DNS, registrar settings or the existing Vercel project during a repository-only migration. The GitHub source change is separate from Telnyx carrier approval.

## Environment variables and safety

Store all keys **only** in Vercel Environment Variables, never in GitHub, client-side code, chat messages or downloadable screenshots:

- `THREEFOLD_ADMIN_PASSWORD`: strong unique admin password (minimum 16 characters).
- `THREEFOLD_SESSION_SECRET`: independent random signing secret (minimum 32 characters).
- `OPENAI_API_KEY`, optional `OPENAI_MODEL`: admin-only integration checks.
- `TELNYX_API_KEY`, `TELNYX_FROM_NUMBER`: messaging provider configuration.
- `THREEFOLD_TEST_SMS_TO`: one allowlisted phone for a future restricted admin test.
- `THREEFOLD_10DLC_APPROVED`: **leave false or unset** unless Telnyx confirms approval and number assignment.
- `THREEFOLD_TEST_SMS_ENABLED`: **leave false or unset** while campaign approval is pending.

Do not enable SMS or public enrollment based merely on an API connection test or website availability.

## Couple Discovery (prototype)

See [implementation tracker #28](https://github.com/drbellschool/Anthos/issues/28). A short, optional paired discovery asks each spouse about their own preferences and predicts their partner's choice. Both independently authorize sharing; only then do Sophia's comparisons appear. Paraclete's deterministic preview uses only both spouses' *actual* shared preferences, never predictions or private chats. There are no compatibility scores.

The development branch includes a Supabase migration `20261031130009_couple_discovery_private_foundation.sql` already applied to the Anthos database. It creates sessions, individually authored answers and scoped adventure briefs. All three tables have RLS and **no direct grants to anonymous or authenticated clients**; customer endpoints, authorization, mutual reveal and deletion flows remain unimplemented. Do not connect the browser demo directly to the service-role key, and do not accept real private marriage records through this prototype.

## Before the first customer

The current experience is a safe concept demonstration rather than a sellable service. Outstanding requirements include individual account authentication, a durable database, separate SMS consent logs per spouse, secure couple linking, partner sharing authorization, data retention/deletion, an audited message outbox and inbound STOP handling, and provider-approved messaging.

The Telnyx campaign is currently **rejected (code 705)**, and recurring SMS enrollment must remain unavailable until approved.

## Origin

Migrated from the `threefold/app` and `threefold/core` directories of `drbellschool/educationalconsulting` in October 2026. The dedicated Anthos repository is now intended as the canonical location for all future Anthos development.
