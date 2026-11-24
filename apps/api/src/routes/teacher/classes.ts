import { createClassRequestSchema, patchClassRequestSchema } from "@jaweb/shared";
import { Hono } from "hono";

import type { AppEnv } from "../../lib/app-types";
import { parseJson } from "../../lib/parse";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createClass, listClasses, patchClass } from "../../services/classes";

export const teacherClassesRoutes = new Hono<AppEnv>();

teacherClassesRoutes.use("*", requireAuth, requireRole("teacher"));

teacherClassesRoutes.get("/", async (c) => c.json(await listClasses()));

teacherClassesRoutes.post("/", async (c) => {
  const input = await parseJson(c, createClassRequestSchema);
  return c.json(await createClass(input), 201);
});

teacherClassesRoutes.patch("/:id", async (c) => {
  const input = await parseJson(c, patchClassRequestSchema);
  return c.json(await patchClass(c.req.param("id"), input));
});
