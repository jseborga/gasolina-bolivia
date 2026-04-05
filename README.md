# SurtiMapa V9.1

Versión estable para EasyPanel, con:
- Supabase
- mapa con Leaflet
- geolocalización opcional
- filtros
- reporte rápido
- último reporte por surtidor
- admin protegido con login

## Variables de entorno
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SESSION_SECRET`
- `ADMIN_EMAILS`

## Admin
- El login del admin usa usuarios de Supabase Auth con email y contraseña.
- Solo ingresan los correos listados en `ADMIN_EMAILS`, separados por coma.
- El CRUD admin usa `SUPABASE_SERVICE_ROLE_KEY` server-side para no depender de la policy pública.

## SQL
- `supabase/001_reset_all.sql`: base inicial
- `supabase/002_admin_station_fields.sql`: columnas nuevas para estaciones y trigger de `updated_at`

## Nota
Esta versión evita el bloqueo del lockfile usando `npm install` en Docker.
