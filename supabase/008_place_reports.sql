-- deploy:auto
create table if not exists place_reports (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('station', 'service')),
  target_id bigint not null,
  target_name text,
  reason text not null check (reason in ('not_exists', 'wrong_location', 'duplicate', 'closed', 'other')),
  notes text,
  reviewer_key text not null,
  visitor_id text,
  ip_address text,
  latitude_bucket numeric(8,3),
  longitude_bucket numeric(8,3),
  user_agent text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_place_reports_unique_reviewer
  on place_reports (target_type, target_id, reason, reviewer_key);

create index if not exists idx_place_reports_target
  on place_reports (target_type, target_id, created_at desc);

create index if not exists idx_place_reports_created_at
  on place_reports (created_at desc);

alter table place_reports enable row level security;
