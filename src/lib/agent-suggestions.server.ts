import { createHmac, timingSafeEqual } from "node:crypto";

export function getAgentWebhookSecret() {
  const secret = process.env.AI_AGENT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Falta AI_AGENT_WEBHOOK_SECRET.");
  }

  return secret;
}

export function computeAgentWebhookSignature(rawBody: string, secret: string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function isValidAgentWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;

  const normalizedSignature = signature.trim().toLowerCase();
  const expectedSignature = computeAgentWebhookSignature(rawBody, getAgentWebhookSecret());
  const actualBuffer = Buffer.from(normalizedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (actualBuffer.length === 0 || actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
