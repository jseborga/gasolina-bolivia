-- deploy:auto
alter table if exists stations
  add column if not exists city text,
  add column if not exists fuel_especial boolean not null default true,
  add column if not exists fuel_premium boolean not null default false,
  add column if not exists fuel_diesel boolean not null default true,
  add column if not exists fuel_gnv boolean not null default false,
  add column if not exists is_verified boolean not null default false,
  add column if not exists source_url text,
  add column if not exists notes text,
  add column if not exists license_code text,
  add column if not exists updated_at timestamptz not null default now();

update stations
set
  city = coalesce(city, 'La Paz'),
  fuel_especial = coalesce(fuel_especial, true),
  fuel_premium = coalesce(fuel_premium, false),
  fuel_diesel = coalesce(fuel_diesel, true),
  fuel_gnv = coalesce(fuel_gnv, false),
  is_verified = coalesce(is_verified, false),
  updated_at = coalesce(updated_at, created_at, now());

create index if not exists idx_stations_is_verified on stations (is_verified);
create index if not exists idx_stations_updated_at on stations (updated_at desc);

create or replace function set_station_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_station_updated_at on stations;

create trigger trg_station_updated_at
before update on stations
for each row
execute function set_station_updated_at();
