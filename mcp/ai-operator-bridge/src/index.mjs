import { createHmac } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable ${name}.`);
  }

  return value;
}

const WEBHOOK_URL = requireEnv("AI_OPERATOR_WEBHOOK_URL");
const WEBHOOK_SECRET = requireEnv("AI_OPERATOR_WEBHOOK_SECRET");
const SOURCE_LABEL = process.env.AI_OPERATOR_SOURCE_LABEL?.trim() || "mcp-local-bridge";
const PROVIDER = process.env.AI_OPERATOR_PROVIDER?.trim() || "custom";
const DEFAULT_TIMEOUT_MS = Number(process.env.AI_OPERATOR_TIMEOUT_MS || 15000);
const DEFAULT_DRY_RUN = process.env.AI_OPERATOR_DEFAULT_DRY_RUN === "true";
const TRANSPORT_MODE = process.env.AI_OPERATOR_MCP_TRANSPORT?.trim().toLowerCase() || "stdio";
const HTTP_HOST = process.env.AI_OPERATOR_MCP_HOST?.trim() || "127.0.0.1";
const HTTP_PORT = Number(process.env.AI_OPERATOR_MCP_PORT || 8787);
const HTTP_PATH = process.env.AI_OPERATOR_MCP_PATH?.trim() || "/mcp";

const jsonRecordSchema = z.record(z.string(), z.unknown());
const evidenceItemSchema = z.record(z.string(), z.unknown());
const reviewActionSchema = z.enum(["approve", "reject"]);
const roleSchema = z.enum([
  "parking_manager",
  "trusted_reporter",
  "reviewer",
  "admin_assistant",
]);
const parkingStatusSchema = z.enum(["open", "closed", "full", "unknown"]);
const agentKindSchema = z.enum([
  "fuel_report",
  "traffic_incident",
  "parking_update",
  "place_report",
  "advisory",
]);
const suggestionVisibilitySchema = z.enum(["admin_only", "public_demo"]);
const suggestionModeSchema = z.enum(["ai_simulated", "ai_draft", "external_signal"]);

function signBody(rawBody) {
  return createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
}

async function callWebhook(tool, input, dryRun = DEFAULT_DRY_RUN) {
  const body = JSON.stringify({
    dryRun,
    input,
    provider: PROVIDER,
    sourceLabel: SOURCE_LABEL,
    tool,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agent-signature": signBody(body),
      },
      body,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      throw new Error(
        payload?.error || `El webhook respondio con estado ${response.status}.`
      );
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function successResult(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function errorResult(error) {
  return {
    content: [
      {
        type: "text",
        text: error instanceof Error ? error.message : "Error inesperado",
      },
    ],
    isError: true,
  };
}

function splitDryRun(args) {
  const { dryRun, ...input } = args ?? {};
  return {
    dryRun: typeof dryRun === "boolean" ? dryRun : DEFAULT_DRY_RUN,
    input,
  };
}

function registerForwardTool(server, definition) {
  server.registerTool(
    definition.name,
    {
      description: definition.description,
      inputSchema: definition.inputSchema,
      title: definition.title,
    },
    async (args) => {
      try {
        const { dryRun, input } = splitDryRun(args);
        const payload = await callWebhook(definition.webhookTool, input, dryRun);
        return successResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

function buildBridgeServer() {
  const server = new McpServer({
    name: "gasolina-bolivia-ai-operator",
    version: "0.2.0",
  });

  registerForwardTool(server, {
    name: "tools.list",
    title: "Listar herramientas",
    description: "Lista las herramientas disponibles en el webhook operativo.",
    webhookTool: "tools.list",
    inputSchema: {},
  });

  registerForwardTool(server, {
    name: "stations.search",
    title: "Buscar estaciones",
    description: "Busca estaciones por nombre, ciudad, zona y estado.",
    webhookTool: "stations.search",
    inputSchema: {
      q: z.string().optional(),
      city: z.string().optional(),
      zone: z.string().optional(),
      isActive: z.boolean().optional(),
      isVerified: z.boolean().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  });

  registerForwardTool(server, {
    name: "stations.create",
    title: "Crear estacion",
    description: "Crea una estacion nueva. Usa dryRun para validar antes de escribir.",
    webhookTool: "stations.create",
    inputSchema: {
      dryRun: z.boolean().optional(),
      name: z.string(),
      city: z.string().optional(),
      zone: z.string().optional(),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      fuel_especial: z.boolean().optional(),
      fuel_premium: z.boolean().optional(),
      fuel_diesel: z.boolean().optional(),
      fuel_gnv: z.boolean().optional(),
      is_active: z.boolean().optional(),
      is_verified: z.boolean().optional(),
      source_url: z.string().optional(),
      notes: z.string().optional(),
      license_code: z.string().optional(),
      reputation_score: z.number().optional(),
      reputation_votes: z.number().optional(),
    },
  });

  registerForwardTool(server, {
    name: "stations.update",
    title: "Actualizar estacion",
    description: "Actualiza una estacion con cambios parciales.",
    webhookTool: "stations.update",
    inputSchema: {
      dryRun: z.boolean().optional(),
      id: z.number().int().positive(),
      changes: jsonRecordSchema,
    },
  });

  registerForwardTool(server, {
    name: "fuel-reports.search",
    title: "Buscar reportes de combustible",
    description: "Consulta reportes recientes de combustible por estacion o tipo.",
    webhookTool: "fuel-reports.search",
    inputSchema: {
      stationId: z.number().int().positive().optional(),
      fuelType: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  });

  registerForwardTool(server, {
    name: "parking-sites.search",
    title: "Buscar parqueos",
    description: "Busca parqueos por codigo, nombre, zona, estado o responsable.",
    webhookTool: "parking-sites.search",
    inputSchema: {
      q: z.string().optional(),
      status: parkingStatusSchema.optional(),
      managerProfileId: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
      isPublished: z.boolean().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  });

  registerForwardTool(server, {
    name: "parking-sites.create",
    title: "Crear parqueo",
    description: "Crea un parqueo administrable.",
    webhookTool: "parking-sites.create",
    inputSchema: {
      dryRun: z.boolean().optional(),
      code: z.string(),
      name: z.string(),
      city: z.string().optional(),
      zone: z.string().optional(),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      total_spots: z.number().optional(),
      available_spots: z.number().optional(),
      pricing_text: z.string().optional(),
      opens_at: z.string().optional(),
      closes_at: z.string().optional(),
      is_24h: z.boolean().optional(),
      accepts_reservations: z.boolean().optional(),
      height_limit_text: z.string().optional(),
      payment_methods: z.string().optional(),
      access_notes: z.string().optional(),
      phone: z.string().optional(),
      whatsapp_number: z.string().optional(),
      source_url: z.string().optional(),
      manager_profile_id: z.number().int().positive().optional(),
      status: parkingStatusSchema.optional(),
      is_active: z.boolean().optional(),
      is_published: z.boolean().optional(),
      is_verified: z.boolean().optional(),
    },
  });

  registerForwardTool(server, {
    name: "parking-sites.update",
    title: "Actualizar parqueo",
    description: "Actualiza un parqueo existente con cambios parciales.",
    webhookTool: "parking-sites.update",
    inputSchema: {
      dryRun: z.boolean().optional(),
      id: z.number().int().positive(),
      changes: jsonRecordSchema,
    },
  });

  registerForwardTool(server, {
    name: "parking-sites.report-status",
    title: "Reportar estado de parqueo",
    description: "Actualiza disponibilidad y crea historial en parking_updates.",
    webhookTool: "parking-sites.report-status",
    inputSchema: {
      dryRun: z.boolean().optional(),
      id: z.number().int().positive(),
      status: parkingStatusSchema,
      availableSpots: z.number().int().min(0).nullable().optional(),
      pricingText: z.string().nullable().optional(),
      note: z.string().nullable().optional(),
    },
  });

  registerForwardTool(server, {
    name: "parking-updates.search",
    title: "Buscar historial de parqueos",
    description: "Lee actualizaciones recientes de parqueos.",
    webhookTool: "parking-updates.search",
    inputSchema: {
      parkingSiteId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  });

  registerForwardTool(server, {
    name: "profiles.search",
    title: "Buscar perfiles",
    description: "Busca perfiles operativos por nombre, rol o estado.",
    webhookTool: "profiles.search",
    inputSchema: {
      q: z.string().optional(),
      role: roleSchema.optional(),
      isActive: z.boolean().optional(),
      includeAccessToken: z.boolean().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  });

  registerForwardTool(server, {
    name: "profiles.create",
    title: "Crear perfil",
    description: "Crea un perfil operativo para gestores o revisores.",
    webhookTool: "profiles.create",
    inputSchema: {
      dryRun: z.boolean().optional(),
      includeAccessToken: z.boolean().optional(),
      full_name: z.string(),
      role: roleSchema,
      email: z.string().optional(),
      phone: z.string().optional(),
      whatsapp_number: z.string().optional(),
      telegram_chat_id: z.string().optional(),
      reliability_score: z.number().optional(),
      credit_balance: z.number().optional(),
      is_active: z.boolean().optional(),
      notes: z.string().optional(),
      regenerate_access_token: z.boolean().optional(),
    },
  });

  registerForwardTool(server, {
    name: "profiles.update",
    title: "Actualizar perfil",
    description: "Actualiza un perfil operativo existente.",
    webhookTool: "profiles.update",
    inputSchema: {
      dryRun: z.boolean().optional(),
      includeAccessToken: z.boolean().optional(),
      id: z.number().int().positive(),
      changes: jsonRecordSchema,
    },
  });

  registerForwardTool(server, {
    name: "traffic-incidents.search",
    title: "Buscar incidentes",
    description: "Consulta incidentes viales activos o resueltos.",
    webhookTool: "traffic-incidents.search",
    inputSchema: {
      q: z.string().optional(),
      status: z.enum(["active", "resolved", "expired"]).optional(),
      incidentType: z
        .enum(["control_vial", "corte_via", "marcha", "accidente", "derrumbe", "otro"])
        .optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  });

  registerForwardTool(server, {
    name: "traffic-incidents.resolve",
    title: "Resolver incidente",
    description: "Marca un incidente vial como resuelto.",
    webhookTool: "traffic-incidents.resolve",
    inputSchema: {
      dryRun: z.boolean().optional(),
      id: z.number().int().positive(),
    },
  });

  registerForwardTool(server, {
    name: "place-reports.search",
    title: "Buscar denuncias",
    description: "Consulta denuncias pendientes, aprobadas o rechazadas.",
    webhookTool: "place-reports.search",
    inputSchema: {
      q: z.string().optional(),
      status: z.enum(["pending", "approved", "rejected"]).optional(),
      targetType: z.enum(["station", "service"]).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  });

  registerForwardTool(server, {
    name: "place-reports.review",
    title: "Revisar denuncia",
    description: "Aprueba o rechaza una denuncia y puede asignar puntos.",
    webhookTool: "place-reports.review",
    inputSchema: {
      dryRun: z.boolean().optional(),
      id: z.number().int().positive(),
      action: reviewActionSchema.optional(),
      reviewNotes: z.string().optional(),
      pointsAwarded: z.number().int().min(0).optional(),
    },
  });

  registerForwardTool(server, {
    name: "ai-suggestions.search",
    title: "Buscar sugerencias IA",
    description: "Consulta sugerencias generadas por IA antes o despues de revision.",
    webhookTool: "ai-suggestions.search",
    inputSchema: {
      q: z.string().optional(),
      kind: agentKindSchema.optional(),
      status: z.enum(["pending_review", "approved", "rejected"]).optional(),
      visibility: suggestionVisibilitySchema.optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
  });

  registerForwardTool(server, {
    name: "ai-suggestions.create",
    title: "Crear sugerencia IA",
    description: "Crea una sugerencia IA revisable sin mezclarla con reportes comunitarios.",
    webhookTool: "ai-suggestions.create",
    inputSchema: {
      dryRun: z.boolean().optional(),
      title: z.string(),
      summary: z.string().optional(),
      kind: agentKindSchema.optional(),
      syntheticMode: suggestionModeSchema.optional(),
      visibility: suggestionVisibilitySchema.optional(),
      status: z.enum(["pending_review", "approved", "rejected"]).optional(),
      city: z.string().optional(),
      zone: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      radiusMeters: z.number().int().min(50).max(5000).optional(),
      confidence: z.number().min(0).max(1).optional(),
      criteria: jsonRecordSchema.optional(),
      payload: jsonRecordSchema.optional(),
      evidence: z.array(evidenceItemSchema).optional(),
      sourceLabel: z.string().optional(),
      provider: z.enum(["openai", "anthropic", "custom"]).optional(),
    },
  });

  registerForwardTool(server, {
    name: "ai-suggestions.review",
    title: "Revisar sugerencia IA",
    description: "Aprueba o rechaza una sugerencia IA y define su visibilidad.",
    webhookTool: "ai-suggestions.review",
    inputSchema: {
      dryRun: z.boolean().optional(),
      id: z.number().int().positive(),
      action: reviewActionSchema.optional(),
      reviewNotes: z.string().optional(),
      visibility: suggestionVisibilitySchema.optional(),
    },
  });

  return server;
}

async function startStdio() {
  const server = buildBridgeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[ai-operator-mcp] stdio listo -> ${WEBHOOK_URL} (${SOURCE_LABEL}/${PROVIDER})`
  );
}

async function closeQuietly(target) {
  if (!target || typeof target.close !== "function") {
    return;
  }

  try {
    await target.close();
  } catch {
    // ignore close errors on shutdown
  }
}

async function startHttp() {
  const app = createMcpExpressApp({ host: HTTP_HOST });

  app.get("/", (_req, res) => {
    res.json({
      mode: "http",
      name: "gasolina-bolivia-ai-operator",
      ok: true,
      path: HTTP_PATH,
      sourceLabel: SOURCE_LABEL,
      webhookUrl: WEBHOOK_URL,
    });
  });

  app.post(HTTP_PATH, async (req, res) => {
    const server = buildBridgeServer();
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[ai-operator-mcp] error HTTP MCP:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal server error",
          },
          id: null,
        });
      }
    } finally {
      res.on("close", async () => {
        await closeQuietly(transport);
        await closeQuietly(server);
      });
    }
  });

  app.get(HTTP_PATH, (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  app.delete(HTTP_PATH, (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  await new Promise((resolve) => {
    app.listen(HTTP_PORT, HTTP_HOST, () => {
      console.error(
        `[ai-operator-mcp] http listo -> http://${HTTP_HOST}:${HTTP_PORT}${HTTP_PATH}`
      );
      resolve();
    });
  });
}

if (TRANSPORT_MODE === "http") {
  await startHttp();
} else {
  await startStdio();
}
