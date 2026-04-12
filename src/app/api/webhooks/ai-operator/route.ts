import { NextRequest, NextResponse } from "next/server";
import {
  AI_OPERATOR_TOOL_DEFINITIONS,
  executeAiOperatorTool,
  isValidAiOperatorWebhookSignature,
  parseAiOperatorCall,
} from "@/lib/ai-operator-tools";

export async function GET() {
  return NextResponse.json({
    auth: {
      algorithm: "hmac-sha256",
      header: "x-agent-signature",
      secret_env: "AI_OPERATOR_WEBHOOK_SECRET",
      secret_fallback_env: "AI_AGENT_WEBHOOK_SECRET",
    },
    endpoint: "/api/webhooks/ai-operator",
    ok: true,
    tools: AI_OPERATOR_TOOL_DEFINITIONS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-agent-signature");

    if (!isValidAiOperatorWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Webhook no autorizado." }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const call = parseAiOperatorCall(body);
    const result = await executeAiOperatorTool(call);

    return NextResponse.json({
      dryRun: call.dryRun,
      ok: true,
      result,
      sourceLabel: call.sourceLabel,
      tool: call.tool,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el webhook operativo IA.",
      },
      { status: 500 }
    );
  }
}
