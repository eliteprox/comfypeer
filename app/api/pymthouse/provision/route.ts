import { NextRequest, NextResponse } from "next/server";
import { externalUserIdFromEmail } from "@/lib/external-user-id";
import { ensureAppUserProvisioned, PmtHouseError } from "@/lib/pymthouse";
import { sessionSecretConfigured, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

function isBrowserMutation(request: NextRequest): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) return true;
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(appUrl).origin;
  } catch {
    return true;
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
  // Browser POSTs send Origin; reject opaque cross-site callers.
  return false;
}

export async function POST(request: NextRequest) {
  if (!sessionSecretConfigured()) {
    return NextResponse.json({ error: "Session not configured" }, { status: 503 });
  }
  if (!isBrowserMutation(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as {
      email?: string;
    };
    const email = body.email?.trim().toLowerCase() || "";
    if (!email.includes("@")) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const externalUserId = externalUserIdFromEmail(email);
    await ensureAppUserProvisioned(externalUserId, email);
    const response = NextResponse.json({ ok: true, externalUserId, email });
    const cookie = setSessionCookie(response, externalUserId, email);
    if (!cookie.ok) {
      return NextResponse.json({ error: cookie.error }, { status: 503 });
    }
    return response;
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "provision_failed" }, { status: 500 });
  }
}
