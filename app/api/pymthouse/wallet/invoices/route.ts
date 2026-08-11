import { NextRequest, NextResponse } from "next/server";
import { listUserInvoices, PmtHouseError } from "@/lib/pymthouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePageParam(raw: string | null): number | undefined {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return undefined;
  return Number(raw);
}

export async function GET(request: NextRequest) {
  const externalUserId =
    request.nextUrl.searchParams.get("externalUserId")?.trim() || "";
  if (!externalUserId) {
    return NextResponse.json({ error: "externalUserId is required" }, { status: 400 });
  }
  try {
    const result = await listUserInvoices(externalUserId, {
      page: parsePageParam(request.nextUrl.searchParams.get("page")),
      pageSize: parsePageParam(request.nextUrl.searchParams.get("pageSize")) ?? 20,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }
}
