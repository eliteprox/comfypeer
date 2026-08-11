import { NextResponse } from "next/server";
import { ensureAppUserProvisioned, PmtHouseError } from "@/lib/pymthouse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      externalUserId?: string;
      email?: string;
    };
    if (!body.externalUserId?.trim()) {
      return NextResponse.json({ error: "externalUserId required" }, { status: 400 });
    }
    await ensureAppUserProvisioned(body.externalUserId.trim(), body.email);
    return NextResponse.json({ ok: true });
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
