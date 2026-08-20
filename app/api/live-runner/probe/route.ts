import { NextResponse } from "next/server";
import {
  formatUpstreamFetchError,
  resolveLiveRunnerDiscoveryUrl,
} from "@/lib/live-runner-session";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Unauthenticated connectivity probe for staging debugging.
 * Hits the pinned orch discovery URL from the Vercel function egress path.
 * Disable by unsetting LIVE_RUNNER_PROBE=1 (default off in production intent).
 */
export async function GET() {
  const probeEnabled =
    process.env.LIVE_RUNNER_PROBE === "1" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development";
  if (!probeEnabled) {
    return NextResponse.json({ error: "probe disabled" }, { status: 404 });
  }

  const discoveryUrl = resolveLiveRunnerDiscoveryUrl(null);
  const started = Date.now();
  try {
    const res = await fetch(discoveryUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    const text = await res.text();
    return NextResponse.json({
      ok: res.ok,
      discoveryUrl,
      status: res.status,
      ms: Date.now() - started,
      bodyPreview: text.slice(0, 240),
    });
  } catch (err) {
    const formatted = formatUpstreamFetchError(err, "GET", discoveryUrl);
    return NextResponse.json(
      {
        ok: false,
        discoveryUrl,
        ms: Date.now() - started,
        error: formatted.message,
      },
      { status: 502 },
    );
  }
}
