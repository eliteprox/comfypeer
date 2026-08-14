import { NextRequest, NextResponse } from "next/server";
import { externalUserIdFromEmail } from "@/lib/external-user-id";
import {
  clearSessionCookie,
  sessionSecretConfigured,
  setSessionCookie,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!sessionSecretConfigured()) {
    return NextResponse.json({ error: "Session not configured" }, { status: 503 });
  }
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = body.email?.trim() || "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  const externalUserId = externalUserIdFromEmail(email);
  const response = NextResponse.json({ ok: true });
  const cookie = setSessionCookie(response, externalUserId);
  if (!cookie.ok) {
    return NextResponse.json({ error: cookie.error }, { status: 503 });
  }
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
