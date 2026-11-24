import type { Role } from "@jaweb/shared";
import type { MiddlewareHandler } from "hono";

import { env } from "../env";
import type { AppEnv } from "../lib/app-types";
import { ForbiddenError, UnauthenticatedError } from "../lib/errors";
import { readSessionToken } from "../lib/session";
import { authenticate } from "../services/auth";

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = readSessionToken(c);
  if (!token) throw new UnauthenticatedError();
  const result = await authenticate(token);
  if (!result) throw new UnauthenticatedError();
  c.set("user", result.user);
  c.set("sessionId", result.sessionId);
  await next();
};

export function requireRole(role: Role): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (c.var.user.role !== role) throw new ForbiddenError();
    await next();
  };
}

function allowedOrigins(c: {
  req: { url: string; header: (name: string) => string | undefined };
}): string[] {
  const requestUrl = new URL(c.req.url);
  const proto =
    c.req.header("x-forwarded-proto")?.split(",")[0]?.trim() ?? requestUrl.protocol.slice(0, -1);
  const self = `${proto}://${c.req.header("host") ?? requestUrl.host}`;
  return env.NODE_ENV === "production" ? [self] : [self, env.WEB_ORIGIN];
}

export const originCheck: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("origin")?.replace(/\/$/, "");
    if (origin && !allowedOrigins(c).includes(origin.replace(/\/$/, ""))) {
      throw new ForbiddenError("Origin not allowed");
    }
  }
  await next();
};
