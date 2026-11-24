import {
  createExerciseRequestSchema,
  createQuestionRequestSchema,
  exerciseStatusSchema,
  patchExerciseRequestSchema,
} from "@jaweb/shared";
import { Hono } from "hono";

import type { AppEnv } from "../../lib/app-types";
import { parseJson } from "../../lib/parse";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  createExercise,
  exerciseReadiness,
  getExercise,
  listExercises,
  patchExercise,
} from "../../services/exercises";
import { closeExercise, goLive } from "../../services/lifecycle";
import { createQuestion, listQuestions, previewQuestions } from "../../services/questions";

export const teacherExercisesRoutes = new Hono<AppEnv>();

teacherExercisesRoutes.use("*", requireAuth, requireRole("teacher"));

teacherExercisesRoutes.get("/", async (c) => {
  const moduleId = c.req.query("moduleId");
  const status = exerciseStatusSchema.safeParse(c.req.query("status"));
  return c.json(
    await listExercises({
      moduleId,
      status: status.success ? status.data : undefined,
    }),
  );
});

teacherExercisesRoutes.post("/", async (c) => {
  const input = await parseJson(c, createExerciseRequestSchema);
  return c.json(await createExercise(input, c.var.user.id), 201);
});

teacherExercisesRoutes.get("/:id", async (c) => c.json(await getExercise(c.req.param("id"))));

teacherExercisesRoutes.patch("/:id", async (c) => {
  const input = await parseJson(c, patchExerciseRequestSchema);
  return c.json(await patchExercise(c.req.param("id"), input));
});

teacherExercisesRoutes.get("/:id/questions", async (c) =>
  c.json(await listQuestions(c.req.param("id"))),
);

teacherExercisesRoutes.post("/:id/questions", async (c) => {
  const input = await parseJson(c, createQuestionRequestSchema);
  return c.json(await createQuestion(c.req.param("id"), input), 201);
});

teacherExercisesRoutes.post("/:id/live", async (c) => {
  const id = c.req.param("id");
  await goLive(id);
  return c.json(await getExercise(id));
});

teacherExercisesRoutes.post("/:id/close", async (c) => {
  const id = c.req.param("id");
  await closeExercise(id);
  return c.json(await getExercise(id));
});

teacherExercisesRoutes.get("/:id/preview", async (c) => {
  const id = c.req.param("id");
  const [exercise, questions, issues] = await Promise.all([
    getExercise(id),
    previewQuestions(id),
    exerciseReadiness(id),
  ]);
  return c.json({ exercise, questions, ready: issues.length === 0, issues });
});
