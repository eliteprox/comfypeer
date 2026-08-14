import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, sessionFromRequest } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Return the authenticated session derived from the signed cookie. */
export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    externalUserId: session.externalUserId,
    email: session.email,
  });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
