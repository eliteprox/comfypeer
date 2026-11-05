import type { NextRequest } from "next/server";

/** Browser POSTs send Origin. Reject missing or cross-site callers. */
export function isBrowserMutation(request: NextRequest): boolean {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return false;
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(configured).origin;
  } catch {
    return false;
  }
  const origin = request.headers.get("origin");
  if (origin) return origin === expectedOrigin;
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }
  return false;
}
