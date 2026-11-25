-- Anthos couple accounts foundation (review before applying).
-- Password accounts belong to Supabase Auth; these policies permit only
-- self-owned profile writes. Spouse linking is NOT a browser-side operation.
--
-- Privacy boundary:
--   * spouse A cannot SELECT spouse B's participant profile or progress;
--   * only a spouse's own active membership reveals the couple record;
--   * no client writes to memberships, consent events, SMS, or mastery status;
--   * a server-side, authenticated, single-use invitation flow is required
--     before any two accounts can be linked.

alter table public.participants
  add column if not exists proposed_wedding_date date;

-- Date of birth is required for pilot onboarding. This is a self-declared
-- eligibility check, not identity-verified proof of age.
alter table public.participants
  alter column birth_date set not null;
alter table public.participants
  add constraint participants_adult_date_check
    check (birth_date <= (current_date - interval '18 years')::date);

-- Restrict API access explicitly. SERVICE_ROLE retains its existing rights.
revoke all on public.participants, public.couples, public.couple_members,
  public.deep_dive_progress, public.partner_shares, public.sms_consents,
  public.sms_consent_events, public.sms_outbox
  from anon, authenticated;

grant select on public.participants to authenticated;
grant insert (user_id, display_name, birth_date, proposed_wedding_date)
  on public.participants to authenticated;
grant update (display_name, birth_date, proposed_wedding_date)
  on public.participants to authenticated;

grant select on public.couple_members, public.couples,
  public.deep_dive_progress to authenticated;

-- The policies below are deliberately narrow. No open-ended authenticated
-- policies that expose records from other couples.
create policy participants_read_own on public.participants
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy participants_create_own on public.participants
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy participants_update_own on public.participants
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy couple_members_read_own on public.couple_members
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy couples_read_own_active on public.couples
  for select to authenticated
  using (exists (
    select 1 from public.couple_members cm
    where cm.couple_id = id
      and cm.user_id = (select auth.uid())
      and cm.status = 'active'
  ));

-- Clients can view only their own earned state. Future story-engine code
-- must validate choices/mastery before a trusted server writes progress.
create policy deep_dive_progress_read_own on public.deep_dive_progress
  for select to authenticated
  using ((select auth.uid()) = participant_id);

-- Enforce one active couple membership per account; pending invitations may
-- coexist but must be accepted by a validated, single-use server endpoint.
create unique index if not exists couple_members_one_active_per_user
  on public.couple_members (user_id) where status = 'active';

-- No direct browser grants/policies for SMS consent events, outbox, or
-- partner sharing. Consent and sharing require audited server workflows.
