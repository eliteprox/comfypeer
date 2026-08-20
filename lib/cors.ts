import { NextRequest } from "next/server";

function appOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

/** Extra origins allowed to call credentialed studio APIs (e.g. comfystream UI). */
export function corsAllowlist(): string[] {
  const raw = process.env.COMFYPEER_CORS_ORIGINS?.trim() || "";
  const listed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const app = appOrigin();
  const out = new Set<string>();
  if (app) out.add(app);
  for (const origin of listed) {
    try {
      out.add(new URL(origin).origin);
    } catch {
      /* skip invalid */
    }
  }
  return [...out];
}

export function requestOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      return null;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}

export function isAllowedBrowserMutation(request: NextRequest): boolean {
  const allow = corsAllowlist();
  if (allow.length === 0) return false;
  const origin = requestOrigin(request);
  if (!origin) return false;
  return allow.includes(origin);
}

export function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = requestOrigin(request);
  const allow = corsAllowlist();
  if (!origin || !allow.includes(origin)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}
