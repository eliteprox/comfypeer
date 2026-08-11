import { NextResponse } from "next/server";
import { PmtHouseError, startWalletTopUp } from "@/lib/pymthouse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      externalUserId?: string;
      amountUsd?: number;
    };
    if (!body.externalUserId?.trim()) {
      return NextResponse.json({ error: "externalUserId required" }, { status: 400 });
    }
    const amount = Number(body.amountUsd ?? 10);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: "amountUsd must be 1–10000" }, { status: 400 });
    }
    const result = await startWalletTopUp(body.externalUserId.trim(), amount);
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
