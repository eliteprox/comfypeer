import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { externalUserId?: string };
  try {
    body = (await request.json()) as { externalUserId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const externalUserId = body.externalUserId?.trim() || "";
  if (!externalUserId) {
    return NextResponse.json({ error: "externalUserId is required" }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, externalUserId);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
