create table if not exists support_services (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null check (category in ('taller_mecanico', 'grua', 'servicio_mecanico', 'aditivos')),
  zone text,
  city text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  whatsapp_number text,
  website_url text,
  description text,
  is_active boolean not null default true,
  is_verified boolean not null default false,
  source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_services_category on support_services (category);
create index if not exists idx_support_services_active on support_services (is_active);
create index if not exists idx_support_services_updated_at on support_services (updated_at desc);

create or replace function set_support_service_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_support_service_updated_at on support_services;

create trigger trg_support_service_updated_at
before update on support_services
for each row
execute function set_support_service_updated_at();

alter table support_services enable row level security;

create policy "public can read support_services"
on support_services
for select
to anon, authenticated
using (is_active = true);
