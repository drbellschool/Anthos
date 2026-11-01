-- Bind explicitly administrator-selected private beta rooms to existing customer IDs.
-- Grouping is not phone verification, Auth activation, or customer access permission.
alter table public.anthos_pilot_participants
 add column if not exists customer_id uuid references public.anthos_customer_directory(id) on delete set null;
create unique index if not exists anthos_pilot_unique_customer_per_room
 on public.anthos_pilot_participants(room_id,customer_id) where customer_id is not null;
comment on column public.anthos_pilot_participants.customer_id is
 'Admin-selected customer identity for private beta room personalization only. Token holder still separately consents; never a replacement for account authentication.';
alter table public.anthos_pilot_participants enable row level security;
revoke all on public.anthos_pilot_participants from anon,authenticated;
