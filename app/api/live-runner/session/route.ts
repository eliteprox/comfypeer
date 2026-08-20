import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, isAllowedBrowserMutation } from "@/lib/cors";
import {
  reserveComfySession,
  stopComfySession,
  type PaymentHandle,
} from "@/lib/live-runner-session";
import { resolveSignerUrl } from "@/lib/pymthouse";
import { requireSessionUserId, sessionUserIdFromRequest } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

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

/**
 * Reserve a comfystream live-runner session for browser WebSocket streaming.
 * Body: { access_token, discovery_url, signer_url }
 */
export async function POST(request: NextRequest) {
  if (!isAllowedBrowserMutation(request)) {
    return withCors(
      request,
      NextResponse.json({ error: "Invalid request origin" }, { status: 403 }),
    );
  }

  const sessionUserId = sessionUserIdFromRequest(request);
  if (!sessionUserId) {
    return withCors(
      request,
      NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    );
  }
  const gate = requireSessionUserId(request, sessionUserId);
  if (!gate.ok) {
    return withCors(
      request,
      NextResponse.json({ error: gate.error }, { status: gate.status }),
    );
  }

  const body = (await request.json().catch(() => null)) as {
    access_token?: string;
    discovery_url?: string;
    signer_url?: string;
  } | null;

  try {
    const reserved = await reserveComfySession({
      accessToken: body?.access_token || "",
      discoveryUrl: body?.discovery_url || "",
      signerUrl: resolveSignerUrl(body?.signer_url),
    });
    return withCors(request, NextResponse.json(reserved));
  } catch (err) {
    return withCors(
      request,
      NextResponse.json(
        { error: err instanceof Error ? err.message : "reserve_failed" },
        { status: 502 },
      ),
    );
  }
}

/** Release a reserved session. Body: { runner_url, session_id } */
export async function DELETE(request: NextRequest) {
  if (!isAllowedBrowserMutation(request)) {
    return withCors(
      request,
      NextResponse.json({ error: "Invalid request origin" }, { status: 403 }),
    );
  }

  const sessionUserId = sessionUserIdFromRequest(request);
  if (!sessionUserId) {
    return withCors(
      request,
      NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    );
  }

  const body = (await request.json().catch(() => null)) as {
    runner_url?: string;
    session_id?: string;
    payment?: PaymentHandle | null;
  } | null;

  if (body?.runner_url && body?.session_id) {
    await stopComfySession({
      runnerUrl: body.runner_url,
      sessionId: body.session_id,
    });
  }
  return withCors(request, NextResponse.json({ ok: true }));
}
