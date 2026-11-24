import {
  type Answer,
  deriveVerdict,
  type QuestionDto,
  SCORING_DEFAULTS,
  type Verdict,
} from "@jaweb/shared";
import { and, eq } from "drizzle-orm";

import { db } from "../db/client";
import { exercises, participations, questions, submissions } from "../db/schema";

// Deterministic grading for choice kinds; free text goes to the async queue.
export function gradeObjective(question: QuestionDto, answer: Answer): number | null {
  if (question.kind === "single_choice" && answer.kind === "single_choice") {
    return answer.optionId === question.correctOptionIds?.[0] ? 1 : 0;
  }
  if (question.kind === "multi_select" && answer.kind === "multi_select") {
    const correct = question.correctOptionIds ?? [];
    const selected = new Set(answer.optionIds);
    const correctSet = new Set(correct);
    const exact =
      selected.size === correctSet.size && [...selected].every((id) => correctSet.has(id));
    if (exact) return 1;
    if (!question.partialCredit || correct.length === 0) return 0;
    const hits = [...selected].filter((id) => correctSet.has(id)).length;
    const misses = selected.size - hits;
    return Math.max(0, Math.min(1, (hits - misses) / correct.length));
  }
  return null;
}

export function verdictFor(score: number): Verdict {
  return deriveVerdict(score);
}

type ExerciseWeights = { weightCorrect: number; weightSpeed: number; speedWindowSeconds: number };

export function pointsFor(
  exercise: ExerciseWeights,
  points: number,
  score: number,
  elapsedSeconds: number,
): number {
  const correctness = points * exercise.weightCorrect * score;
  const speedFactor =
    score > 0 ? Math.max(0, Math.min(1, 1 - elapsedSeconds / exercise.speedWindowSeconds)) : 0;
  const speed = points * exercise.weightSpeed * score * speedFactor;
  return Math.round(correctness + speed);
}

export const FAST_SUBMISSION_SECONDS = SCORING_DEFAULTS.fastSubmissionThresholdSeconds;

// §9.5 applied to every graded submission, deterministic and LLM alike.
export async function applyPoints(submissionId: string): Promise<void> {
  const row = await db
    .select({
      score: submissions.score,
      submittedAt: submissions.submittedAt,
      points: questions.points,
      startedAt: participations.startedAt,
      weightCorrect: exercises.weightCorrect,
      weightSpeed: exercises.weightSpeed,
      speedWindowSeconds: exercises.speedWindowSeconds,
    })
    .from(submissions)
    .innerJoin(questions, eq(submissions.questionId, questions.id))
    .innerJoin(exercises, eq(submissions.exerciseId, exercises.id))
    .innerJoin(
      participations,
      and(
        eq(participations.exerciseId, submissions.exerciseId),
        eq(participations.studentId, submissions.studentId),
      ),
    )
    .where(eq(submissions.id, submissionId))
    .get();
  if (!row || row.score === null) return;
  const elapsed = Math.max(0, (Date.parse(row.submittedAt) - Date.parse(row.startedAt)) / 1000);
  const points = pointsFor(row, row.points ?? 10, row.score, elapsed);
  await db.update(submissions).set({ points }).where(eq(submissions.id, submissionId));
}
