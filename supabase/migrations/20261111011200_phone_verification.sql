
-- Private, single-purpose transactional OTP records; never exposed to browsers.
create table if not exists public.anthos_phone_verifications (
  customer_id uuid primary key references public.anthos_customer_directory(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  code_expires_at timestamptz not null,
  session_expires_at timestamptz not null,
  last_sent_at timestamptz not null,
  send_count integer not null default 1 check (send_count between 1 and 5),
  attempts integer not null default 0 check (attempts between 0 and 8),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.anthos_phone_verifications enable row level security;
revoke all on public.anthos_phone_verifications from public, anon, authenticated;
grant select, insert, update on public.anthos_phone_verifications to service_role;

-- Only the server-side service key can invoke these functions.
create or replace function public.anthos_phone_verification_begin(
  p_customer_id uuid, p_phone text, p_token_hash text, p_code_hash text)
returns jsonb
language plpgsql set search_path = ''
as $body$
declare
  v_phone text;
  v_existing timestamptz;
  v_now timestamptz := clock_timestamp();
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid verification token' using errcode='22023';
  end if;
  select phone_e164 into v_phone from public.anthos_customer_directory
   where id=p_customer_id and record_status <> 'archived'
     and questionnaire_submitted_at is not null and phone_verified_at is null
   for update;
  if v_phone is null or v_phone <> p_phone then
    raise exception 'Account unavailable for verification' using errcode='22023';
  end if;
  select verified_at into v_existing from public.anthos_phone_verifications
   where customer_id=p_customer_id for update;
  if v_existing is not null then
    raise exception 'Already verified' using errcode='22023';
  end if;
  insert into public.anthos_phone_verifications
    (customer_id,token_hash,code_hash,phone_e164,code_expires_at,session_expires_at,last_sent_at,send_count,attempts)
  values (p_customer_id,p_token_hash,p_code_hash,p_phone,v_now+interval '10 minutes',
    v_now+interval '24 hours',v_now,1,0)
  on conflict(customer_id) do update set
    token_hash=excluded.token_hash,code_hash=excluded.code_hash,
    phone_e164=excluded.phone_e164,code_expires_at=excluded.code_expires_at,
    session_expires_at=excluded.session_expires_at,last_sent_at=excluded.last_sent_at,
    send_count=1,attempts=0;
  return jsonb_build_object('ok',true);
end
$body$;

create or replace function public.anthos_phone_verification_resend(
  p_token_hash text, p_code_hash text)
returns jsonb
language plpgsql set search_path = ''
as $body$
declare
  v_row public.anthos_phone_verifications%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid token' using errcode='22023';
  end if;
  select * into v_row from public.anthos_phone_verifications
   where token_hash=p_token_hash for update;
  if not found or v_row.verified_at is not null
    or v_row.session_expires_at <= v_now
    or v_row.send_count >= 5 or v_row.attempts >= 8
    or v_row.last_sent_at > v_now - interval '60 seconds' then
    return jsonb_build_object('ok',false,'error','Wait before requesting another code or request a new invitation.');
  end if;
  if not exists (select 1 from public.anthos_customer_directory
    where id=v_row.customer_id and record_status <> 'archived'
      and phone_e164=v_row.phone_e164 and phone_verified_at is null) then
    return jsonb_build_object('ok',false,'error','Verification no longer available.');
  end if;
  update public.anthos_phone_verifications
  set code_hash=p_code_hash,code_expires_at=v_now+interval '10 minutes',
    last_sent_at=v_now,send_count=send_count+1
  where customer_id=v_row.customer_id;
  return jsonb_build_object('ok',true,'phone',v_row.phone_e164);
end
$body$;

create or replace function public.anthos_phone_verification_confirm(
  p_token_hash text, p_code_hash text)
returns jsonb
language plpgsql set search_path = ''
as $body$
declare
  v_row public.anthos_phone_verifications%rowtype;
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_code_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('verified',false);
  end if;
  select * into v_row from public.anthos_phone_verifications
    where token_hash=p_token_hash for update;
  if not found or v_row.session_expires_at<=v_now then
    return jsonb_build_object('verified',false,'error','This verification link expired.');
  end if;
  if v_row.verified_at is not null then
    return jsonb_build_object('verified',true);
  end if;
  if v_row.attempts>=8 then
    return jsonb_build_object('verified',false,'error','Too many attempts.');
  end if;
  if v_row.code_expires_at <= v_now then
    return jsonb_build_object('verified',false,'error','Code expired. Request a new code.');
  end if;
  if v_row.code_hash <> p_code_hash then
    update public.anthos_phone_verifications set attempts=attempts+1 where customer_id=v_row.customer_id;
    return jsonb_build_object('verified',false,'error','That code was not correct.');
  end if;
  update public.anthos_customer_directory set phone_verified_at=v_now
    where id=v_row.customer_id and phone_e164=v_row.phone_e164
      and record_status <> 'archived' and questionnaire_submitted_at is not null
      and phone_verified_at is null;
  get diagnostics v_count = row_count;
  if v_count<>1 then
    return jsonb_build_object('verified',false,'error','Verification could not be completed.');
  end if;
  update public.anthos_phone_verifications set verified_at=v_now where customer_id=v_row.customer_id;
  return jsonb_build_object('verified',true);
end
$body$;

revoke all on function public.anthos_phone_verification_begin(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.anthos_phone_verification_resend(text,text) from public,anon,authenticated;
revoke all on function public.anthos_phone_verification_confirm(text,text) from public,anon,authenticated;
grant execute on function public.anthos_phone_verification_begin(uuid,text,text,text) to service_role;
grant execute on function public.anthos_phone_verification_resend(text,text) to service_role;
grant execute on function public.anthos_phone_verification_confirm(text,text) to service_role;
