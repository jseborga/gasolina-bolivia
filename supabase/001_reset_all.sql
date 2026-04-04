
-- Reset base para SurtiMapa
-- Ejecuta todo este script en Supabase SQL Editor

begin;

-- Limpiar tablas si existían
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS stations CASCADE;

-- Tabla principal de surtidores
CREATE TABLE stations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  zone text,
  address text,
  latitude double precision,
  longitude double precision,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla de reportes colaborativos
CREATE TABLE reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id bigint NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  fuel_type text NOT NULL CHECK (fuel_type IN ('especial','premium','diesel')),
  availability_status text NOT NULL CHECK (availability_status IN ('hay','no_hay','desconocido')),
  queue_status text NOT NULL DEFAULT 'sin_dato' CHECK (queue_status IN ('sin_dato','corta','media','larga')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Datos de prueba
INSERT INTO stations (name, zone, address, latitude, longitude, is_active)
VALUES
  ('Surtidor El Volcán', 'Miraflores', 'Zona Miraflores', -16.5000, -68.1200, true),
  ('Surtidor Plaza Triangular', 'Centro', 'Plaza Triangular', -16.4950, -68.1330, true),
  ('Surtidor Obrajes', 'Obrajes', 'Av. Hernando Siles', -16.5230, -68.1130, true);

INSERT INTO reports (station_id, fuel_type, availability_status, queue_status, comment)
VALUES
  (1, 'especial', 'hay', 'media', 'Reporte inicial de prueba'),
  (2, 'premium', 'no_hay', 'larga', 'Sin premium al momento'),
  (3, 'diesel', 'hay', 'corta', 'Flujo normal');

-- RLS y permisos para pruebas MVP
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stations_select_public" ON stations;
CREATE POLICY "stations_select_public"
ON stations FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "reports_select_public" ON reports;
CREATE POLICY "reports_select_public"
ON reports FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "reports_insert_public" ON reports;
CREATE POLICY "reports_insert_public"
ON reports FOR INSERT
TO anon, authenticated
WITH CHECK (true);

commit;
