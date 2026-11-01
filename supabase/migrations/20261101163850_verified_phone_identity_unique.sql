-- Verified phone numbers identify Anthos members; UUIDs remain permanent account keys.
-- Never mark phone numbers verified merely because somebody checked a consent box.
alter table public.anthos_customer_directory
  add column if not exists phone_verified_at timestamptz;
create unique index if not exists anthos_customer_unique_verified_phone
  on public.anthos_customer_directory(phone_e164)
  where phone_verified_at is not null;
alter table public.anthos_customer_directory
  add constraint anthos_customer_verified_phone_requires_number
  check (phone_verified_at is null or phone_e164 is not null);
alter table public.anthos_customer_directory enable row level security;
revoke all on public.anthos_customer_directory from anon,authenticated;
comment on column public.anthos_customer_directory.phone_verified_at is
 'Server-verified phone ownership timestamp only. Never set from a signup attestation or an admin checkbox.';
