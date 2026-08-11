import { NextResponse } from "next/server";
import { getBillingSnapshot, PmtHouseError } from "@/lib/pymthouse";
import { getPrimaryOrchestrator } from "@/lib/orchestrators";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const externalUserId = url.searchParams.get("externalUserId")?.trim();
  if (!externalUserId) {
    return NextResponse.json({ error: "externalUserId required" }, { status: 400 });
  }

  try {
    const { balance, billingState } = await getBillingSnapshot(externalUserId);
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
      orchestrator: getPrimaryOrchestrator().label,
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
