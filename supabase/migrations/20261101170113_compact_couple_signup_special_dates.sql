-- Additive schema migration applied November 1, 2026.
alter table public.anthos_customer_directory add column if not exists first_name text,
 add column if not exists last_name text,
 add column if not exists special_dates jsonb not null default '[]'::jsonb,
 add column if not exists spouse_first_name text,
 add column if not exists spouse_phone_e164 text;
alter table public.anthos_signup_invitations add column if not exists invited_by_customer_id uuid references public.anthos_customer_directory(id) on delete set null,
 add column if not exists intended_phone_e164 text;
alter table public.anthos_customer_directory add constraint anthos_special_dates_array check (jsonb_typeof(special_dates)='array' and jsonb_array_length(special_dates)<=5),
 add constraint anthos_spouse_phone_e164 check (spouse_phone_e164 is null or spouse_phone_e164 ~ '^[+][1-9][0-9]{7,14}$');
CREATE OR REPLACE FUNCTION public.anthos_redeem_signup_v2(p_token_hash text, p_first_name text, p_last_name text, p_email text, p_birth_md text, p_wedding_date date, p_holidays text[], p_special_dates jsonb, p_phone text, p_spouse_first_name text, p_spouse_phone text, p_partner_token_hash text, p_sms_consent boolean, p_email_consent boolean, p_disclosure text)
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
    or p_birth_md !~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    or p_wedding_date is null or p_wedding_date > current_date
    or p_phone !~ '^[+][1-9][0-9]{7,14}$'
    or p_holidays is null or cardinality(p_holidays)>8
    or exists(select 1 from unnest(p_holidays) h where h not in
      ('valentines','easter','mothers_day','fathers_day','thanksgiving','christmas','new_year','other','none'))
    or ('none'=any(p_holidays) and cardinality(p_holidays)>1)
    or p_special_dates is null or jsonb_typeof(p_special_dates) <> 'array'
    or jsonb_array_length(p_special_dates)>5
    or (p_spouse_phone is null and (p_spouse_first_name is not null or p_partner_token_hash is not null))
    or (p_spouse_phone is not null and
      (p_spouse_phone !~ '^[+][1-9][0-9]{7,14}$'
       or p_spouse_phone=p_phone or length(trim(coalesce(p_spouse_first_name,''))) not between 1 and 60
       or p_partner_token_hash !~ '^[a-f0-9]{64}$'))
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
    select group_id into v_group_id from public.anthos_customer_directory where id=v_inviter_id;
  elsif p_spouse_phone is not null then
    v_group_id := gen_random_uuid();
  end if;

  insert into public.anthos_customer_directory
  (email,display_name,first_name,last_name,program,staff_nomination,record_status,
   group_id,birthday_month_day,wedding_date,meaningful_holidays,holidays_reviewed_at,
   special_dates,questionnaire_submitted_at,phone_e164,phone_owner_attested_at,
   spouse_first_name,spouse_phone_e164,sms_consent_at,sms_disclosure_version,
   email_opt_in_at,signup_token_consumed_at)
  values
  (lower(trim(p_email)),trim(p_first_name)||' '||trim(p_last_name),
   trim(p_first_name),trim(p_last_name),v_program,'none','pending',v_group_id,
   p_birth_md,p_wedding_date,p_holidays,v_now,p_special_dates,v_now,p_phone,v_now,
   nullif(trim(coalesce(p_spouse_first_name,'')),''),
   p_spouse_phone,case when p_sms_consent then v_now end,
   case when p_sms_consent then p_disclosure end,
   case when p_email_consent then v_now end,v_now)
  returning id into v_customer_id;

  update public.anthos_signup_invitations set customer_id=v_customer_id where id=v_invitation_id;
  if p_spouse_phone is not null and p_partner_token_hash is not null then
    insert into public.anthos_signup_invitations
      (token_hash,program,expires_at,invited_by_customer_id,intended_phone_e164)
      values(p_partner_token_hash,v_program,v_now+interval '72 hours',v_customer_id,p_spouse_phone);
  end if;
  return jsonb_build_object('customerId',v_customer_id,'partnerInvitePrepared',p_spouse_phone is not null);
end $function$
;
revoke all on function public.anthos_redeem_signup_v2(text,text,text,text,text,date,text[],jsonb,text,text,text,text,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.anthos_redeem_signup_v2(text,text,text,text,text,date,text[],jsonb,text,text,text,text,boolean,boolean,text) to service_role;
alter table public.anthos_customer_directory enable row level security;
alter table public.anthos_signup_invitations enable row level security;
revoke all on public.anthos_customer_directory,public.anthos_signup_invitations from anon,authenticated;
