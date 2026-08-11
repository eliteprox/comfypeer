import { NextResponse } from "next/server";
import { getOrchestrators } from "@/lib/orchestrators";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ orchestrators: getOrchestrators() });
}
