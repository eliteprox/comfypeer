import { NextRequest, NextResponse } from "next/server";
import {
  listUserPaymentMethods,
  loadUserCreditBalance,
  loadWalletAutoTopUp,
  PmtHouseError,
  saveWalletAutoTopUp,
} from "@/lib/pymthouse";
import { requireSessionUserId } from "@/lib/session";
import { parseTopUpAmountUsd } from "@/lib/top-up-amount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pmtHouseErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof PmtHouseError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status || 500 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const claimedUserId = request.nextUrl.searchParams.get("externalUserId")?.trim() || "";
  if (!claimedUserId) {
    return NextResponse.json({ error: "externalUserId is required" }, { status: 400 });
  }
  const owner = requireSessionUserId(request, claimedUserId);
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }
  try {
    const [creditsResult, autoTopUpResult] = await Promise.allSettled([
      loadUserCreditBalance(owner.externalUserId),
      loadWalletAutoTopUp(owner.externalUserId),
    ]);
    if (creditsResult.status === "rejected") {
      throw creditsResult.reason;
    }
    const autoTopUp = autoTopUpResult.status === "fulfilled" ? autoTopUpResult.value : null;
    return NextResponse.json({ credits: creditsResult.value, autoTopUp });
  } catch (error) {
    return pmtHouseErrorResponse(error, "Failed to load billing");
  }
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const claimedUserId = typeof body.externalUserId === "string" ? body.externalUserId.trim() : "";
  const owner = requireSessionUserId(request, claimedUserId);
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }
  const parsedAmount = parseTopUpAmountUsd(body.amountUsd ?? "10");
  if (body.enabled && !parsedAmount.ok) {
    return NextResponse.json({ error: parsedAmount.error }, { status: 400 });
  }
  const amountUsd = parsedAmount.ok ? parsedAmount.amount.toFixed(2) : "10.00";
  try {
    if (body.enabled) {
      const paymentMethods = await listUserPaymentMethods(owner.externalUserId);
      if (paymentMethods.length === 0) {
        return NextResponse.json(
          { error: "Add a card before enabling auto top-up." },
          { status: 400 },
        );
      }
    }
    const autoTopUp = await saveWalletAutoTopUp({
      externalUserId: owner.externalUserId,
      enabled: body.enabled,
      amountUsd,
    });
    return NextResponse.json({ autoTopUp });
  } catch (error) {
    return pmtHouseErrorResponse(error, "Failed to save auto top-up");
  }
}
