import type { SubmissionDto } from "@jaweb/shared";

// AGENTS §9.7: feedback is never student-visible while an exercise is live.
// verdict_visibility='at_close' additionally hides score and verdict until
// close. Both the live and history student routes use this single filter.
export function revealSubmission(
  row: SubmissionDto,
  exerciseStatus: string,
  visibility: string,
): SubmissionDto {
  if (exerciseStatus === "closed") return row;
  return {
    ...row,
    feedback: null,
    ...(visibility === "at_close" ? { score: null, verdict: null } : {}),
  };
}
