import {
  type Answer,
  deriveVerdict,
  type QuestionDto,
  SCORING_DEFAULTS,
  type Verdict,
} from "@jaweb/shared";
import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { questions, submissions } from "../db/schema";

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

// Points reward correctness only. Elapsed time is still recorded for the
// monitor and used as a leaderboard tie-break, but never changes the award:
// a correct answer is always worth the question's full points.
export function pointsFor(points: number, score: number): number {
  return Math.round(points * score);
}

export const FAST_SUBMISSION_SECONDS = SCORING_DEFAULTS.fastSubmissionThresholdSeconds;

// §9.5 applied to every graded submission, deterministic and LLM alike.
export async function applyPoints(submissionId: string): Promise<void> {
  const row = await db
    .select({ score: submissions.score, points: questions.points })
    .from(submissions)
    .innerJoin(questions, eq(submissions.questionId, questions.id))
    .where(eq(submissions.id, submissionId))
    .get();
  if (!row || row.score === null) return;
  await db
    .update(submissions)
    .set({ points: pointsFor(row.points ?? 10, row.score) })
    .where(eq(submissions.id, submissionId));
}
