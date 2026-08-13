import { NextResponse } from "next/server";
import { getPrimaryOrchestrator } from "@/lib/discovery";
import { getBillingSnapshot, PmtHouseError } from "@/lib/pymthouse";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const externalUserId = url.searchParams.get("externalUserId")?.trim();
  if (!externalUserId) {
    return NextResponse.json({ error: "externalUserId required" }, { status: 400 });
  }

  try {
    const [{ balance, billingState }, orch] = await Promise.all([
      getBillingSnapshot(externalUserId),
      getPrimaryOrchestrator(),
    ]);
    return NextResponse.json({
      balanceUsdMicros: balance.balanceUsdMicros,
      consumedUsdMicros: balance.consumedUsdMicros,
      lifetimeGrantedUsdMicros: balance.lifetimeGrantedUsdMicros,
      billing: {
        state: billingState.status,
        headline: billingState.explain.headline,
        detail: billingState.explain.detail,
      },
      billingState,
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
