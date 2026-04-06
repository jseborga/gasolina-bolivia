-- deploy:auto
create table if not exists station_reviews (
  id bigint generated always as identity primary key,
  station_id bigint not null references stations(id) on delete cascade,
  reviewer_key text not null,
  visitor_id text,
  ip_address text,
  latitude_bucket numeric(8,3),
  longitude_bucket numeric(8,3),
  score integer not null check (score between 1 and 5),
  comment text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_station_reviews_unique_reviewer
  on station_reviews (station_id, reviewer_key);

create index if not exists idx_station_reviews_station
  on station_reviews (station_id);

create index if not exists idx_station_reviews_created_at
  on station_reviews (created_at desc);

create or replace function set_station_review_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_station_review_updated_at on station_reviews;

create trigger trg_station_review_updated_at
before update on station_reviews
for each row
execute function set_station_review_updated_at();

alter table station_reviews enable row level security;
