import { NextRequest, NextResponse } from "next/server";
import { mintUserSignerSession, PmtHouseError } from "@/lib/pymthouse";
import { requireSessionUserId, sessionUserIdFromRequest } from "@/lib/session";
import { corsHeaders, isAllowedBrowserMutation } from "@/lib/cors";

export const runtime = "nodejs";

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

  try {
    const session = await mintUserSignerSession(gate.externalUserId);
    return withCors(
      request,
      NextResponse.json({
        access_token: session.accessToken,
        token_type: session.tokenType,
        expires_in: session.expiresIn,
        scope: session.scope,
        signer_url: session.signerUrl,
        discovery_url: session.discoveryUrl,
      }),
    );
  } catch (error) {
    if (error instanceof PmtHouseError) {
      return withCors(
        request,
        NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status || 500 },
        ),
      );
    }
    return withCors(
      request,
      NextResponse.json({ error: "signer_session_failed" }, { status: 500 }),
    );
  }
}
