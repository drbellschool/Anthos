-- Anthos 4.1 SMS derives program consent from verified registration. No additional JOIN.
alter table public.anthos_jj41_sms_participants
 rename column join_consent_at to signup_consent_at;
alter table public.anthos_jj41_sms_participants
 add column if not exists customer_id uuid references public.anthos_customer_directory(id),
 add column if not exists welcome_sent_at timestamptz,
 add column if not exists superseded_at timestamptz;
create index if not exists jj41_sms_active_phone
 on public.anthos_jj41_sms_participants(phone_e164,created_at desc)
 where stopped_at is null and superseded_at is null;
create table if not exists public.anthos_jj41_sms_suppression(
 phone_e164 text primary key check(phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
 stopped_at timestamptz not null default now()
);
alter table public.anthos_jj41_sms_suppression enable row level security;
revoke all on public.anthos_jj41_sms_suppression from public,anon,authenticated;
grant select,insert,update on public.anthos_jj41_sms_suppression to service_role;
comment on column public.anthos_jj41_sms_participants.signup_consent_at is 'Original optional SMS consent timestamp from separately verified Anthos registration; not a second JOIN';
