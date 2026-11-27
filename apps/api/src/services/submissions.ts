import {
  type Answer,
  aliasesMatch,
  type ExerciseDto,
  type QuestionDto,
  type SubmissionDto,
  submissionDtoSchema,
} from "@jaweb/shared";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { submissions } from "../db/schema";
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
}): Promise<{ status: 201; submission: SubmissionDto }> {
  const { exercise, question, studentId, answer } = input;
  const existing = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.questionId, question.id),
        eq(submissions.studentId, studentId),
        isNull(submissions.archivedAt),
      ),
    )
    .get();
  // A teacher unlock leaves a reserved retake slot (answer=null, status=grading).
  // Fill that row instead of inserting a conflicting one — the partial unique
  // index on (question, student) would otherwise turn every retake into a 409.
  if (existing && (existing.answer !== null || existing.status !== "grading")) {
    throw new ConflictError("You have already submitted this question");
  }

  const participation =
    (await getParticipation(exercise.id, studentId)) ??
    (await touchParticipation(exercise.id, studentId));
  const submittedAt = nowIso();
  const flagged = Date.parse(submittedAt) - Date.parse(participation.startedAt) < 2_000;
  // §9.3: a normalized alias match is an automatic correct answer even with no
  // LLM provider configured — it must not fall through to the review queue.
  const aliasMatch =
    answer.kind === "free_text" && aliasesMatch(answer.text, question.aliases ?? []);
  const score = gradeObjective(question, answer) ?? (aliasMatch ? 1 : null);
  // LLM grading is disabled for now: other typed answers wait for a teacher
  // override instead of entering the background queue (§9.3 review path).
  const needsReview = score === null;

  const row = {
    id: existing?.id ?? newId(),
    exerciseId: exercise.id,
    questionId: question.id,
    studentId,
    answer,
    submittedAt,
    status: needsReview ? ("needs_review" as const) : ("graded" as const),
    score,
    verdict: needsReview ? null : verdictFor(score),
    feedback: needsReview
      ? "Pending teacher review — automatic grading is off."
      : aliasMatch
        ? "Accepted answer."
        : null,
    gradedBy: needsReview ? null : ("auto" as const),
    gradedAt: needsReview ? null : submittedAt,
    flagged,
  };
  if (existing) {
    const { id, ...values } = row;
    await db.update(submissions).set(values).where(eq(submissions.id, id));
  } else {
    await db.insert(submissions).values(row);
  }
  if (!needsReview) await applyPoints(row.id);

  return {
    status: 201,
    submission: submissionDtoSchema.parse({
      questionId: question.id,
      answer: row.answer,
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
      answer: submissions.answer,
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
