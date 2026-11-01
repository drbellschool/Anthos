-- Full birth dates are private and never directly exposed to anonymous clients.
-- Spouse first/last names and separate mobile numbers are required for new signups.
-- Marketing email is not included or implicitly accepted.
alter table public.anthos_customer_directory
 add column if not exists spouse_last_name text,
 add column if not exists birth_date date;
comment on column public.anthos_customer_directory.birth_date is
 'Private full date of birth for age-aware personalization and future privacy-controlled aggregate analytics.';
CREATE OR REPLACE FUNCTION public.anthos_redeem_signup_v3(p_token_hash text, p_first_name text, p_last_name text, p_email text, p_birth_date date, p_wedding_date date, p_holidays text[], p_special_dates jsonb, p_phone text, p_spouse_first_name text, p_spouse_last_name text, p_spouse_phone text, p_partner_token_hash text, p_sms_consent boolean, p_disclosure text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_invitation_id uuid;
  v_program text;
  v_customer_id uuid;
  v_inviter_id uuid;
  v_intended_phone text;
  v_inviter_phone text;
  v_group_id uuid;
  v_now timestamptz := clock_timestamp();
  v_event jsonb;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$'
    or length(trim(coalesce(p_first_name,''))) not between 1 and 60
    or length(trim(coalesce(p_last_name,''))) not between 1 and 60
    or trim(coalesce(p_first_name,'')) ~ '[<>]'
    or trim(coalesce(p_last_name,'')) ~ '[<>]'
    or length(trim(coalesce(p_email,''))) not between 3 and 254
    or trim(coalesce(p_email,'')) !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or p_birth_date is null or p_birth_date > current_date
    or p_wedding_date is null or p_wedding_date > current_date
    or p_phone !~ '^[+][1-9][0-9]{7,14}$'
    or p_holidays is null or cardinality(p_holidays)>8
    or exists(select 1 from unnest(p_holidays) h where h not in
      ('valentines','easter','mothers_day','fathers_day','thanksgiving','christmas','new_year','other','none'))
    or ('none'=any(p_holidays) and cardinality(p_holidays)>1)
    or p_special_dates is null or jsonb_typeof(p_special_dates) <> 'array'
    or jsonb_array_length(p_special_dates)>5
    or p_spouse_phone is null
    or p_spouse_phone !~ '^[+][1-9][0-9]{7,14}$'
    or p_spouse_phone=p_phone
    or length(trim(coalesce(p_spouse_first_name,''))) not between 1 and 60
    or length(trim(coalesce(p_spouse_last_name,''))) not between 1 and 60
    or trim(coalesce(p_spouse_first_name,'')) ~ '[<>]'
    or trim(coalesce(p_spouse_last_name,'')) ~ '[<>]'
    or (p_partner_token_hash is not null and p_partner_token_hash !~ '^[a-f0-9]{64}$')
    or (coalesce(p_sms_consent,false) and p_disclosure <> 'anthos-sms-2026-11-v1')
  then raise exception 'Invalid signup details' using errcode='22023'; end if;
  for v_event in select value from jsonb_array_elements(p_special_dates)
  loop
    if jsonb_typeof(v_event)<>'object'
       or length(trim(coalesce(v_event->>'label',''))) not between 1 and 80
       or coalesce(v_event->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       or to_char(to_date(v_event->>'date','YYYY-MM-DD'),'YYYY-MM-DD') <> v_event->>'date'
    then raise exception 'Invalid special date' using errcode='22023'; end if;
  end loop;

  update public.anthos_signup_invitations set redeemed_at=v_now
  where token_hash=p_token_hash and redeemed_at is null and expires_at>v_now
  returning id,program,invited_by_customer_id,intended_phone_e164
  into v_invitation_id,v_program,v_inviter_id,v_intended_phone;
  if v_invitation_id is null then raise exception 'Expired or used invitation' using errcode='22023'; end if;
  if v_intended_phone is not null and v_intended_phone<>p_phone then
    raise exception 'Invite number does not match' using errcode='22023'; end if;

  if v_inviter_id is not null then
    select group_id, phone_e164 into v_group_id,v_inviter_phone
    from public.anthos_customer_directory where id=v_inviter_id;
    if v_group_id is null or v_inviter_phone is null or v_inviter_phone <> p_spouse_phone
      or p_partner_token_hash is not null then
      raise exception 'Invited spouse does not match the original number' using errcode='22023';
    end if;
  else
    if p_partner_token_hash is null then
      raise exception 'A spouse invitation token is required' using errcode='22023';
    end if;
    v_group_id := gen_random_uuid();
  end if;

  insert into public.anthos_customer_directory
  (email,display_name,first_name,last_name,program,staff_nomination,record_status,
   group_id,birth_date,birthday_month_day,wedding_date,meaningful_holidays,holidays_reviewed_at,
   special_dates,questionnaire_submitted_at,phone_e164,phone_owner_attested_at,
   spouse_first_name,spouse_last_name,spouse_phone_e164,sms_consent_at,sms_disclosure_version,
   email_opt_in_at,signup_token_consumed_at)
  values
  (lower(trim(p_email)),trim(p_first_name)||' '||trim(p_last_name),
   trim(p_first_name),trim(p_last_name),v_program,'none','pending',v_group_id,
   p_birth_date,to_char(p_birth_date,'MM-DD'),p_wedding_date,p_holidays,v_now,p_special_dates,v_now,p_phone,v_now,
   trim(p_spouse_first_name),trim(p_spouse_last_name),
   p_spouse_phone,case when p_sms_consent then v_now end,
   case when p_sms_consent then p_disclosure end,
   null,v_now)
  returning id into v_customer_id;

  update public.anthos_signup_invitations set customer_id=v_customer_id where id=v_invitation_id;
  if v_inviter_id is null then
    insert into public.anthos_signup_invitations
      (token_hash,program,expires_at,invited_by_customer_id,intended_phone_e164)
      values(p_partner_token_hash,v_program,v_now+interval '72 hours',v_customer_id,p_spouse_phone);
  end if;
  return jsonb_build_object('customerId',v_customer_id,'partnerInvitePrepared',v_inviter_id is null);
end $function$
;

revoke all on function public.anthos_redeem_signup_v3(text,text,text,text,date,date,text[],jsonb,text,text,text,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.anthos_redeem_signup_v3(text,text,text,text,date,date,text[],jsonb,text,text,text,text,text,boolean,text) to service_role;
