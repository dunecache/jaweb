import { createHash, randomBytes } from "node:crypto";

import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { env } from "../env";

export const SESSION_COOKIE = "jaweb_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Sliding renewal is throttled so 5s student polling does not write on every tick.
const RENEW_AFTER_MS = 60 * 60 * 1000;

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function readSessionToken(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export function shouldRenew(lastUsedAt: string, nowMs: number): boolean {
  return nowMs - Date.parse(lastUsedAt) >= RENEW_AFTER_MS;
}

function isSecure(c: Context): boolean {
  if (env.COOKIE_SECURE === "always") return true;
  if (env.COOKIE_SECURE === "never") return false;
  const forwarded = c.req.header("x-forwarded-proto");
  const protocol = forwarded?.split(",")[0]?.trim() ?? new URL(c.req.url).protocol.slice(0, -1);
  return protocol === "https";
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecure(c),
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}
