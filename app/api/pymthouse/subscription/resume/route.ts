import { NextRequest, NextResponse } from "next/server";
import { resumeUserSubscription } from "@/lib/billing-plans";
import { pmtHouseErrorResponse } from "@/lib/pmt-house-route";
import { requireSessionUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { externalUserId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const owner = requireSessionUserId(request, body.externalUserId?.trim() || "");
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }

  try {
    await resumeUserSubscription(owner.externalUserId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return pmtHouseErrorResponse(error, "Failed to resume subscription");
  }
}
