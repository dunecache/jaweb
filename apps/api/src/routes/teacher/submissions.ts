import { overrideSubmissionRequestSchema } from "@jaweb/shared";
import { Hono } from "hono";

import type { AppEnv } from "../../lib/app-types";
import { parseJson } from "../../lib/parse";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  listTeacherSubmissions,
  overrideSubmission,
  unlockSubmission,
} from "../../services/teacher-submissions";

export const teacherSubmissionRoutes = new Hono<AppEnv>();

teacherSubmissionRoutes.use("*", requireAuth, requireRole("teacher"));

teacherSubmissionRoutes.get("/", async (c) =>
  c.json(
    await listTeacherSubmissions({
      exerciseId: c.req.query("exerciseId"),
      questionId: c.req.query("questionId"),
      studentId: c.req.query("studentId"),
    }),
  ),
);

teacherSubmissionRoutes.post("/:id/override", async (c) => {
  const input = await parseJson(c, overrideSubmissionRequestSchema);
  return c.json(await overrideSubmission(c.req.param("id"), input));
});

teacherSubmissionRoutes.post("/:id/unlock", async (c) =>
  c.json(await unlockSubmission(c.req.param("id"))),
);
