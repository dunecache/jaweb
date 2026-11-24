import {
  type OverrideSubmissionRequest,
  type TeacherSubmission,
  teacherSubmissionSchema,
} from "@jaweb/shared";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { submissions } from "../db/schema";
import { ConflictError, NotFoundError } from "../lib/errors";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/time";
import { applyPoints } from "./scoring";

export async function listTeacherSubmissions(filters: {
  exerciseId?: string;
  questionId?: string;
}): Promise<TeacherSubmission[]> {
  const rows = await db
    .select()
    .from(submissions)
    .where(
      and(
        isNull(submissions.archivedAt),
        filters.exerciseId ? eq(submissions.exerciseId, filters.exerciseId) : undefined,
        filters.questionId ? eq(submissions.questionId, filters.questionId) : undefined,
      ),
    );
  return rows.map((row) => teacherSubmissionSchema.parse(row));
}

export async function overrideSubmission(
  id: string,
  input: OverrideSubmissionRequest,
): Promise<TeacherSubmission> {
  const row = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, id), isNull(submissions.archivedAt)))
    .get();
  if (!row) throw new NotFoundError("Submission not found");
  await db
    .update(submissions)
    .set({
      status: "graded",
      score: input.score,
      verdict: input.verdict,
      feedback: input.feedback,
      gradedBy: "teacher",
      gradedAt: nowIso(),
    })
    .where(eq(submissions.id, id));
  await applyPoints(id);
  const updated = await db.select().from(submissions).where(eq(submissions.id, id)).get();
  if (!updated) throw new NotFoundError("Submission not found");
  return teacherSubmissionSchema.parse(updated);
}

// Unlock archives the old submission and leaves a fresh slot for a retake.
export async function unlockSubmission(id: string): Promise<TeacherSubmission> {
  const row = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, id), isNull(submissions.archivedAt)))
    .get();
  if (!row) throw new NotFoundError("Submission not found");

  const now = nowIso();
  await db.update(submissions).set({ archivedAt: now }).where(eq(submissions.id, id));
  const replacementId = newId();
  await db.insert(submissions).values({
    id: replacementId,
    exerciseId: row.exerciseId,
    questionId: row.questionId,
    studentId: row.studentId,
    answer: null,
    submittedAt: now,
    status: "grading",
    score: null,
    verdict: null,
    feedback: null,
    gradedBy: null,
    gradedAt: null,
    points: null,
    flagged: false,
    archivedAt: null,
  });
  const replacement = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, replacementId))
    .get();
  if (!replacement) throw new ConflictError("Unlock failed");
  return teacherSubmissionSchema.parse(replacement);
}
