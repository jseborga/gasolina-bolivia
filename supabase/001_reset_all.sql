drop table if exists reports cascade;
drop table if exists stations cascade;

create table stations (
  id bigint generated always as identity primary key,
  name text not null,
  zone text,
  address text,
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into stations (name, zone, address, latitude, longitude, is_active)
values
  ('Surtidor El Volcán', 'Miraflores', 'Zona Miraflores', -16.5000, -68.1200, true),
  ('Surtidor Plaza Triangular', 'Centro', 'Plaza Triangular', -16.4950, -68.1330, true),
  ('Surtidor Obrajes', 'Obrajes', 'Av. Hernando Siles', -16.5230, -68.1130, true);

alter table stations enable row level security;

create policy "public can read stations"
on stations
for select
to anon, authenticated
using (true);

create table reports (
  id bigint generated always as identity primary key,
  station_id bigint not null references stations(id) on delete cascade,
  fuel_type text not null check (fuel_type in ('especial', 'premium', 'diesel')),
  availability_status text not null check (availability_status in ('si_hay', 'no_hay', 'sin_dato')),
  queue_status text not null check (queue_status in ('corta', 'media', 'larga', 'sin_dato')),
  comment text,
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

create policy "public can read reports"
on reports
for select
to anon, authenticated
using (true);

create policy "public can insert reports"
on reports
for insert
to anon, authenticated
with check (true);
