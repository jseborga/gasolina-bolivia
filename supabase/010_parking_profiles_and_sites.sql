-- deploy:auto
create table if not exists app_profiles (
  id bigint generated always as identity primary key,
  full_name text not null,
  role text not null default 'parking_manager' check (role in ('parking_manager', 'trusted_reporter', 'reviewer', 'admin_assistant')),
  email text,
  phone text,
  phone_key text,
  whatsapp_number text,
  whatsapp_key text,
  telegram_chat_id text,
  manager_access_token text not null,
  reliability_score numeric(5,2) not null default 0,
  credit_balance integer not null default 0,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manager_access_token)
);

create unique index if not exists idx_app_profiles_email_unique
  on app_profiles (lower(email))
  where email is not null;

create unique index if not exists idx_app_profiles_phone_key_unique
  on app_profiles (phone_key)
  where phone_key is not null;

create unique index if not exists idx_app_profiles_whatsapp_key_unique
  on app_profiles (whatsapp_key)
  where whatsapp_key is not null;

create table if not exists parking_sites (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  city text,
  zone text,
  address text,
  latitude double precision,
  longitude double precision,
  total_spots integer,
  available_spots integer,
  pricing_text text,
  opens_at text,
  closes_at text,
  is_24h boolean not null default false,
  accepts_reservations boolean not null default false,
  height_limit_text text,
  payment_methods text,
  access_notes text,
  phone text,
  whatsapp_number text,
  source_url text,
  manager_profile_id bigint references app_profiles(id) on delete set null,
  status text not null default 'unknown' check (status in ('open', 'closed', 'full', 'unknown')),
  is_active boolean not null default true,
  is_published boolean not null default false,
  is_verified boolean not null default false,
  last_update_source text,
  last_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_spots is null or total_spots >= 0),
  check (available_spots is null or available_spots >= 0),
  check (
    total_spots is null or
    available_spots is null or
    available_spots <= total_spots
  )
);

create index if not exists idx_parking_sites_status on parking_sites (status);
create index if not exists idx_parking_sites_active on parking_sites (is_active);
create index if not exists idx_parking_sites_published on parking_sites (is_published);
create index if not exists idx_parking_sites_manager on parking_sites (manager_profile_id);
create index if not exists idx_parking_sites_updated_at on parking_sites (updated_at desc);

create table if not exists parking_updates (
  id bigint generated always as identity primary key,
  parking_site_id bigint not null references parking_sites(id) on delete cascade,
  parking_profile_id bigint references app_profiles(id) on delete set null,
  source text not null default 'admin' check (source in ('admin', 'manager_portal', 'webhook_evolution')),
  status text not null check (status in ('open', 'closed', 'full', 'unknown')),
  available_spots integer,
  pricing_text text,
  note text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (available_spots is null or available_spots >= 0)
);

create index if not exists idx_parking_updates_site on parking_updates (parking_site_id, created_at desc);
create index if not exists idx_parking_updates_profile on parking_updates (parking_profile_id, created_at desc);

create or replace function set_app_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function set_parking_site_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_profile_updated_at on app_profiles;
create trigger trg_app_profile_updated_at
before update on app_profiles
for each row
execute function set_app_profile_updated_at();

drop trigger if exists trg_parking_site_updated_at on parking_sites;
create trigger trg_parking_site_updated_at
before update on parking_sites
for each row
execute function set_parking_site_updated_at();

alter table app_profiles enable row level security;
alter table parking_sites enable row level security;
alter table parking_updates enable row level security;

drop policy if exists "public can read parking sites" on parking_sites;
create policy "public can read parking sites"
on parking_sites
for select
to anon, authenticated
using (is_active = true and is_published = true);
