# Webhook de sugerencias IA

## Principio

Este canal no publica reportes falsos como si fueran comunitarios.

El flujo correcto es:

1. un agente externo propone una `sugerencia`
2. el admin la revisa
3. si la aprueba, puede dejarla como `solo admin` o publicarla como `demo publica`

En la app publica se muestra con texto explicito de `Actividad demo asistida por IA`.

## Endpoint

`POST /api/webhooks/ai-suggestions`

Headers requeridos:

- `Content-Type: application/json`
- `x-agent-signature: <hmac_sha256_hex>`

La firma es `HMAC SHA256` del body crudo usando `AI_AGENT_WEBHOOK_SECRET`.

## Variables de entorno

- `AI_AGENT_WEBHOOK_SECRET`

## Payload

```json
{
  "provider": "openai",
  "sourceLabel": "gpt-5.4-demo-agent",
  "kind": "traffic_incident",
  "syntheticMode": "ai_simulated",
  "visibility": "admin_only",
  "status": "pending_review",
  "title": "Simulacion de congestion por control vial en Sopocachi",
  "summary": "Borrador demo para onboarding visual del mapa.",
  "city": "La Paz",
  "zone": "Sopocachi",
  "latitude": -16.5145,
  "longitude": -68.1295,
  "radiusMeters": 250,
  "confidence": 0.72,
  "criteria": {
    "scenario": "hora pico",
    "seed": "demo-2026-04"
  },
  "payload": {
    "incident_type": "control_vial",
    "duration_minutes": 45
  },
  "evidence": [
    {
      "label": "prompt-run",
      "url": "https://example.invalid/run/123"
    }
  ]
}
```

## Valores validos

### provider

- `openai`
- `anthropic`
- `custom`

### kind

- `fuel_report`
- `traffic_incident`
- `parking_update`
- `place_report`
- `advisory`

### syntheticMode

- `ai_simulated`
- `ai_draft`
- `external_signal`

### visibility

- `admin_only`
- `public_demo`

### status

- `pending_review`
- `approved`
- `rejected`

## Ejemplo Node para OpenAI o GPT-5.4

```ts
import crypto from "node:crypto";

const body = JSON.stringify({
  provider: "openai",
  sourceLabel: "gpt-5.4-demo-agent",
  kind: "fuel_report",
  syntheticMode: "ai_simulated",
  visibility: "admin_only",
  title: "Demo IA: posible fila corta en Miraflores",
  summary: "Ejemplo de actividad simulada con etiqueta demo.",
  city: "La Paz",
  zone: "Miraflores",
  confidence: 0.66,
  payload: {
    station_id: 1,
    fuel_type: "especial",
    availability_status: "si_hay",
    queue_status: "corta"
  }
});

const signature = crypto
  .createHmac("sha256", process.env.AI_AGENT_WEBHOOK_SECRET!)
  .update(body)
  .digest("hex");

await fetch("https://tu-dominio/api/webhooks/ai-suggestions", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-agent-signature": signature
  },
  body
});
```

## Wrapper MCP sugerido

Si quieres usar Claude Code u otro cliente MCP, no necesitas exponer toda la app como MCP.
Lo limpio es crear un servidor MCP pequeño con una sola herramienta:

- `submit_ai_suggestion`

Ese tool recibe el payload, firma el body y reenvia al webhook.

### Contrato recomendado del tool

```json
{
  "name": "submit_ai_suggestion",
  "inputSchema": {
    "type": "object",
    "properties": {
      "provider": { "type": "string" },
      "sourceLabel": { "type": "string" },
      "kind": { "type": "string" },
      "title": { "type": "string" },
      "summary": { "type": "string" },
      "city": { "type": "string" },
      "zone": { "type": "string" },
      "latitude": { "type": "number" },
      "longitude": { "type": "number" },
      "radiusMeters": { "type": "number" },
      "confidence": { "type": "number" },
      "criteria": { "type": "object" },
      "payload": { "type": "object" },
      "evidence": { "type": "array" }
    },
    "required": ["sourceLabel", "kind", "title"]
  }
}
```

## Uso recomendado

- usar esto para onboarding, demos y pruebas narrativas
- no mezclar con reportes reales de usuarios
- no acreditar puntos por sugerencias IA
- publicar solo tras aprobacion manual
