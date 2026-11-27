import { createSubmissionRequestSchema } from "@jaweb/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../../db/client";
import { questions, users } from "../../db/schema";
import type { AppEnv } from "../../lib/app-types";
import { ConflictError, ValidationError } from "../../lib/errors";
import { parseJson } from "../../lib/parse";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getExercise } from "../../services/exercises";
import { syncLifecycle } from "../../services/lifecycle";
import { answerMatchesKind } from "../../services/participations";
import { createSubmission } from "../../services/submissions";

export const studentSubmissionRoutes = new Hono<AppEnv>();

studentSubmissionRoutes.use("*", requireAuth, requireRole("student"));

studentSubmissionRoutes.post("/", async (c) => {
  const input = await parseJson(c, createSubmissionRequestSchema);
  await syncLifecycle();

  const question = await db
    .select()
    .from(questions)
    .where(eq(questions.id, input.questionId))
    .get();
  if (!question) throw new ValidationError("Question not found");
  if (!answerMatchesKind(input.answer, question.kind)) {
    throw new ValidationError("Answer kind does not match the question");
  }

  const exercise = await getExercise(question.exerciseId);
  if (exercise.status !== "live") throw new ConflictError("The exercise is not live");

  const student = await db
    .select({ classId: users.classId })
    .from(users)
    .where(eq(users.id, c.var.user.id))
    .get();
  if (!student || student.classId !== exercise.classId) {
    throw new ValidationError("This exercise is not for your class");
  }

  const result = await createSubmission({
    exercise,
    question,
    studentId: c.var.user.id,
    answer: input.answer,
  });
  return c.json(result.submission, result.status);
});
