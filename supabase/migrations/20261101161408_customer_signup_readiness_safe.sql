-- Anthos customer intake readiness: collected evidence is not provider-verified authorization.
-- Applies only to existing admin-only directory; public roles remain denied.
alter table public.anthos_customer_directory
  add column if not exists birthday_month_day text,
  add column if not exists wedding_date date,
  add column if not exists meaningful_holidays text[] not null default '{}'::text[],
  add column if not exists holidays_reviewed_at timestamptz,
  add column if not exists questionnaire_submitted_at timestamptz,
  add column if not exists phone_e164 text,
  add column if not exists phone_owner_attested_at timestamptz,
  add column if not exists sms_consent_at timestamptz,
  add column if not exists sms_disclosure_version text,
  add column if not exists email_opt_in_at timestamptz,
  add column if not exists signup_token_hash text,
  add column if not exists signup_token_expires_at timestamptz,
  add column if not exists signup_token_consumed_at timestamptz;
create unique index if not exists anthos_customer_directory_signup_hash
  on public.anthos_customer_directory(signup_token_hash)
  where signup_token_hash is not null;
alter table public.anthos_customer_directory
  add constraint anthos_directory_birthday_md_check check
    (birthday_month_day is null or birthday_month_day ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  add constraint anthos_directory_phone_format_check check
    (phone_e164 is null or phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  add constraint anthos_directory_consent_requires_number check
    (sms_consent_at is null or (phone_e164 is not null and phone_owner_attested_at is not null and sms_disclosure_version is not null));
alter table public.anthos_customer_directory enable row level security;
revoke all on public.anthos_customer_directory from anon,authenticated;
comment on column public.anthos_customer_directory.sms_consent_at is
  'Web signup opt-in evidence; phone ownership and carrier delivery are NOT yet verified. Never authorizes sending on its own.';
comment on column public.anthos_customer_directory.email_opt_in_at is
  'Email marketing consent, not confirmation of inbox ownership.';
comment on column public.anthos_customer_directory.signup_token_hash is
  'SHA256 of a one-time 256-bit opaque signup link token. Never store or log bearer token plaintext.';
