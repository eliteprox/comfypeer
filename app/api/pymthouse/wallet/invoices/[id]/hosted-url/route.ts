import { NextRequest, NextResponse } from "next/server";
import { getUserInvoiceHostedUrl, PmtHouseError } from "@/lib/pymthouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const externalUserId =
    request.nextUrl.searchParams.get("externalUserId")?.trim() || "";
  const { id: invoiceId } = await context.params;
  if (!externalUserId) {
    return NextResponse.json({ error: "externalUserId is required" }, { status: 400 });
  }
  if (!invoiceId?.trim()) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }
  try {
    const result = await getUserInvoiceHostedUrl(externalUserId, invoiceId.trim());
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "Failed to resolve invoice URL" }, { status: 500 });
  }
}
