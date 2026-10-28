import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, isAllowedBrowserMutation } from "@/lib/cors";
import {
  tickSessionPayment,
  type PaymentHandle,
} from "@/lib/live-runner-session";
import { resolveSignerUrl } from "@/lib/pymthouse";
import { sessionUserIdFromRequest } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 30;

function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const headers = corsHeaders(request);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function OPTIONS(request: NextRequest) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}

/** Keep a reserved session funded while the browser holds /ws_stream open. */
export async function POST(request: NextRequest) {
  if (!isAllowedBrowserMutation(request)) {
    return withCors(
      request,
      NextResponse.json({ error: "Invalid request origin" }, { status: 403 }),
    );
  }
  if (!sessionUserIdFromRequest(request)) {
    return withCors(
      request,
      NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    );
  }

  const body = (await request.json().catch(() => null)) as {
    access_token?: string;
    payment?: PaymentHandle;
  } | null;

  if (!body?.access_token || !body?.payment) {
    return withCors(
      request,
      NextResponse.json({ error: "access_token and payment required" }, { status: 400 }),
    );
  }

  try {
    if (!body.payment.signer_url?.trim()) {
      return withCors(
        request,
        NextResponse.json(
          { error: "payment.signer_url is required" },
          { status: 400 },
        ),
      );
    }
    const paymentHandle: PaymentHandle = {
      ...body.payment,
      // Normalize only — never replace a real exchange host with a guessed default.
      signer_url: resolveSignerUrl(body.payment.signer_url),
      // Older browser handles may omit this; default to time-metered live.
      payment_type: body.payment.payment_type?.trim() || "live",
    };
    const payment = await tickSessionPayment({
      accessToken: body.access_token,
      payment: paymentHandle,
    });
    return withCors(request, NextResponse.json({ payment }));
  } catch (err) {
    return withCors(
      request,
      NextResponse.json(
        { error: err instanceof Error ? err.message : "payment_tick_failed" },
        { status: 502 },
      ),
    );
  }
}
