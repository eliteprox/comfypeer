import { NextResponse } from "next/server";
import { INSTALL } from "@/lib/constants";
import { track } from "@/lib/events";
import { deviceClassFromClientHint, installSourceFromQuery } from "@/lib/install-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const source = installSourceFromQuery(url.searchParams.get("source"));
  const deviceClass = deviceClassFromClientHint(request.headers.get("sec-ch-ua-mobile"));
  track("install_click", {
    ...(source ? { source } : {}),
    device_class: deviceClass,
  });
  return NextResponse.redirect(INSTALL.registryUrl, 302);
}
