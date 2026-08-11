import { NextResponse } from "next/server";
import { getOrchestrators } from "@/lib/orchestrators";
import { fetchAllOrchDiscoveries } from "@/lib/discovery";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET() {
  const discoveries = await fetchAllOrchDiscoveries();
  return NextResponse.json({
    orchestrators: getOrchestrators(),
    discoveries: discoveries.map((d) => ({
      orch: d.orch,
      runners: d.runners,
      error: d.error ?? null,
    })),
  });
}
