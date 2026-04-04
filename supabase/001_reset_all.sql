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

create table reports (
  id bigint generated always as identity primary key,
  station_id bigint not null references stations(id) on delete cascade,
  fuel_type text not null check (fuel_type in ('especial', 'premium', 'diesel')),
  availability_status text not null check (availability_status in ('si_hay', 'no_hay', 'sin_dato')),
  queue_status text not null check (queue_status in ('corta', 'media', 'larga', 'sin_dato')),
  comment text,
  created_at timestamptz not null default now()
);

insert into stations (name, zone, address, latitude, longitude, is_active)
values
  ('Surtidor El Volcán', 'Miraflores', 'Av. Busch, Miraflores', -16.5000, -68.1200, true),
  ('Surtidor Sopocachi', 'Sopocachi', 'Av. 20 de Octubre', -16.5145, -68.1295, true),
  ('Surtidor Obrajes', 'Obrajes', 'Av. Hernando Siles', -16.5230, -68.1130, true);

insert into reports (station_id, fuel_type, availability_status, queue_status, comment)
values
  (1, 'especial', 'si_hay', 'media', 'Todavía hay, pero la fila avanza lento.'),
  (2, 'premium', 'no_hay', 'larga', 'No hay premium por ahora.'),
  (3, 'diesel', 'si_hay', 'corta', 'Atención rápida.');

alter table stations enable row level security;
alter table reports enable row level security;

create policy "public can read stations"
on stations
for select
to anon, authenticated
using (true);

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
