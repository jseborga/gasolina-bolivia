import type { NextRequest } from "next/server";

export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://appn8n-gasolina-bolivia.gz5fzd.easypanel.host"
  );
}

export function getRequestBaseUrl(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  const host = request.headers.get("host");
  if (host) {
    const protocol =
      host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return getAppBaseUrl();
}
