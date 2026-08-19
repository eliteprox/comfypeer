import { NextRequest, NextResponse } from "next/server";
import { getUserSubscription } from "@/lib/billing-plans";
import { pmtHouseErrorResponse } from "@/lib/pmt-house-route";
import { requireSessionUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const claimedUserId =
    request.nextUrl.searchParams.get("externalUserId")?.trim() || "";
  const owner = requireSessionUserId(request, claimedUserId);
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }
  try {
    const subscription = await getUserSubscription(owner.externalUserId);
    return NextResponse.json({ subscription });
  } catch (error) {
    return pmtHouseErrorResponse(error, "Failed to load subscription");
  }
}
