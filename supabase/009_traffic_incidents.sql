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
  rejection_count integer not null default 0,
  duration_minutes integer not null default 240 check (duration_minutes between 15 and 720),
  status text not null default 'active' check (status in ('active', 'resolved', 'expired')),
  reporter_key text not null,
  visitor_id text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '4 hours'),
  resolved_at timestamptz
);

alter table if exists traffic_incidents
  add column if not exists rejection_count integer not null default 0,
  add column if not exists duration_minutes integer not null default 240;

update traffic_incidents
set
  rejection_count = coalesce(rejection_count, 0),
  duration_minutes = coalesce(duration_minutes, 240);

create index if not exists idx_traffic_incidents_status_expires
  on traffic_incidents (status, expires_at desc);

create index if not exists idx_traffic_incidents_created_at
  on traffic_incidents (created_at desc);

create table if not exists traffic_incident_confirmations (
  id bigint generated always as identity primary key,
  incident_id bigint not null references traffic_incidents(id) on delete cascade,
  reviewer_key text not null,
  vote_state text not null default 'confirm' check (vote_state in ('confirm', 'reject')),
  visitor_id text,
  ip_address text,
  latitude_bucket numeric(8,3),
  longitude_bucket numeric(8,3),
  user_agent text,
  created_at timestamptz not null default now(),
  unique (incident_id, reviewer_key)
);

alter table if exists traffic_incident_confirmations
  add column if not exists vote_state text not null default 'confirm';

update traffic_incident_confirmations
set vote_state = coalesce(vote_state, 'confirm');

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
