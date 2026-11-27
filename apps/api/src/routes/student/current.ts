import { studentCurrentSchema } from "@jaweb/shared";
import { Hono } from "hono";

import type { AppEnv } from "../../lib/app-types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { currentForStudent } from "../../services/student";

export const studentCurrentRoutes = new Hono<AppEnv>();

studentCurrentRoutes.use("*", requireAuth, requireRole("student"));

studentCurrentRoutes.get("/", async (c) => {
  const payload = studentCurrentSchema.parse(await currentForStudent(c.var.user.id));
  const clientRev = c.req.header("if-none-match")?.replace(/^W\//, "").replaceAll('"', "");
  c.header("etag", `"${payload.rev}"`);
  if (clientRev === payload.rev) return c.body(null, 304);
  return c.json(payload);
});
