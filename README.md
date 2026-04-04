# SurtiMapa V9

Versión con:
- lectura de surtidores y reportes desde Supabase
- formulario de reporte
- mapa con Leaflet
- filtros por combustible, estado y zona
- geolocalización opcional
- cálculo de distancia
- orden por cercanía, recencia, disponibilidad y fila

## Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

## Despliegue
1. Subir el contenido a GitHub
2. Verificar variables de entorno en EasyPanel
3. Redeploy

## Nota
La ubicación del usuario se usa solo en frontend y no se guarda en Supabase.
