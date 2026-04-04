
# SurtiMapa - base corregida

## Variables de entorno
Configura en EasyPanel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Reset de Supabase
En Supabase > SQL Editor ejecuta el archivo:

- `supabase/001_reset_all.sql`

Eso crea:
- `stations`
- `reports`
- políticas RLS mínimas para leer e insertar reportes en el MVP

## Despliegue
1. Sube este proyecto a GitHub.
2. EasyPanel debe apuntar a este repo.
3. Haz redeploy.

## Nota
Esta versión corrige el error de build de `StationCard`.
