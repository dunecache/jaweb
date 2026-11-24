import { randomUUID } from "node:crypto";

import type { MiddlewareHandler } from "hono";
import { pino } from "pino";

import type { AppEnv } from "../lib/app-types";

const baseLogger = pino({
  level: process.env.NODE_ENV === "test" ? "silent" : "info",
  redact: {
    paths: ["password", "apiKey", "*.password", "*.apiKey"],
    remove: true,
  },
});

export const loggerMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? randomUUID();
  const logger = baseLogger.child({ requestId });
  c.set("requestId", requestId);
  c.set("logger", logger);
  c.header("x-request-id", requestId);

  const startedAt = performance.now();
  await next();
  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Math.round(performance.now() - startedAt),
    },
    "request",
  );
};
