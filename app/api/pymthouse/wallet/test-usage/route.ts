import { NextRequest, NextResponse } from "next/server";
import { ingestTestUsageEvent, PmtHouseError } from "@/lib/pymthouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      externalUserId?: string;
      amountUsd?: number | string;
      collect?: boolean;
    };
    const externalUserId = body.externalUserId?.trim() || "";
    if (!externalUserId) {
      return NextResponse.json(
        { error: "externalUserId is required" },
        { status: 400 },
      );
    }
    const amountUsd =
      typeof body.amountUsd === "number"
        ? body.amountUsd
        : Number(body.amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd < 1) {
      return NextResponse.json(
        { error: "amountUsd must be at least 1" },
        { status: 400 },
      );
    }
    const result = await ingestTestUsageEvent(externalUserId, amountUsd, {
      collect: body.collect !== false,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to ingest test usage" },
      { status: 500 },
    );
  }
}
