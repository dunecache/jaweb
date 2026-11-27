import { type AuthUser, authUserSchema, type LoginRequest } from "@jaweb/shared";
import { and, eq, gt } from "drizzle-orm";

import { db } from "../db/client";
import { sessions, users } from "../db/schema";
import type { AppContext } from "../lib/app-types";
import { RateLimitedError, UnauthenticatedError } from "../lib/errors";
import { newId } from "../lib/ids";
import { verifyPassword } from "../lib/password";
import { loginLimiter } from "../lib/rate-limit";
import {
  hashToken,
  newSessionToken,
  SESSION_TTL_MS,
  setSessionCookie,
  shouldRenew,
} from "../lib/session";
import { nowIso } from "../lib/time";

function clientIp(c: AppContext): string {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded ?? c.req.header("x-real-ip") ?? "unknown";
}

export async function login(c: AppContext, input: LoginRequest): Promise<AuthUser> {
  const username = input.username.trim().toLowerCase();
  if (!loginLimiter.takeIpSlot(clientIp(c))) {
    throw new RateLimitedError("Too many login attempts from this address");
  }
  const lockedFor = loginLimiter.lockRemainingMs(username);
  if (lockedFor > 0) {
    throw new RateLimitedError(`Try again in ${Math.ceil(lockedFor / 60_000)} minute(s)`);
  }

  const user = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      passwordHash: users.passwordHash,
      archivedAt: users.archivedAt,
    })
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (!user || user.archivedAt || !(await verifyPassword(user.passwordHash, input.password))) {
    loginLimiter.recordFailure(username);
    throw new UnauthenticatedError("Invalid username or password");
  }

  loginLimiter.reset(username);
  const token = newSessionToken();
  const now = new Date();
  await db.insert(sessions).values({
    id: newId(),
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    createdAt: now.toISOString(),
    lastUsedAt: now.toISOString(),
  });
  setSessionCookie(c, token);

  return authUserSchema.parse({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  });
}

export async function logout(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function authenticate(
  token: string,
): Promise<{ user: AuthUser; sessionId: string } | null> {
  const row = await db
    .select({
      sessionId: sessions.id,
      sessionExpiresAt: sessions.expiresAt,
      lastUsedAt: sessions.lastUsedAt,
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      archivedAt: users.archivedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, nowIso())))
    .get();

  if (!row || row.archivedAt) return null;

  if (shouldRenew(row.lastUsedAt, Date.now())) {
    const now = new Date();
    await db
      .update(sessions)
      .set({
        lastUsedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
      })
      .where(eq(sessions.id, row.sessionId));
  }

  return {
    user: authUserSchema.parse({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      role: row.role,
    }),
    sessionId: row.sessionId,
  };
}
