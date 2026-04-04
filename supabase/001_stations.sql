create table if not exists public.stations (
  id bigint generated always as identity primary key,
  name text not null,
  zone text,
  address text,
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.stations enable row level security;

drop policy if exists "stations_select_public" on public.stations;
create policy "stations_select_public"
on public.stations
for select
to anon, authenticated
using (true);

insert into public.stations (name, zone, address, latitude, longitude)
values
  ('Surtidor El Volcán', 'Miraflores', 'Zona Miraflores', -16.5000, -68.1200),
  ('Surtidor Plaza Triangular', 'Centro', 'Plaza Triangular', -16.4950, -68.1330),
  ('Surtidor Obrajes', 'Obrajes', 'Av. Hernando Siles', -16.5230, -68.1130)
on conflict do nothing;
