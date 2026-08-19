import { NextResponse } from "next/server";
import { listBillingPlans } from "@/lib/billing-plans";
import { pmtHouseErrorResponse } from "@/lib/pmt-house-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await listBillingPlans();
    return NextResponse.json({ plans });
  } catch (error) {
    return pmtHouseErrorResponse(error, "Failed to list billing plans");
  }
}
