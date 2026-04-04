# SurtiMapa

Proyecto base en Next.js + Supabase para reportes de surtidores.

## Variables de entorno

Configura estas variables en EasyPanel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Supabase

Ejecuta el archivo:

- `supabase/001_reset_all.sql`

## Deploy en EasyPanel

- Conecta el repositorio GitHub
- Usa el `Dockerfile`
- Puerto interno: `3000`
- Agrega las variables de entorno
- Redeploy
