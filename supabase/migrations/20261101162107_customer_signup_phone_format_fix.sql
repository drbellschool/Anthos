alter table public.anthos_customer_directory
drop constraint if exists anthos_directory_phone_format_check;
alter table public.anthos_customer_directory
add constraint anthos_directory_phone_format_check check (
phone_e164 is null or phone_e164 ~ '^[+][1-9][0-9]{7,14}$'
);
