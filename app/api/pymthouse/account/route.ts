import { NextResponse } from "next/server";
import {
  createPmtHouseClient,
  ensureAppUserProvisioned,
  PmtHouseError,
} from "@/lib/pymthouse";
import { getPrimaryOrchestrator } from "@/lib/orchestrators";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const externalUserId = url.searchParams.get("externalUserId")?.trim();
  if (!externalUserId) {
    return NextResponse.json({ error: "externalUserId required" }, { status: 400 });
  }

  try {
    await ensureAppUserProvisioned(externalUserId);
    const client = createPmtHouseClient();
    const [balance, billing] = await Promise.all([
      client.getUsageBalance(externalUserId).catch(() => null),
      client.getBillingState(externalUserId).catch(() => null),
    ]);

    const status = billing?.status;
    const mapped =
      status === "blocked" || status === "at_risk" || status === "overage" || status === "active"
        ? status
        : status
          ? "active"
          : null;

    return NextResponse.json({
      balanceUsdMicros:
        balance && typeof balance === "object" && "balanceUsdMicros" in balance
          ? String((balance as { balanceUsdMicros: string }).balanceUsdMicros)
          : "0",
      billing:
        billing?.explain && mapped
          ? {
              state: mapped,
              headline: billing.explain.headline,
              detail: billing.explain.detail,
            }
          : null,
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
