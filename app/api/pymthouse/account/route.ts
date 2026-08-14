import { NextResponse } from "next/server";
import { getPrimaryOrchestrator } from "@/lib/discovery";
import { loadUserCreditBalance, PmtHouseError } from "@/lib/pymthouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const externalUserId = url.searchParams.get("externalUserId")?.trim();
  if (!externalUserId) {
    return NextResponse.json({ error: "externalUserId required" }, { status: 400 });
  }

  try {
    const [credits, orch] = await Promise.all([
      loadUserCreditBalance(externalUserId),
      getPrimaryOrchestrator(),
    ]);
    const live = Number(credits.live);
    return NextResponse.json({
      spendableUsd: credits.live,
      canSpend: Number.isFinite(live) && live > 0,
      orchestrator: orch?.label ?? null,
    });
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "account_fetch_failed" }, { status: 500 });
  }
}
