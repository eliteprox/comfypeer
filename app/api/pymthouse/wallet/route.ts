import { NextRequest, NextResponse } from "next/server";
import {
  loadUserCreditBalance,
  loadWalletAutoTopUp,
  PmtHouseError,
  saveWalletAutoTopUp,
} from "@/lib/pymthouse";
import { parseTopUpAmountUsd } from "@/lib/top-up-amount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const externalUserId =
    request.nextUrl.searchParams.get("externalUserId")?.trim() || "";
  if (!externalUserId) {
    return NextResponse.json({ error: "externalUserId is required" }, { status: 400 });
  }
  try {
    const [credits, autoTopUp] = await Promise.all([
      loadUserCreditBalance(externalUserId),
      loadWalletAutoTopUp(externalUserId).catch(() => ({
        enabled: false,
        amountUsd: null as string | null,
      })),
    ]);
    return NextResponse.json({ credits, autoTopUp });
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "Failed to load billing" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const externalUserId =
    typeof body.externalUserId === "string" ? body.externalUserId.trim() : "";
  if (!externalUserId) {
    return NextResponse.json({ error: "externalUserId is required" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }
  const amount = parseTopUpAmountUsd(body.amountUsd ?? "10");
  if (!amount.ok) {
    return NextResponse.json({ error: amount.error }, { status: 400 });
  }
  try {
    const autoTopUp = await saveWalletAutoTopUp({
      externalUserId,
      enabled: body.enabled,
      amountUsd: amount.amount.toFixed(2),
    });
    return NextResponse.json({ autoTopUp });
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "Failed to save auto top-up" }, { status: 500 });
  }
}
