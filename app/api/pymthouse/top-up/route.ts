import { NextResponse } from "next/server";
import { PmtHouseError, startWalletTopUp } from "@/lib/pymthouse";
import { parseTopUpAmountUsd } from "@/lib/top-up-amount";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      externalUserId?: string;
      amountUsd?: number | string;
    };
    if (!body.externalUserId?.trim()) {
      return NextResponse.json({ error: "externalUserId required" }, { status: 400 });
    }
    const parsed = parseTopUpAmountUsd(body.amountUsd ?? 10);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const result = await startWalletTopUp(body.externalUserId.trim(), parsed.amount);
    return NextResponse.json({
      url: result.checkoutUrl || result.url || null,
    });
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "top_up_failed" }, { status: 500 });
  }
}
