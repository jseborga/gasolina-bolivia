# SurtiMapa - Fase 3

Proyecto base para EasyPanel + Next.js + Supabase.

## Variables requeridas
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Despliegue
1. Sube este repo a GitHub.
2. Conecta el repo en EasyPanel.
3. Verifica los build args / env vars con las variables de Supabase.
4. Ejecuta el SQL de `supabase/001_reset_all.sql`.
5. Redeploy.

## Qué incluye esta fase
- Lectura de `stations`
- Lectura de `reports`
- Formulario real para insertar reportes
- Visualización del último reporte por surtidor
