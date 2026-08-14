import { NextResponse } from "next/server";
import { externalUserIdFromEmail } from "@/lib/external-user-id";
import { ensureAppUserProvisioned, PmtHouseError } from "@/lib/pymthouse";
import { sessionSecretConfigured, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sessionSecretConfigured()) {
    return NextResponse.json({ error: "Session not configured" }, { status: 503 });
  }
  try {
    const body = (await request.json()) as {
      email?: string;
    };
    const email = body.email?.trim() || "";
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const externalUserId = externalUserIdFromEmail(email);
    await ensureAppUserProvisioned(externalUserId, email);
    const response = NextResponse.json({ ok: true, externalUserId });
    const cookie = setSessionCookie(response, externalUserId);
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
