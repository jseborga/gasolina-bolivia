# SurtiMapa - Paso 1 con Supabase

Versión base para subir a GitHub y redeployar en EasyPanel.

## Qué incluye
- Next.js 15 con App Router
- Tailwind CSS
- Dockerfile listo para EasyPanel
- conexión a Supabase
- lectura de la tabla `stations`
- endpoint `/api/health`
- manifest básico para PWA

## Variables de entorno en EasyPanel
Agrega estas 2 variables y luego haz redeploy:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Tabla mínima en Supabase
Ejecuta el SQL del archivo:

- `supabase/001_stations.sql`

## Despliegue
1. Sube esta carpeta a un repositorio nuevo en GitHub.
2. En EasyPanel conecta el repo.
3. Verifica que use el `Dockerfile`.
4. Internal Port: `3000`
5. Guarda las variables de entorno.
6. Haz redeploy.

## Desarrollo local opcional
```bash
npm install
npm run dev
```

## Qué debe pasar si todo está bien
La home mostrará:
- un bloque de conexión exitosa
- el número de surtidores activos
- las tarjetas de surtidores guardadas en Supabase
