import { NextRequest, NextResponse } from "next/server";
import {
  changeBillingSubscription,
  settingsCheckoutUrls,
} from "@/lib/billing-plans";
import { pmtHouseErrorResponse } from "@/lib/pmt-house-route";
import { requireSessionUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: {
    planId?: string;
    externalUserId?: string;
    successUrl?: string;
    cancelUrl?: string;
    timing?: string;
    effectiveAt?: string;
    confirmReplaceScheduled?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const planId = body.planId?.trim();
  const claimedUserId = body.externalUserId?.trim() || "";
  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }
  const owner = requireSessionUserId(request, claimedUserId);
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }

  const defaults = settingsCheckoutUrls(planId);
  try {
    const result = await changeBillingSubscription({
      planId,
      externalUserId: owner.externalUserId,
      successUrl: body.successUrl?.trim() || defaults.successUrl,
      cancelUrl: body.cancelUrl?.trim() || defaults.cancelUrl,
      timing: body.timing?.trim(),
      effectiveAt: body.effectiveAt?.trim(),
      confirmReplaceScheduled: body.confirmReplaceScheduled === true,
    });
    return NextResponse.json(result);
  } catch (error) {
    return pmtHouseErrorResponse(error, "Failed to change subscription");
  }
}
