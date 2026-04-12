-- deploy:auto
alter table if exists place_reports
  add column if not exists status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  add column if not exists review_notes text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_email text;

create index if not exists idx_place_reports_status_created_at
  on place_reports (status, created_at desc);

create table if not exists community_contributions (
  id bigint generated always as identity primary key,
  source_type text not null check (
    source_type in ('fuel_report', 'place_report', 'traffic_incident', 'parking_update')
  ),
  source_id bigint not null,
  app_profile_id bigint references app_profiles(id) on delete set null,
  contributor_role text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'auto_flagged')),
  duplicate_signature text,
  risk_flags jsonb not null default '[]'::jsonb,
  points_suggested integer not null default 0,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  review_notes text,
  reviewer_email text,
  reviewed_at timestamptz,
  payout_status text not null default 'accrued' check (payout_status in ('accrued', 'paid', 'withheld')),
  visitor_id text,
  ip_address text,
  latitude_bucket numeric(8,3),
  longitude_bucket numeric(8,3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists idx_community_contributions_status_created_at
  on community_contributions (status, created_at desc);

create index if not exists idx_community_contributions_profile_created_at
  on community_contributions (app_profile_id, created_at desc);

create index if not exists idx_community_contributions_source
  on community_contributions (source_type, source_id);

create index if not exists idx_community_contributions_duplicate_signature
  on community_contributions (source_type, duplicate_signature, created_at desc);

create table if not exists credit_ledger (
  id bigint generated always as identity primary key,
  app_profile_id bigint not null references app_profiles(id) on delete cascade,
  contribution_id bigint references community_contributions(id) on delete set null,
  entry_type text not null default 'reward' check (entry_type in ('reward', 'adjustment', 'payout')),
  amount integer not null,
  note text,
  balance_after integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_ledger_profile_created_at
  on credit_ledger (app_profile_id, created_at desc);

create index if not exists idx_credit_ledger_contribution
  on credit_ledger (contribution_id);

create or replace function set_community_contribution_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_community_contribution_updated_at on community_contributions;
create trigger trg_community_contribution_updated_at
before update on community_contributions
for each row
execute function set_community_contribution_updated_at();

alter table community_contributions enable row level security;
alter table credit_ledger enable row level security;
