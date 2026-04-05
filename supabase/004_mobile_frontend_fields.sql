-- deploy:auto
alter table if exists stations
  add column if not exists reputation_score numeric(2,1) not null default 0,
  add column if not exists reputation_votes integer not null default 0;

update stations
set
  reputation_score = coalesce(reputation_score, 0),
  reputation_votes = coalesce(reputation_votes, 0);

alter table if exists support_services
  add column if not exists price_text text,
  add column if not exists meeting_point text,
  add column if not exists rating_score numeric(2,1) not null default 0,
  add column if not exists rating_count integer not null default 0;

update support_services
set
  rating_score = coalesce(rating_score, 0),
  rating_count = coalesce(rating_count, 0);
