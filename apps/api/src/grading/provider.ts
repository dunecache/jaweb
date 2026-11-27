import { type GradeResult, gradeResultSchema } from "@jaweb/shared";

export type GradeInput = {
  question: string;
  modelAnswer: string;
  keyPoints: string[];
  answer: string;
};

export interface GradeProvider {
  readonly name: string;
  grade(input: GradeInput): Promise<GradeResult>;
  test(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

export function parseGradeResult(raw: unknown): GradeResult {
  return gradeResultSchema.parse(raw);
}

export function parseJsonText(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function timedTest(
  run: () => Promise<void>,
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    await run();
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
