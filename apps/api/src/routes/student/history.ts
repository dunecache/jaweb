import { Hono } from "hono";

import type { AppEnv } from "../../lib/app-types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { historyDetail, historyList } from "../../services/student-history";

export const studentHistoryRoutes = new Hono<AppEnv>();

studentHistoryRoutes.use("*", requireAuth, requireRole("student"));

function notModified(
  c: { req: { header: (name: string) => string | undefined } },
  rev: string,
): boolean {
  const clientRev = c.req.header("if-none-match")?.replace(/^W\//, "").replaceAll('"', "");
  return clientRev === rev;
}

studentHistoryRoutes.get("/", async (c) => {
  const payload = await historyList(c.var.user.id);
  c.header("etag", `"${payload.rev}"`);
  if (notModified(c, payload.rev)) return c.body(null, 304);
  return c.json(payload);
});

studentHistoryRoutes.get("/:exerciseId", async (c) => {
  const payload = await historyDetail(c.var.user.id, c.req.param("exerciseId"));
  c.header("etag", `"${payload.rev}"`);
  if (notModified(c, payload.rev)) return c.body(null, 304);
  return c.json(payload);
});
