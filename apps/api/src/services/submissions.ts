import {
  type Answer,
  type ExerciseDto,
  type QuestionDto,
  type SubmissionDto,
  submissionDtoSchema,
} from "@jaweb/shared";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { submissions } from "../db/schema";
import { enqueueGrading } from "../grading/queue";
import { ConflictError } from "../lib/errors";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/time";
import { getParticipation, touchParticipation } from "./participations";
import { applyPoints, gradeObjective, verdictFor } from "./scoring";

export async function createSubmission(input: {
  exercise: ExerciseDto;
  question: QuestionDto;
  studentId: string;
  answer: Answer;
}): Promise<{ status: 201 | 202; submission: SubmissionDto }> {
  const { exercise, question, studentId, answer } = input;
  const existing = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.questionId, question.id),
        eq(submissions.studentId, studentId),
        isNull(submissions.archivedAt),
      ),
    )
    .get();
  if (existing) throw new ConflictError("You have already submitted this question");

  const participation =
    (await getParticipation(exercise.id, studentId)) ??
    (await touchParticipation(exercise.id, studentId));
  const submittedAt = nowIso();
  const flagged = Date.parse(submittedAt) - Date.parse(participation.startedAt) < 2_000;
  const score = gradeObjective(question, answer);

  const row = {
    id: newId(),
    exerciseId: exercise.id,
    questionId: question.id,
    studentId,
    answer,
    submittedAt,
    status: score === null ? ("grading" as const) : ("graded" as const),
    score,
    verdict: score === null ? null : verdictFor(score),
    feedback: null,
    gradedBy: score === null ? null : ("auto" as const),
    gradedAt: score === null ? null : submittedAt,
    flagged,
  };
  await db.insert(submissions).values(row);
  if (score === null) enqueueGrading(row.id);
  else await applyPoints(row.id);

  return {
    status: score === null ? 202 : 201,
    submission: submissionDtoSchema.parse({
      questionId: question.id,
      status: row.status,
      submittedAt: row.submittedAt,
      score: row.score,
      verdict: row.verdict,
      feedback: row.feedback,
      gradedBy: row.gradedBy,
      flagged: row.flagged,
    }),
  };
}

export async function mySubmissions(exerciseId: string, studentId: string) {
  const rows = await db
    .select({
      questionId: submissions.questionId,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      score: submissions.score,
      verdict: submissions.verdict,
      feedback: submissions.feedback,
      gradedBy: submissions.gradedBy,
      flagged: submissions.flagged,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.exerciseId, exerciseId),
        eq(submissions.studentId, studentId),
        isNull(submissions.archivedAt),
      ),
    );
  return rows.map((row) => submissionDtoSchema.parse(row));
}
