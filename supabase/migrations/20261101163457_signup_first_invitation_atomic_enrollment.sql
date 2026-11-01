-- Anthos invitation-first enrollment: no customer row exists until signup completes.
create table if not exists public.anthos_signup_invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  program text not null default 'pilot' check (program in ('pilot','standard')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  customer_id uuid references public.anthos_customer_directory(id) on delete set null
);
create index if not exists anthos_signup_invitations_pending
  on public.anthos_signup_invitations(expires_at) where redeemed_at is null;
alter table public.anthos_signup_invitations enable row level security;
revoke all on public.anthos_signup_invitations from anon,authenticated;

-- Called only by the server's service-role Supabase credential. One atomic transaction
-- consumes the invitation and inserts a fully completed private customer record.
-- An email collision rolls back both actions, leaving the link usable for correction.
create or replace function public.anthos_redeem_new_signup(
  p_token_hash text,
  p_display_name text,
  p_email text,
  p_birth_md text,
  p_wedding_date date,
  p_holidays text[],
  p_phone text,
  p_sms_consent boolean,
  p_email_consent boolean,
  p_disclosure text
) returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_program text;
  v_customer_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if p_token_hash !~ '^[a-f0-9]{64}$'
    or length(trim(coalesce(p_display_name,''))) not between 1 and 80
    or length(trim(coalesce(p_email,''))) not between 3 and 254
    or trim(coalesce(p_email,'')) !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or p_birth_md !~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    or p_wedding_date is null or p_wedding_date > current_date
    or p_phone !~ '^[+][1-9][0-9]{7,14}$'
    or p_holidays is null or cardinality(p_holidays) > 8
    or p_holidays && array['none']::text[] and cardinality(p_holidays) > 1
    or exists(select 1 from unnest(p_holidays) h
      where h not in ('valentines','easter','mothers_day','fathers_day',
                      'thanksgiving','christmas','new_year','other','none'))
    or (coalesce(p_sms_consent,false) and p_disclosure <> 'anthos-sms-2026-11-v1')
  then
    raise exception 'Invalid signup details' using errcode = '22023';
  end if;

  update public.anthos_signup_invitations
    set redeemed_at = v_now
  where token_hash = p_token_hash
    and redeemed_at is null and expires_at > v_now
  returning id, program into v_id, v_program;
  if v_id is null then
    raise exception 'Expired or used invitation' using errcode = '22023';
  end if;

  insert into public.anthos_customer_directory
  (email,display_name,program,staff_nomination,record_status,
   birthday_month_day,wedding_date,meaningful_holidays,holidays_reviewed_at,
   questionnaire_submitted_at,phone_e164,phone_owner_attested_at,
   sms_consent_at,sms_disclosure_version,email_opt_in_at,signup_token_consumed_at)
  values
  (lower(trim(p_email)),trim(p_display_name),v_program,'none','pending',
   p_birth_md,p_wedding_date,p_holidays,v_now,v_now,p_phone,v_now,
   case when p_sms_consent then v_now else null end,
   case when p_sms_consent then p_disclosure else null end,
   case when p_email_consent then v_now else null end,v_now)
  returning id into v_customer_id;

  update public.anthos_signup_invitations set customer_id=v_customer_id where id=v_id;
  return v_customer_id;
end $$;
revoke all on function public.anthos_redeem_new_signup(
 text,text,text,text,date,text[],text,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.anthos_redeem_new_signup(
 text,text,text,text,date,text[],text,boolean,boolean,text) to service_role;
comment on table public.anthos_signup_invitations is
 'Admin-generated one-use signup invitations. No customer rows are created until fully submitted.';
