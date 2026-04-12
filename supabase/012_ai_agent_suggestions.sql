-- deploy:auto
create table if not exists agent_report_suggestions (
  id bigint generated always as identity primary key,
  provider text not null default 'custom' check (provider in ('openai', 'anthropic', 'custom')),
  source_label text not null,
  kind text not null check (
    kind in ('fuel_report', 'traffic_incident', 'parking_update', 'place_report', 'advisory')
  ),
  synthetic_mode text not null default 'ai_simulated' check (
    synthetic_mode in ('ai_simulated', 'ai_draft', 'external_signal')
  ),
  visibility text not null default 'admin_only' check (visibility in ('admin_only', 'public_demo')),
  status text not null default 'pending_review' check (
    status in ('pending_review', 'approved', 'rejected')
  ),
  title text not null,
  summary text,
  city text,
  zone text,
  latitude double precision,
  longitude double precision,
  radius_meters integer check (radius_meters is null or radius_meters between 50 and 5000),
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 1),
  criteria jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  review_notes text,
  reviewed_by_email text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_report_suggestions_status_created_at
  on agent_report_suggestions (status, created_at desc);

create index if not exists idx_agent_report_suggestions_visibility_created_at
  on agent_report_suggestions (visibility, created_at desc);

create index if not exists idx_agent_report_suggestions_kind_created_at
  on agent_report_suggestions (kind, created_at desc);

create or replace function set_agent_report_suggestion_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_agent_report_suggestion_updated_at on agent_report_suggestions;
create trigger trg_agent_report_suggestion_updated_at
before update on agent_report_suggestions
for each row
execute function set_agent_report_suggestion_updated_at();

alter table agent_report_suggestions enable row level security;
