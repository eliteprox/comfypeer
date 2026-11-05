import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { isBrowserMutation } from "@/lib/browser-mutation";
import { isValidEmail } from "@/lib/email";
import { externalUserIdFromEmail } from "@/lib/external-user-id";
import { ensureAppUserProvisioned, PmtHouseError } from "@/lib/pymthouse";
import { sessionSecretConfigured, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sessionSecretConfigured()) {
    return NextResponse.json({ error: "Session not configured" }, { status: 503 });
  }
  if (!isBrowserMutation(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  try {
    const session = await auth0.getSession();
    const email = session?.user?.email?.trim().toLowerCase() || "";
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
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
