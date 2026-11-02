-- New consent-gated Team pilots can use message-first conversational flow.
-- Existing active pilots keep classic manual readiness behavior.
alter table public.anthos_pilot_rooms add column if not exists conversation_mode text not null default 'classic'
 check (conversation_mode in ('classic','fluid'));
comment on column public.anthos_pilot_rooms.conversation_mode is
 'Fluid mode supports numbered SMS-compatible replies and AI-guided chapter progression. No outbound SMS is enabled.';
