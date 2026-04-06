## Importacion Masiva Desde OpenStreetMap

### 1. Sacar datos desde Overpass Turbo

Usa este query:

```overpass
[out:json][timeout:120];
{{geocodeArea:Santa Cruz, Bolivia}}->.searchArea;

(
  node["amenity"="fuel"](area.searchArea);
  way["amenity"="fuel"](area.searchArea);
  relation["amenity"="fuel"](area.searchArea);
);

out center tags;
```

En Overpass Turbo:
- Ejecuta el query
- Exporta el resultado como `JSON`
- Guarda el archivo, por ejemplo: `data/santa-cruz-overpass.json`

### 2. Convertir a formato del importador de la app

Desde la carpeta `gasolina-bolivia`:

```powershell
npm run convert:overpass -- --input data/santa-cruz-overpass.json --department "Santa Cruz"
```

Eso genera:
- `data/santa-cruz-overpass.station-import.txt`
- `data/santa-cruz-overpass.normalized.json`

### 3. Revisar el JSON normalizado

Abre el archivo `.normalized.json` y revisa:
- `name`
- `address`
- `city`
- `latitude`
- `longitude`
- `products`
- `google_query`

`google_query` sirve para buscar manualmente en Google Maps los casos dudosos.

### 4. Subir a la app

En el admin:
- Ve a `/admin/stations/import`
- Abre `data/santa-cruz-overpass.station-import.txt`
- Copia todo el contenido
- Pega el lote completo
- Ejecuta vista previa

### 5. Aplicar con criterio

En la vista previa:
- `update`: normalmente puedes aplicarlo
- `create`: crea estación nueva
- `review`: revisar antes de aplicar

La app compara:
- nombre
- direccion
- distancia por coordenadas

### 6. Auditar despues de importar

Luego entra a:
- `/admin/stations/import/review`

Ahí puedes:
- ver diferencias entre direccion y punto
- usar la sugerencia de correccion
- abrir la estacion para ajustarla visualmente

### 7. Verificar con Google Maps

No uses scraping masivo de Google Maps.

Usa Google solo para:
- estaciones dudosas
- nombres ambiguos
- puntos que caen lejos de la direccion

Toma el valor `google_query` del JSON normalizado, buscalo en Google Maps y pega el enlace o texto en el formulario/auditoria para corregir.
