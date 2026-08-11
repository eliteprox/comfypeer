import { NextRequest, NextResponse } from "next/server";
import {
  ensureDefaultPaymentMethod,
  listUserPaymentMethods,
  PmtHouseError,
  startPaymentMethodCheckout,
} from "@/lib/pymthouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const externalUserId =
    request.nextUrl.searchParams.get("externalUserId")?.trim() || "";
  if (!externalUserId) {
    return NextResponse.json({ error: "externalUserId is required" }, { status: 400 });
  }
  try {
    const paymentMethods = await listUserPaymentMethods(externalUserId);
    return NextResponse.json({ paymentMethods });
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "Failed to load payment methods" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { externalUserId?: string };
    if (!body.externalUserId?.trim()) {
      return NextResponse.json({ error: "externalUserId required" }, { status: 400 });
    }
    const result = await startPaymentMethodCheckout(body.externalUserId.trim());
    return NextResponse.json({ checkoutUrl: result.checkoutUrl });
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "Payment method checkout failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      externalUserId?: string;
      ensureDefault?: boolean;
    };
    if (!body.externalUserId?.trim()) {
      return NextResponse.json({ error: "externalUserId required" }, { status: 400 });
    }
    if (!body.ensureDefault) {
      return NextResponse.json({ error: "ensureDefault required" }, { status: 400 });
    }
    const result = await ensureDefaultPaymentMethod(body.externalUserId.trim());
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "Failed to set default payment method" }, { status: 500 });
  }
}
