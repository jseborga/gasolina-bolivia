export type AppEventInput = {
  eventType: string;
  metadata?: Record<string, unknown>;
  path?: string;
  targetId?: number | null;
  targetName?: string | null;
  targetType: "station" | "service" | "system" | "vendor_request";
};

const VISITOR_STORAGE_KEY = "surti_mapa_visitor_id";

export function ensureVisitorId() {
  if (typeof window === "undefined") return "";

  const current = window.localStorage.getItem(VISITOR_STORAGE_KEY);
  if (current) return current;

  const nextValue =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(VISITOR_STORAGE_KEY, nextValue);
  return nextValue;
}

export function trackAppEvent(input: AppEventInput) {
  if (typeof window === "undefined") return;

  const payload = {
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    path: input.path ?? window.location.pathname,
    targetId: input.targetId ?? null,
    targetName: input.targetName ?? null,
    targetType: input.targetType,
    visitorId: ensureVisitorId(),
  };

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
