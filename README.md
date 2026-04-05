# SurtiMapa V9.1

Versión estable para EasyPanel, con:
- Supabase
- mapa con Leaflet
- geolocalización opcional
- filtros
- reporte rápido
- último reporte por surtidor
- admin protegido con login
- importación por lote desde Google Maps con sugerencias de alta/actualización

## Variables de entorno
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL` o `DATABASE_URL`
- `ADMIN_SESSION_SECRET`
- `ADMIN_EMAILS`
- `AUTO_RUN_MIGRATIONS=true` opcional
- `AUTO_BOOTSTRAP_MIGRATIONS=true` opcional

## Admin
- El login del admin usa usuarios de Supabase Auth con email y contraseña.
- Solo ingresan los correos listados en `ADMIN_EMAILS`, separados por coma.
- El CRUD admin usa `SUPABASE_SERVICE_ROLE_KEY` server-side para no depender de la policy pública.

## SQL
- `supabase/001_reset_all.sql`: base inicial
- `supabase/002_admin_station_fields.sql`: columnas nuevas para estaciones y trigger de `updated_at`
- `supabase/003_support_services.sql`: talleres, grúas, mecánica y aditivos
- `supabase/004_mobile_frontend_fields.sql`: reputación de estaciones y servicios, precio y punto de encuentro

## Migraciones en deploy
- El contenedor ejecuta `npm run start:deploy`.
- Antes de levantar Next.js corre `scripts/run-deploy-migrations.mjs`.
- Solo aplica archivos marcados con `-- deploy:auto`.
- `001_reset_all.sql` está marcado como `-- deploy:bootstrap` y solo corre si no existen `stations` ni `reports`.
- El estado se guarda en `public.app_deploy_migrations`.
- Si una migración ya fue aplicada y luego cambias su contenido, el deploy falla a propósito para evitar inconsistencias.

## EasyPanel
- Configura `SUPABASE_DB_URL` con la cadena de conexión Postgres de tu proyecto Supabase.
- Recomendado: usar la conexión directa o session pooler compatible con DDL.
- Con eso, cuando subas a GitHub y EasyPanel redeploye, las migraciones nuevas marcadas para deploy se aplicarán solas.

## Nota
Esta versión evita el bloqueo del lockfile usando `npm install` en Docker.
