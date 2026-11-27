import { aliasesMatch, answerSchema, SCORING_DEFAULTS } from "@jaweb/shared";
import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { questions, submissions } from "../db/schema";
import type { GradeInput } from "../grading/provider";
import { providerFrom, resolveSettings } from "../grading/provider-settings";
import { nowIso } from "../lib/time";
import { applyPoints } from "./scoring";

async function mark(
  id: string,
  values: {
    status: "graded" | "needs_review";
    score: number | null;
    verdict: "correct" | "partial" | "wrong" | null;
    feedback: string;
    gradedBy: "auto" | "llm" | null;
  },
): Promise<void> {
  await db
    .update(submissions)
    .set({ ...values, gradedAt: nowIso() })
    .where(eq(submissions.id, id));
}

export async function gradeSubmissionById(id: string): Promise<void> {
  const row = await db
    .select({
      submissionId: submissions.id,
      status: submissions.status,
      archivedAt: submissions.archivedAt,
      answer: submissions.answer,
      prompt: questions.prompt,
      modelAnswer: questions.modelAnswer,
      keyPoints: questions.keyPoints,
      aliases: questions.aliases,
    })
    .from(submissions)
    .innerJoin(questions, eq(submissions.questionId, questions.id))
    .where(eq(submissions.id, id))
    .get();
  if (!row || row.status !== "grading" || row.archivedAt) return;

  const parsed = answerSchema.safeParse(row.answer);
  if (!parsed.success || parsed.data.kind !== "free_text") {
    await mark(id, {
      status: "needs_review",
      score: null,
      verdict: null,
      feedback: "Unparsable answer — needs review.",
      gradedBy: null,
    });
    return;
  }

  if (aliasesMatch(parsed.data.text, row.aliases ?? [])) {
    await mark(id, {
      status: "graded",
      score: 1,
      verdict: "correct",
      feedback: "Accepted answer.",
      gradedBy: "auto",
    });
    await applyPoints(id);
    return;
  }

  const settings = await resolveSettings();
  const provider = providerFrom(settings);
  if (!provider) {
    await mark(id, {
      status: "needs_review",
      score: null,
      verdict: null,
      feedback: "Grader not configured — needs review.",
      gradedBy: null,
    });
    return;
  }

  const input: GradeInput = {
    question: row.prompt,
    modelAnswer: row.modelAnswer ?? "",
    keyPoints: row.keyPoints ?? [],
    answer: parsed.data.text,
  };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await provider.grade(input);
      if (result.confidence < SCORING_DEFAULTS.minGradingConfidence) {
        await mark(id, {
          status: "needs_review",
          score: null,
          verdict: null,
          feedback: result.feedback || "Low confidence — needs review.",
          gradedBy: null,
        });
        return;
      }
      await mark(id, {
        status: "graded",
        score: result.score,
        verdict: result.verdict,
        feedback: result.feedback,
        gradedBy: "llm",
      });
      await applyPoints(id);
      return;
    } catch (error) {
      if (attempt === 2) {
        const note = error instanceof Error ? error.message : "Unknown grading error";
        await mark(id, {
          status: "needs_review",
          score: null,
          verdict: null,
          feedback: `Grading failed after 2 retries: ${note}`.slice(0, 240),
          gradedBy: null,
        });
        return;
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 200 * (attempt + 1)));
    }
  }
}
