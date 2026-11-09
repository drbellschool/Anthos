-- Anthos 4.0 editorial drafts: separate JSON plan from the legacy scenario's
-- publicly visible seed fields. Only admin-authenticated server endpoints read/write.
-- Existing pilot stories, room versions, conversations and SMS are not modified.
alter table public.anthos_jj2_scenarios
  add column if not exists episode_studio jsonb;
comment on column public.anthos_jj2_scenarios.episode_studio is
  'Anthos 4.0 private editorial plan: assigned research skills, 6 flexible phases, narrative boundaries and custom humor. Not read by legacy pilot engines.';
