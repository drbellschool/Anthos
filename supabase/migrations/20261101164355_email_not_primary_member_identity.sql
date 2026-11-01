-- Email is a contact channel, not Anthos' unique person identity.
-- Couples may legitimately share an inbox. Only verified phones must be distinct.
drop index if exists public.anthos_customer_directory_email_unique;
create index if not exists anthos_customer_directory_email_search
  on public.anthos_customer_directory (lower(email));
comment on column public.anthos_customer_directory.email is
 'Contact email. Not a unique identity; spouses may share an inbox.';
