import { createModuleRequestSchema, patchModuleRequestSchema } from "@jaweb/shared";
import { Hono } from "hono";

import type { AppEnv } from "../../lib/app-types";
import { parseJson } from "../../lib/parse";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createModule, listModules, patchModule } from "../../services/modules";

export const teacherModulesRoutes = new Hono<AppEnv>();

teacherModulesRoutes.use("*", requireAuth, requireRole("teacher"));

teacherModulesRoutes.get("/", async (c) =>
  c.json(await listModules(c.req.query("archived") === "1")),
);

teacherModulesRoutes.post("/", async (c) => {
  const input = await parseJson(c, createModuleRequestSchema);
  return c.json(await createModule(input), 201);
});

teacherModulesRoutes.patch("/:id", async (c) => {
  const input = await parseJson(c, patchModuleRequestSchema);
  return c.json(await patchModule(c.req.param("id"), input));
});
