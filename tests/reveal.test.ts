import { describe, expect, it } from "vitest";

import { revealSubmission } from "../apps/api/src/services/reveal";

// Structurally a SubmissionDto; tests resolve types through the API source,
// which owns the @jaweb/shared dependency.
const graded = {
  questionId: "q1",
  answer: { kind: "free_text" as const, text: "answer" },
  status: "graded" as const,
  submittedAt: "2026-01-01T00:00:00.000Z",
  score: 1,
  verdict: "correct" as const,
  feedback: "Good work",
  gradedBy: "teacher" as const,
  flagged: false,
};

describe("revealSubmission", () => {
  it("withholds only feedback for a live immediate exercise", () => {
    const revealed = revealSubmission(graded, "live", "immediate");
    expect(revealed.feedback).toBeNull();
    expect(revealed.score).toBe(1);
    expect(revealed.verdict).toBe("correct");
  });

  it("withholds score, verdict and feedback for a live at_close exercise", () => {
    const revealed = revealSubmission(graded, "live", "at_close");
    expect(revealed.feedback).toBeNull();
    expect(revealed.score).toBeNull();
    expect(revealed.verdict).toBeNull();
  });

  it("reveals everything once the exercise is closed", () => {
    expect(revealSubmission(graded, "closed", "at_close")).toEqual(graded);
  });
});
