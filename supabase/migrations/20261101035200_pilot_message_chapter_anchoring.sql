alter table public.anthos_pilot_messages add column if not exists chapter_number smallint not null default 1;
alter table public.anthos_pilot_messages drop constraint if exists anthos_pilot_messages_chapter_number_check;
alter table public.anthos_pilot_messages add constraint anthos_pilot_messages_chapter_number_check check(chapter_number between 1 and 8);