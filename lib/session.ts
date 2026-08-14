import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "comfypeer_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function sessionSecret(): string | null {
  return process.env.COMFYPEER_SESSION_SECRET?.trim() || null;
}

export function sessionSecretConfigured(): boolean {
  return sessionSecret() !== null;
}

function signSession(externalUserId: string, expiresAtSec: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${externalUserId}.${expiresAtSec}`)
    .digest("base64url");
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

export type SessionCookieResult = { ok: true } | { ok: false; error: string };

export function setSessionCookie(
  response: NextResponse,
  externalUserId: string,
): SessionCookieResult {
  const secret = sessionSecret();
  if (!secret) {
    return { ok: false, error: "COMFYPEER_SESSION_SECRET is not configured" };
  }
  const expiresAtSec = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const mac = signSession(externalUserId, expiresAtSec, secret);
  const token = `${externalUserId}.${expiresAtSec}.${mac}`;
  response.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE_SEC));
  return { ok: true };
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
}

export function sessionUserIdFromRequest(request: NextRequest): string | null {
  const secret = sessionSecret();
  const raw = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const parts = raw.split(".");
  if (!secret || parts.length !== 3) return null;
  const [externalUserId, expiresAtRaw, mac] = parts;
  const expiresAtSec = Number(expiresAtRaw);
  if (!externalUserId || !mac || !Number.isFinite(expiresAtSec) || expiresAtSec <= 0) {
    return null;
  }
  if (Math.floor(Date.now() / 1000) > expiresAtSec) return null;
  const expected = signSession(externalUserId, expiresAtSec, secret);
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
