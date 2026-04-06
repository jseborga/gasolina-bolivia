-- Manual seed for Santa Cruz stations
-- Source date: 2026-04-05
-- Source: Agencia Nacional de Hidrocarburos (ANH)
-- Assumes migrations 002_admin_station_fields.sql and 004_mobile_frontend_fields.sql were already applied.

begin;

with source_rows as (
  select *
  from (
    values
      ('SCZ-001', 'E.S. EL PARI', 'Santa Cruz', 'Santa Cruz de la Sierra', 'Av. Grigota y Segundo Anillo', -17.7952::double precision, -63.1914::double precision, true, true, false, true, true, 'GE, DO, GNV', true),
      ('SCZ-002', 'E.S. BANZER', 'Santa Cruz', 'Santa Cruz de la Sierra', 'Av. Banzer entre 3er y 4to Anillo', -17.7538::double precision, -63.1712::double precision, true, true, false, true, false, 'GE, DO', true),
      ('MNT-001', 'E.S. MUYURINA', 'Santa Cruz', 'Montero', 'Carr. Norte Km 48', -17.3512::double precision, -63.2455::double precision, true, true, false, true, true, 'GE, DO, GNV', true),
      ('WRN-001', 'E.S. WARNES', 'Santa Cruz', 'Warnes', 'Av. Principal esq. Calle 1', -17.5144::double precision, -63.1688::double precision, true, true, false, true, false, 'GE, DO', true),
      ('CAM-001', 'E.S. CHORETI', 'Santa Cruz', 'Camiri', 'Zona Choreti, Carr. Internacional', -20.0315::double precision, -63.5212::double precision, true, true, false, true, false, 'GE, DO', false),
      ('SJR-001', 'E.S. SAN JOSE', 'Santa Cruz', 'San Jose de Chiquitos', 'Calle Comercio s/n', -17.8458::double precision, -60.7412::double precision, true, true, false, true, false, 'GE, DO', true),
      ('PSZ-001', 'E.S. ARROYO CONCEPCION', 'Santa Cruz', 'Puerto Quijarro', 'Frontera con Brasil', -19.0152::double precision, -57.7124::double precision, true, true, false, true, false, 'GE, DO', true)
  ) as t(
    license_code,
    name,
    zone,
    city,
    address,
    latitude,
    longitude,
    fuel_especial,
    fuel_diesel,
    fuel_premium,
    is_active,
    fuel_gnv,
    products_text,
    operates_24h
  )
),
updated_existing as (
  update stations st
  set
    name = s.name,
    zone = s.zone,
    city = s.city,
    address = s.address,
    latitude = s.latitude,
    longitude = s.longitude,
    fuel_especial = s.fuel_especial,
    fuel_premium = s.fuel_premium,
    fuel_diesel = s.fuel_diesel,
    fuel_gnv = s.fuel_gnv,
    is_active = s.is_active,
    is_verified = true,
    source_url = 'ANH',
    notes = 'Carga manual validada desde ANH el 2026-04-05. Productos: ' || s.products_text || '. Operacion 24h: ' || case when s.operates_24h then 'si' else 'no' end || '. Disponibilidad inicial marcada para gasolina especial.',
    reputation_score = 5.0,
    reputation_votes = greatest(coalesce(st.reputation_votes, 0), 1)
  from source_rows s
  where st.license_code = s.license_code
  returning st.id, st.license_code
),
inserted_new as (
  insert into stations (
    name,
    zone,
    city,
    address,
    latitude,
    longitude,
    fuel_especial,
    fuel_premium,
    fuel_diesel,
    fuel_gnv,
    is_active,
    is_verified,
    source_url,
    notes,
    license_code,
    reputation_score,
    reputation_votes
  )
  select
    s.name,
    s.zone,
    s.city,
    s.address,
    s.latitude,
    s.longitude,
    s.fuel_especial,
    s.fuel_premium,
    s.fuel_diesel,
    s.fuel_gnv,
    s.is_active,
    true,
    'ANH',
    'Carga manual validada desde ANH el 2026-04-05. Productos: ' || s.products_text || '. Operacion 24h: ' || case when s.operates_24h then 'si' else 'no' end || '. Disponibilidad inicial marcada para gasolina especial.',
    s.license_code,
    5.0,
    1
  from source_rows s
  where not exists (
    select 1
    from stations existing
    where existing.license_code = s.license_code
  )
  returning id, license_code
),
resolved as (
  select id, license_code
  from updated_existing

  union all

  select id, license_code
  from inserted_new

  union all

  select st.id, st.license_code
  from stations st
  join source_rows s on s.license_code = st.license_code
),
report_source as (
  select
    r.id as station_id,
    s.license_code,
    case when s.fuel_especial then 'especial' else 'diesel' end::text as fuel_type,
    'si_hay'::text as availability_status,
    'sin_dato'::text as queue_status,
    'Carga inicial ANH 2026-04-05: gasolina disponible.'::text as comment
  from resolved r
  join source_rows s on s.license_code = r.license_code
)
insert into reports (
  station_id,
  fuel_type,
  availability_status,
  queue_status,
  comment,
  created_at
)
select
  rs.station_id,
  rs.fuel_type,
  rs.availability_status,
  rs.queue_status,
  rs.comment,
  timestamptz '2026-04-05 12:00:00-04'
from report_source rs
where not exists (
  select 1
  from reports rep
  where rep.station_id = rs.station_id
    and rep.fuel_type = rs.fuel_type
    and rep.comment = rs.comment
    and rep.created_at::date = date '2026-04-05'
);

commit;
