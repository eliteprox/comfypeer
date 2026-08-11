import { NextRequest, NextResponse } from "next/server";
import { listWalletTransactions, PmtHouseError } from "@/lib/pymthouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const externalUserId =
    request.nextUrl.searchParams.get("externalUserId")?.trim() || "";
  if (!externalUserId) {
    return NextResponse.json(
      { error: "externalUserId is required" },
      { status: 400 },
    );
  }
  try {
    const result = await listWalletTransactions(externalUserId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to load billing history" },
      { status: 500 },
    );
  }
}
