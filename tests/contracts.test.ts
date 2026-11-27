import { describe, expect, it } from "vitest";

import {
  answerSchema,
  errorEnvelopeSchema,
  healthResponseSchema,
  loginRequestSchema,
} from "../packages/shared/src/index";

describe("frozen v1 contracts", () => {
  it("parses a valid login request", () => {
    expect(loginRequestSchema.parse({ username: "teacher", password: "secret" })).toEqual({
      username: "teacher",
      password: "secret",
    });
  });

  it("rejects an empty username", () => {
    expect(loginRequestSchema.safeParse({ username: "", password: "x" }).success).toBe(false);
  });

  it("parses the health response", () => {
    expect(healthResponseSchema.parse({ ok: true, db: "up" })).toEqual({ ok: true, db: "up" });
    expect(healthResponseSchema.safeParse({ ok: false, db: "up" }).success).toBe(false);
  });

  it("discriminates all three answer kinds", () => {
    expect(answerSchema.parse({ kind: "single_choice", optionId: "a" })).toMatchObject({
      kind: "single_choice",
    });
    expect(answerSchema.parse({ kind: "multi_select", optionIds: ["a", "b"] })).toMatchObject({
      kind: "multi_select",
    });
    expect(answerSchema.parse({ kind: "free_text", text: "الجواب" })).toMatchObject({
      kind: "free_text",
    });
  });

  it("validates the error envelope", () => {
    expect(
      errorEnvelopeSchema.parse({ error: { code: "CONFLICT", message: "Already live" } }),
    ).toMatchObject({ error: { code: "CONFLICT" } });
    expect(errorEnvelopeSchema.safeParse({ error: { code: "NOPE", message: "x" } }).success).toBe(
      false,
    );
  });
});
