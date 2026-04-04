# SurtiMapa - Base inicial para EasyPanel

Repositorio base para subir a GitHub y desplegar en EasyPanel.

## Qué incluye
- Next.js con App Router
- Tailwind CSS
- Dockerfile listo para EasyPanel
- Manifest básico para PWA
- Endpoint `/api/health`
- Pantalla inicial del MVP

## Cómo usarlo con GitHub + EasyPanel
1. Sube esta carpeta a un repositorio nuevo en GitHub.
2. En EasyPanel crea una nueva app desde GitHub.
3. Selecciona este repositorio.
4. EasyPanel usará el `Dockerfile`.
5. Define el puerto interno `3000`.
6. Agrega tu dominio y activa SSL.
7. Despliega.

## Variables de entorno
Copia `.env.example` a `.env.local` si vas a probar localmente.
En EasyPanel agrega estas variables cuando conectes Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Desarrollo local opcional
```bash
npm install
npm run dev
```

## Próximos pasos
- integrar mapa real con Leaflet o Mapbox
- conectar Supabase
- crear tablas de surtidores y reportes
- activar autenticación y reputación de usuarios
