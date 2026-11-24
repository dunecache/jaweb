import {
  type Answer,
  deriveVerdict,
  type ExerciseDto,
  type QuestionDto,
  SCORING_DEFAULTS,
  type Verdict,
} from "@jaweb/shared";

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

export function pointsFor(
  exercise: ExerciseDto,
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
