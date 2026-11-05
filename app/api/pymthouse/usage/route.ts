import { NextRequest, NextResponse } from "next/server";
import { loadUserUsage, PmtHouseError } from "@/lib/pymthouse";
import { sessionFromRequest } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const usage = await loadUserUsage(session.externalUserId);
    return NextResponse.json(usage);
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "usage_load_failed" }, { status: 500 });
  }
}
