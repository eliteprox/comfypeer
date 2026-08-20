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
    const paymentHandle: PaymentHandle = {
      ...body.payment,
      signer_url: resolveSignerUrl(body.payment.signer_url),
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
