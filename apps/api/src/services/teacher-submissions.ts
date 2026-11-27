import {
  deriveVerdict,
  type OverrideSubmissionRequest,
  type TeacherSubmission,
  teacherSubmissionSchema,
} from "@jaweb/shared";
import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { exercises, questions, submissions, users } from "../db/schema";
import { ConflictError, NotFoundError } from "../lib/errors";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/time";
import { syncLifecycle } from "./lifecycle";
import { applyPoints } from "./scoring";

const teacherSubmissionColumns = {
  id: submissions.id,
  exerciseId: submissions.exerciseId,
  questionId: submissions.questionId,
  studentId: submissions.studentId,
  exerciseStatus: exercises.status,
  exerciseTitle: exercises.title,
  questionPrompt: questions.prompt,
  questionPoints: questions.points,
  studentUsername: users.username,
  studentDisplayName: users.displayName,
  answer: submissions.answer,
  submittedAt: submissions.submittedAt,
  status: submissions.status,
  score: submissions.score,
  verdict: submissions.verdict,
  feedback: submissions.feedback,
  gradedBy: submissions.gradedBy,
  gradedAt: submissions.gradedAt,
  points: submissions.points,
  flagged: submissions.flagged,
};

// Every teacher-facing read goes through the same enriched shape: a bare
// submissions row lacks the question/student/exercise context reviewers need.
async function getTeacherSubmission(id: string): Promise<TeacherSubmission | undefined> {
  const row = await db
    .select(teacherSubmissionColumns)
    .from(submissions)
    .innerJoin(questions, eq(submissions.questionId, questions.id))
    .innerJoin(exercises, eq(submissions.exerciseId, exercises.id))
    .innerJoin(users, eq(submissions.studentId, users.id))
    .where(and(eq(submissions.id, id), isNull(submissions.archivedAt)))
    .get();
  return row ? teacherSubmissionSchema.parse(row) : undefined;
}

export async function listTeacherSubmissions(filters: {
  exerciseId?: string;
  questionId?: string;
  studentId?: string;
}): Promise<TeacherSubmission[]> {
  // Live/history filters must reflect computed status, not a stale cache (§6).
  await syncLifecycle();
  const rows = await db
    .select(teacherSubmissionColumns)
    .from(submissions)
    .innerJoin(questions, eq(submissions.questionId, questions.id))
    .innerJoin(exercises, eq(submissions.exerciseId, exercises.id))
    .innerJoin(users, eq(submissions.studentId, users.id))
    .where(
      and(
        isNull(submissions.archivedAt),
        filters.exerciseId ? eq(submissions.exerciseId, filters.exerciseId) : undefined,
        filters.questionId ? eq(submissions.questionId, filters.questionId) : undefined,
        filters.studentId ? eq(submissions.studentId, filters.studentId) : undefined,
      ),
    )
    .orderBy(asc(submissions.submittedAt));
  return rows.map((row) => teacherSubmissionSchema.parse(row));
}

export async function overrideSubmission(
  id: string,
  input: OverrideSubmissionRequest,
): Promise<TeacherSubmission> {
  const row = await getTeacherSubmission(id);
  if (!row) throw new NotFoundError("Submission not found");
  // A background grader may still be working on this row; overriding it now
  // would be silently replaced by the grader's result (AGENTS §7.4).
  if (row.status === "grading") {
    throw new ConflictError("Submission is still being graded");
  }
  await db
    .update(submissions)
    .set({
      status: "graded",
      score: input.score,
      verdict: deriveVerdict(input.score),
      feedback: input.feedback,
      gradedBy: "teacher",
      gradedAt: nowIso(),
    })
    .where(eq(submissions.id, id));
  await applyPoints(id);
  const updated = await getTeacherSubmission(id);
  if (!updated) throw new NotFoundError("Submission not found");
  return updated;
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
  const replacement = await getTeacherSubmission(replacementId);
  if (!replacement) throw new ConflictError("Unlock failed");
  return replacement;
}
