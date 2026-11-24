import { Hono } from "hono";

import type { AppEnv } from "../../lib/app-types";
import { requireAuth, requireRole } from "../../middleware/auth";
import { touchParticipation } from "../../services/participations";

export const studentExercisesRoutes = new Hono<AppEnv>();

studentExercisesRoutes.use("*", requireAuth, requireRole("student"));

studentExercisesRoutes.post("/:id/start", async (c) => {
  const participation = await touchParticipation(c.req.param("id"), c.var.user.id);
  return c.json(participation);
});
