import { healthResponseSchema } from "@jaweb/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../db/client";
import type { AppEnv } from "../lib/app-types";
import { InternalError } from "../lib/errors";

export const healthRoutes = new Hono<AppEnv>().get("/", async (c) => {
  try {
    await db.get(sql`SELECT 1`);
  } catch (err) {
    c.var.logger.error({ err }, "database health check failed");
    throw new InternalError("Database unavailable");
  }
  return c.json(healthResponseSchema.parse({ ok: true, db: "up" }));
});
