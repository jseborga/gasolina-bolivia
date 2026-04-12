# SurtiMapa V9.1

Version estable para EasyPanel, con:
- Supabase
- mapa con Leaflet
- geolocalizacion opcional
- filtros
- reporte rapido
- ultimo reporte por surtidor
- admin protegido con login
- importacion por lote desde Google Maps con sugerencias de alta/actualizacion
- modulo de parqueos con perfiles, portal de encargado y webhook para Evolution API

## Variables de entorno
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL` o `DATABASE_URL`
- `ADMIN_SESSION_SECRET`
- `ADMIN_EMAILS`
- `EVOLUTION_WEBHOOK_SECRET` opcional para validar `/api/webhooks/evolution/parking`
- `AUTO_RUN_MIGRATIONS=true` opcional
- `AUTO_BOOTSTRAP_MIGRATIONS=true` opcional

## Admin
- El login del admin usa usuarios de Supabase Auth con email y contrasena.
- Solo ingresan los correos listados en `ADMIN_EMAILS`, separados por coma.
- El CRUD admin usa `SUPABASE_SERVICE_ROLE_KEY` server-side para no depender de la policy publica.

## SQL
- `supabase/001_reset_all.sql`: base inicial
- `supabase/002_admin_station_fields.sql`: columnas nuevas para estaciones y trigger de `updated_at`
- `supabase/003_support_services.sql`: talleres, gruas, mecanica y aditivos
- `supabase/004_mobile_frontend_fields.sql`: reputacion de estaciones y servicios, precio y punto de encuentro
- `supabase/009_traffic_incidents.sql`: incidentes viales con radio de afectacion
- `supabase/010_parking_profiles_and_sites.sql`: perfiles, parqueos y bitacora de actualizaciones

## Migraciones en deploy
- El contenedor ejecuta `npm run start:deploy`.
- Antes de levantar Next.js corre `scripts/run-deploy-migrations.mjs`.
- Solo aplica archivos marcados con `-- deploy:auto`.
- `001_reset_all.sql` esta marcado como `-- deploy:bootstrap` y solo corre si no existen `stations` ni `reports`.
- El estado se guarda en `public.app_deploy_migrations`.
- Si una migracion ya fue aplicada y luego cambias su contenido, el deploy falla a proposito para evitar inconsistencias.

## EasyPanel
- Configura `SUPABASE_DB_URL` con la cadena de conexion Postgres de tu proyecto Supabase.
- Recomendado: usar la conexion directa o session pooler compatible con DDL.
- Con eso, cuando subas a GitHub y EasyPanel redeploye, las migraciones nuevas marcadas para deploy se aplicaran solas.

## Nota
Esta version evita el bloqueo del lockfile usando `npm install` en Docker.

## Dependencias
- El build del contenedor usa `npm install --package-lock=false`.
- `package.json` es la fuente efectiva para resolver dependencias en deploy.
- Si actualizas `next` u otra dependencia principal, regenera `package-lock.json` en una maquina con red estable antes de volver a un flujo basado en lockfile.
