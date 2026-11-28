-- Durable signed SMS retries pinned to the originating private pilot route.
-- Payloads are encrypted server-side and removed on successful processing.
-- This is additive; no existing text or participant data is altered.
alter table public.anthos_jj41_sms_webhook_events
 add column if not exists room_id uuid,
 add column if not exists session_id uuid,
 add column if not exists encrypted_payload text,
 add column if not exists attempt_count integer not null default 0,
 add column if not exists next_retry_at timestamptz,
 add column if not exists last_error_code text,
 add column if not exists provider_message_id text,
 add column if not exists delivery_state text;
create index if not exists anthos_jj43_sms_retry_due
 on public.anthos_jj41_sms_webhook_events(next_retry_at)
 where encrypted_payload is not null and processing_state <> 'complete';
create index if not exists anthos_jj43_sms_inbox_room
 on public.anthos_jj41_sms_webhook_events(room_id,processing_state);
alter table public.anthos_jj41_sms_webhook_events enable row level security;
revoke all on public.anthos_jj41_sms_webhook_events from public,anon,authenticated;
grant select,insert,update on public.anthos_jj41_sms_webhook_events to service_role;
