-- Anthos CRM v1: independent admin-only contact directory.
-- It does NOT grant customer authentication, paid access, SMS opt-in, or pilot-room access.
create table if not exists public.anthos_customer_directory (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  program text not null default 'pilot' check (program in ('pilot','standard')),
  staff_nomination text not null default 'none' check (staff_nomination in ('none','admin_pending')),
  record_status text not null default 'pending' check (record_status in ('pending','paused','archived')),
  group_id uuid,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists anthos_customer_directory_email_unique
  on public.anthos_customer_directory (lower(email));
create index if not exists anthos_customer_directory_group
  on public.anthos_customer_directory (group_id) where group_id is not null;
create index if not exists anthos_customer_directory_program_status
  on public.anthos_customer_directory (program,record_status);
alter table public.anthos_customer_directory enable row level security;
revoke all on public.anthos_customer_directory from anon,authenticated;

create table if not exists public.anthos_customer_directory_audit (
  id bigint generated always as identity primary key,
  contact_id uuid not null,
  event text not null check (event in ('INSERT','UPDATE')),
  changes jsonb not null,
  occurred_at timestamptz not null default now()
);
alter table public.anthos_customer_directory_audit enable row level security;
revoke all on public.anthos_customer_directory_audit from anon,authenticated;

create or replace function public.anthos_audit_directory_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.anthos_customer_directory_audit(contact_id,event,changes)
    values (new.id, 'INSERT', jsonb_build_object(
      'program',new.program,'staff_nomination',new.staff_nomination,'record_status',new.record_status));
  elsif old is distinct from new then
    new.updated_at := now();
    insert into public.anthos_customer_directory_audit(contact_id,event,changes)
    values (new.id, 'UPDATE', jsonb_build_object(
      'previous_program',old.program,'program',new.program,
      'previous_staff_nomination',old.staff_nomination,'staff_nomination',new.staff_nomination,
      'previous_record_status',old.record_status,'record_status',new.record_status));
  end if;
  return new;
end $$;
revoke all on function public.anthos_audit_directory_change() from public,anon,authenticated;
drop trigger if exists anthos_customer_directory_audit_trigger on public.anthos_customer_directory;
create trigger anthos_customer_directory_audit_trigger
before insert or update on public.anthos_customer_directory
for each row execute function public.anthos_audit_directory_change();

comment on table public.anthos_customer_directory is
  'Admin-only contact directory. Program is NOT billing or product entitlement; admin_pending is NOT an administrator permission.';
