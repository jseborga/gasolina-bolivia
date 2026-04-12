# AI Operator MCP Bridge

Puente MCP para conectar asistentes con el webhook operativo de `gasolina-bolivia`.

Soporta dos modos:

- `stdio` para Claude Code, clientes locales y shells MCP
- `http` para exponer un servidor MCP remoto por URL

## Requisitos

- Node.js 18+
- Un deploy accesible de la app con `/api/webhooks/ai-operator`
- Variables de entorno del bridge:
  - `AI_OPERATOR_WEBHOOK_URL`
  - `AI_OPERATOR_WEBHOOK_SECRET`

Opcionales:

- `AI_OPERATOR_SOURCE_LABEL`
- `AI_OPERATOR_PROVIDER`
- `AI_OPERATOR_TIMEOUT_MS`
- `AI_OPERATOR_DEFAULT_DRY_RUN`
- `AI_OPERATOR_MCP_TRANSPORT`
- `AI_OPERATOR_MCP_HOST`
- `AI_OPERATOR_MCP_PORT`
- `AI_OPERATOR_MCP_PATH`

## Instalar

```bash
cd mcp/ai-operator-bridge
npm install
```

## Ejecutar

```bash
cd mcp/ai-operator-bridge
npm start
```

Por defecto arranca en `stdio`.

## Modo HTTP remoto

Si quieres exponerlo como servidor MCP por URL:

```bash
cd mcp/ai-operator-bridge
AI_OPERATOR_MCP_TRANSPORT=http AI_OPERATOR_MCP_HOST=0.0.0.0 AI_OPERATOR_MCP_PORT=8787 npm start
```

Endpoint MCP remoto:

- `http://tu-host:8787/mcp`

## Configuracion de Claude Desktop / Claude Code

Ejemplo de `claude_desktop_config.json` o configuracion MCP equivalente:

```json
{
  "mcpServers": {
    "gasolinaBoliviaOps": {
      "command": "node",
      "args": [
        "C:/ruta/a/gasolina-bolivia/mcp/ai-operator-bridge/src/index.mjs"
      ],
      "env": {
        "AI_OPERATOR_WEBHOOK_URL": "https://tu-dominio/api/webhooks/ai-operator",
        "AI_OPERATOR_WEBHOOK_SECRET": "cambia-esto",
        "AI_OPERATOR_SOURCE_LABEL": "claude-code-ops",
        "AI_OPERATOR_PROVIDER": "anthropic"
      }
    }
  }
}
```

## Configuracion de Cursor

Ejemplo de `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "gasolinaBoliviaOps": {
      "command": "node",
      "args": [
        "C:/ruta/a/gasolina-bolivia/mcp/ai-operator-bridge/src/index.mjs"
      ],
      "env": {
        "AI_OPERATOR_WEBHOOK_URL": "https://tu-dominio/api/webhooks/ai-operator",
        "AI_OPERATOR_WEBHOOK_SECRET": "cambia-esto",
        "AI_OPERATOR_SOURCE_LABEL": "cursor-ops",
        "AI_OPERATOR_PROVIDER": "custom"
      }
    }
  }
}
```

## Notas para OpenAI

Si lo corres en `http`, este bridge ya queda en forma de servidor MCP remoto por URL.
Eso es lo que necesitas para conectarlo desde flujos remotos que consumen MCP por HTTP.

Ejemplo conceptual para Responses API:

```json
{
  "model": "gpt-5",
  "tools": [
    {
      "type": "mcp",
      "server_label": "gasolina_bolivia_ops",
      "server_url": "https://tu-host-publico/mcp",
      "require_approval": "never"
    }
  ],
  "input": "Busca las denuncias pendientes y resume las tres mas urgentes."
}
```

## Herramientas expuestas

- `tools.list`
- `stations.search`
- `stations.create`
- `stations.update`
- `fuel-reports.search`
- `parking-sites.search`
- `parking-sites.create`
- `parking-sites.update`
- `parking-sites.report-status`
- `parking-updates.search`
- `profiles.search`
- `profiles.create`
- `profiles.update`
- `traffic-incidents.search`
- `traffic-incidents.resolve`
- `place-reports.search`
- `place-reports.review`
- `ai-suggestions.search`
- `ai-suggestions.create`
- `ai-suggestions.review`

## Guardrails

- Las escrituras soportan `dryRun`.
- Las sugerencias IA se canalizan por `ai-suggestions.create`.
- No hay herramientas de borrado en este bridge.
- Las operaciones de parqueo registran historial via el webhook remoto.
