# Webhook operativo IA para MCP

## Objetivo

Este webhook expone operaciones seguras para que un agente de IA, a traves de un puente MCP externo,
pueda:

- buscar contexto
- validar cambios con `dryRun`
- crear registros operativos
- actualizar registros existentes
- revisar sugerencias y denuncias

No expone borrado y no publica reportes sinteticos como si fueran comunitarios.
Para actividad sintetica o senales de IA se debe usar `ai-suggestions.create`.

## Endpoint

- `GET /api/webhooks/ai-operator`
- `POST /api/webhooks/ai-operator`

## Autenticacion

Headers requeridos en `POST`:

- `Content-Type: application/json`
- `x-agent-signature: <hmac_sha256_hex>`

Secretos admitidos:

- `AI_OPERATOR_WEBHOOK_SECRET`
- fallback: `AI_AGENT_WEBHOOK_SECRET`

La firma es `HMAC SHA256` del body crudo.

## Body

```json
{
  "tool": "stations.search",
  "sourceLabel": "claude-mcp-ops",
  "provider": "anthropic",
  "dryRun": false,
  "input": {
    "q": "Sopocachi",
    "limit": 5
  }
}
```

## Herramientas

Lectura:

- `tools.list`
- `stations.search`
- `fuel-reports.search`
- `parking-sites.search`
- `parking-updates.search`
- `profiles.search`
- `traffic-incidents.search`
- `place-reports.search`
- `ai-suggestions.search`

Escritura:

- `stations.create`
- `stations.update`
- `parking-sites.create`
- `parking-sites.update`
- `parking-sites.report-status`
- `profiles.create`
- `profiles.update`
- `traffic-incidents.resolve`
- `place-reports.review`
- `ai-suggestions.create`
- `ai-suggestions.review`

## Politica recomendada

1. Buscar primero el registro.
2. Ejecutar `dryRun: true` para validar el payload.
3. Solo despues ejecutar la escritura real.
4. Para incidentes o avisos generados por IA, crear una sugerencia:
   `ai-suggestions.create`.
5. No usar IA para fabricar denuncias comunitarias directas.

## Ejemplos

### Crear una estacion con validacion previa

```json
{
  "tool": "stations.create",
  "sourceLabel": "openai-admin-agent",
  "provider": "openai",
  "dryRun": true,
  "input": {
    "name": "Estacion Demo Sur",
    "city": "La Paz",
    "zone": "Obrajes",
    "address": "Av. Hernando Siles",
    "latitude": -16.5331,
    "longitude": -68.0893,
    "fuel_especial": true,
    "fuel_premium": false,
    "fuel_diesel": true,
    "fuel_gnv": false,
    "is_active": true,
    "is_verified": false
  }
}
```

### Actualizar disponibilidad de un parqueo

```json
{
  "tool": "parking-sites.report-status",
  "sourceLabel": "claude-traffic-assistant",
  "provider": "anthropic",
  "input": {
    "id": 14,
    "status": "full",
    "availableSpots": 0,
    "note": "Lleno por salida de colegio"
  }
}
```

### Revisar una denuncia

```json
{
  "tool": "place-reports.review",
  "sourceLabel": "review-bot",
  "provider": "custom",
  "input": {
    "id": 33,
    "action": "approve",
    "reviewNotes": "Coincide con fotos y duplicados previos",
    "pointsAwarded": 4
  }
}
```

### Crear una sugerencia IA revisable

```json
{
  "tool": "ai-suggestions.create",
  "sourceLabel": "gpt-5.4-ops",
  "provider": "openai",
  "input": {
    "kind": "traffic_incident",
    "syntheticMode": "external_signal",
    "visibility": "admin_only",
    "title": "Posible congestion por control vial en Miraflores",
    "summary": "Senal externa detectada. Requiere revision humana antes de publicar.",
    "city": "La Paz",
    "zone": "Miraflores",
    "latitude": -16.4994,
    "longitude": -68.1224,
    "radiusMeters": 240,
    "confidence": 0.74,
    "payload": {
      "incident_type": "control_vial",
      "duration_minutes": 45
    },
    "criteria": {
      "source": "camera-cluster",
      "window": "15m"
    }
  }
}
```

## Ejemplo de firma en Node

```ts
import crypto from "node:crypto";

const body = JSON.stringify({
  tool: "tools.list",
  sourceLabel: "claude-mcp-ops",
  provider: "anthropic",
  input: {}
});

const signature = crypto
  .createHmac("sha256", process.env.AI_OPERATOR_WEBHOOK_SECRET!)
  .update(body)
  .digest("hex");

const response = await fetch("https://tu-dominio/api/webhooks/ai-operator", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-agent-signature": signature
  },
  body
});
```

## Diseno MCP recomendado

No hace falta convertir toda la app en servidor MCP.
Lo limpio es un puente MCP pequeno que:

1. expone herramientas con los mismos nombres del webhook
2. firma cada request
3. reenvia el body a `/api/webhooks/ai-operator`

La manera mas simple es:

- al iniciar, leer `GET /api/webhooks/ai-operator`
- registrar esas herramientas en el MCP
- mapear cada llamada MCP a:
  - `tool`: nombre del tool MCP
  - `input`: argumentos del tool
  - `sourceLabel`: nombre de tu agente
  - `provider`: `openai`, `anthropic` o `custom`
  - `dryRun`: opcional

## Guardrails

- no hay herramientas de borrado
- no se crean denuncias sinteticas como si fueran reportes de usuarios
- para senales IA se usa `ai-suggestions.create`
- `parking-sites.report-status` guarda historial en `parking_updates`
- `profiles.search` oculta `manager_access_token` salvo que pidas `includeAccessToken: true`
