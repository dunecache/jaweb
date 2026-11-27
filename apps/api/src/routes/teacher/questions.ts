import { patchQuestionRequestSchema } from "@jaweb/shared";
import { Hono } from "hono";

import type { AppEnv } from "../../lib/app-types";
import { parseJson } from "../../lib/parse";
import { requireAuth, requireRole } from "../../middleware/auth";
import { deleteQuestion, patchQuestion } from "../../services/questions";

export const teacherQuestionsRoutes = new Hono<AppEnv>();

teacherQuestionsRoutes.use("*", requireAuth, requireRole("teacher"));

teacherQuestionsRoutes.patch("/:id", async (c) => {
  const input = await parseJson(c, patchQuestionRequestSchema);
  return c.json(await patchQuestion(c.req.param("id"), input));
});

teacherQuestionsRoutes.delete("/:id", async (c) => {
  await deleteQuestion(c.req.param("id"));
  return c.json({ ok: true });
});
