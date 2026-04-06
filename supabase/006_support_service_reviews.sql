-- deploy:auto
create table if not exists support_service_reviews (
  id bigint generated always as identity primary key,
  service_id bigint not null references support_services(id) on delete cascade,
  reviewer_key text not null,
  visitor_id text,
  ip_address text,
  user_agent text,
  latitude_bucket numeric(8,3),
  longitude_bucket numeric(8,3),
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, reviewer_key)
);

create index if not exists idx_support_service_reviews_service_id
  on support_service_reviews (service_id, created_at desc);

create index if not exists idx_support_service_reviews_visitor
  on support_service_reviews (visitor_id);

create or replace function set_support_service_review_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_support_service_review_updated_at on support_service_reviews;

create trigger trg_support_service_review_updated_at
before update on support_service_reviews
for each row
execute function set_support_service_review_updated_at();

alter table support_service_reviews enable row level security;
