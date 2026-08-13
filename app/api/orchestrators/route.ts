import { NextResponse } from "next/server";
import { fetchAllOrchDiscoveries } from "@/lib/discovery";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET() {
  const discoveries = await fetchAllOrchDiscoveries();
  return NextResponse.json({
    orchestrators: discoveries.filter((d) => d.orch.url).map((d) => d.orch),
    discoveries: discoveries.map((d) => ({
      orch: d.orch,
      runners: d.runners,
      error: d.error ?? null,
    })),
  });
}
