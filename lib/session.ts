import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "comfypeer_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function sessionSecret(): string | null {
  return (
    process.env.COMFYPEER_SESSION_SECRET?.trim() ||
    process.env.PYMTHOUSE_M2M_CLIENT_SECRET?.trim() ||
    null
  );
}

function signUserId(externalUserId: string, secret: string): string {
  return createHmac("sha256", secret).update(externalUserId).digest("base64url");
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function setSessionCookie(response: NextResponse, externalUserId: string): void {
  const secret = sessionSecret();
  if (!secret) return;
  const token = `${externalUserId}.${signUserId(externalUserId, secret)}`;
  response.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE_SEC));
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
}

export function sessionUserIdFromRequest(request: NextRequest): string | null {
  const secret = sessionSecret();
  const raw = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const dot = raw.lastIndexOf(".");
  if (!secret || dot <= 0) return null;
  const externalUserId = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  if (!externalUserId || !mac) return null;
  const expected = signUserId(externalUserId, secret);
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return externalUserId;
}

export function requireSessionUserId(
  request: NextRequest,
  claimedUserId: string,
): { ok: true; externalUserId: string } | { ok: false; status: number; error: string } {
  const sessionUserId = sessionUserIdFromRequest(request);
  if (!sessionUserId) {
    return { ok: false, status: 401, error: "Sign in required" };
  }
  if (claimedUserId && claimedUserId !== sessionUserId) {
    return {
      ok: false,
      status: 403,
      error: "externalUserId does not match the signed-in user",
    };
  }
  return { ok: true, externalUserId: sessionUserId };
}
