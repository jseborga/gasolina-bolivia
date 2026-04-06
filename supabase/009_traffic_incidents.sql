-- deploy:auto
create table if not exists traffic_incidents (
  id bigint generated always as identity primary key,
  incident_type text not null check (
    incident_type in ('control_vial', 'corte_via', 'marcha', 'accidente', 'derrumbe', 'otro')
  ),
  description text,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 350 check (radius_meters between 100 and 3000),
  confirmation_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'resolved', 'expired')),
  reporter_key text not null,
  visitor_id text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '4 hours'),
  resolved_at timestamptz
);

create index if not exists idx_traffic_incidents_status_expires
  on traffic_incidents (status, expires_at desc);

create index if not exists idx_traffic_incidents_created_at
  on traffic_incidents (created_at desc);

create table if not exists traffic_incident_confirmations (
  id bigint generated always as identity primary key,
  incident_id bigint not null references traffic_incidents(id) on delete cascade,
  reviewer_key text not null,
  visitor_id text,
  ip_address text,
  latitude_bucket numeric(8,3),
  longitude_bucket numeric(8,3),
  user_agent text,
  created_at timestamptz not null default now(),
  unique (incident_id, reviewer_key)
);

create index if not exists idx_traffic_incident_confirmations_incident
  on traffic_incident_confirmations (incident_id, created_at desc);

drop policy if exists "public can read active traffic incidents" on traffic_incidents;

create policy "public can read active traffic incidents"
on traffic_incidents
for select
to anon, authenticated
using (status = 'active' and expires_at > now());

alter table traffic_incidents enable row level security;
alter table traffic_incident_confirmations enable row level security;
