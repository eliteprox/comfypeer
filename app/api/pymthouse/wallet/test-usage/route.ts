import { NextRequest, NextResponse } from "next/server";
import { ingestTestUsageEvent, PmtHouseError } from "@/lib/pymthouse";
import { parseTopUpAmountUsd } from "@/lib/top-up-amount";

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
    const parsed = parseTopUpAmountUsd(body.amountUsd);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const result = await ingestTestUsageEvent(externalUserId, parsed.amount, {
      collect: body.collect === true,
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
