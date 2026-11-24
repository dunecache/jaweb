import type { GradeResult } from "@jaweb/shared";

import type { GradeInput, GradeProvider } from "../provider";
import { parseGradeResult } from "../provider";

// Test-only provider: scripted responses let tests exercise retries and gates.
const queue: Array<string | GradeResult> = [];

export function queueFakeResponses(...items: Array<string | GradeResult>): void {
  queue.push(...items);
}

export function resetFakeResponses(): void {
  queue.length = 0;
}

export function fakeCalls(): number {
  return calls;
}

let calls = 0;
export let lastFakeInput: GradeInput | null = null;

export const fakeProvider: GradeProvider = {
  name: "fake",
  async grade(input: GradeInput) {
    calls += 1;
    lastFakeInput = input;
    const next = queue.shift();
    if (next === undefined) {
      return parseGradeResult({
        score: 0,
        verdict: "wrong",
        confidence: 0.9,
        feedback: "Not quite — review the key idea.",
      });
    }
    return typeof next === "string" ? parseGradeResult(JSON.parse(next)) : parseGradeResult(next);
  },
  async test() {
    return { ok: true, latencyMs: 1 };
  },
};
