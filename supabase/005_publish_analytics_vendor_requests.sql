-- deploy:auto
alter table if exists support_services
  add column if not exists is_published boolean not null default false;

update support_services
set is_published = coalesce(is_published, is_active, false);

create index if not exists idx_support_services_published on support_services (is_published);

drop policy if exists "public can read support_services" on support_services;

create policy "public can read support_services"
on support_services
for select
to anon, authenticated
using (is_active = true and is_published = true);

create table if not exists app_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  target_type text not null,
  target_id bigint,
  target_name text,
  path text,
  referrer text,
  ip_address text,
  user_agent text,
  visitor_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_events_created_at on app_events (created_at desc);
create index if not exists idx_app_events_event_type on app_events (event_type);
create index if not exists idx_app_events_target on app_events (target_type, target_id);
create index if not exists idx_app_events_visitor on app_events (visitor_id);

alter table app_events enable row level security;

create table if not exists vendor_requests (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  phone text,
  business_name text,
  category text not null check (category in ('taller_mecanico', 'grua', 'servicio_mecanico', 'aditivos', 'estacion')),
  city text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_requests_status on vendor_requests (status);
create index if not exists idx_vendor_requests_created_at on vendor_requests (created_at desc);
create unique index if not exists idx_vendor_requests_email_category
  on vendor_requests (lower(email), category)
  where status in ('pending', 'reviewing');

create or replace function set_vendor_request_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vendor_request_updated_at on vendor_requests;

create trigger trg_vendor_request_updated_at
before update on vendor_requests
for each row
execute function set_vendor_request_updated_at();

alter table vendor_requests enable row level security;
