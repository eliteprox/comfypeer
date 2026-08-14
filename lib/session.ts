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

function encodeEmail(email: string): string {
  return Buffer.from(email, "utf8").toString("base64url");
}

function decodeEmail(encoded: string): string | null {
  try {
    const email = Buffer.from(encoded, "base64url").toString("utf8").trim().toLowerCase();
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

function signSession(
  externalUserId: string,
  expiresAtSec: number,
  emailEnc: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${externalUserId}.${expiresAtSec}.${emailEnc}`)
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

export type SessionPrincipal = {
  externalUserId: string;
  email: string;
};

export function setSessionCookie(
  response: NextResponse,
  externalUserId: string,
  email: string,
): SessionCookieResult {
  const secret = sessionSecret();
  if (!secret) {
    return { ok: false, error: "COMFYPEER_SESSION_SECRET is not configured" };
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    return { ok: false, error: "email is required to establish a session" };
  }
  const expiresAtSec = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const emailEnc = encodeEmail(normalizedEmail);
  const mac = signSession(externalUserId, expiresAtSec, emailEnc, secret);
  const token = `${externalUserId}.${expiresAtSec}.${emailEnc}.${mac}`;
  response.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE_SEC));
  return { ok: true };
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
}

export function sessionFromRequest(request: NextRequest): SessionPrincipal | null {
  const secret = sessionSecret();
  const raw = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const parts = raw.split(".");
  if (!secret || parts.length !== 4) return null;
  const [externalUserId, expiresAtRaw, emailEnc, mac] = parts;
  const expiresAtSec = Number(expiresAtRaw);
  const email = emailEnc ? decodeEmail(emailEnc) : null;
  if (
    !externalUserId ||
    !mac ||
    !email ||
    !Number.isFinite(expiresAtSec) ||
    expiresAtSec <= 0
  ) {
    return null;
  }
  if (Math.floor(Date.now() / 1000) > expiresAtSec) return null;
  const expected = signSession(externalUserId, expiresAtSec, emailEnc, secret);
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return { externalUserId, email };
}

export function sessionUserIdFromRequest(request: NextRequest): string | null {
  return sessionFromRequest(request)?.externalUserId ?? null;
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
