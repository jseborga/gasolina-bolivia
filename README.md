# SurtiMapa V8

Esta versión agrega:

- mapa real con Leaflet + OpenStreetMap
- pines por estado
- filtros por combustible, estado y zona
- formulario funcional de reportes
- lectura de último reporte por surtidor

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

## Despliegue en EasyPanel

- conecta el repo
- usa el Dockerfile incluido
- agrega las variables de entorno
- haz redeploy

## SQL
Ejecuta:

- `supabase/001_reset_all.sql`
