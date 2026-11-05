import { NextRequest, NextResponse } from "next/server";
import { isBrowserMutation } from "@/lib/browser-mutation";
import { approveDeviceUserCode, PmtHouseError } from "@/lib/pymthouse";
import { sessionFromRequest, sessionSecretConfigured } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!sessionSecretConfigured()) {
    return NextResponse.json({ error: "Session not configured" }, { status: 503 });
  }
  if (!isBrowserMutation(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const session = sessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let userCode = "";
  try {
    const body = (await request.json()) as { userCode?: unknown };
    userCode = typeof body.userCode === "string" ? body.userCode : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await approveDeviceUserCode(session.externalUserId, userCode);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "device_approval_failed" }, { status: 500 });
  }
}
