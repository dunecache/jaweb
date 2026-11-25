import { afterEach, describe, expect, it } from "vitest";

import { isVercel, ollamaAvailable } from "../apps/api/src/lib/runtime";

const originalVercel = process.env.VERCEL;

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

describe("Vercel runtime detection", () => {
  it("offers Ollama for local/self-hosted instances", () => {
    delete process.env.VERCEL;
    expect(isVercel()).toBe(false);
    expect(ollamaAvailable()).toBe(true);
  });

  it("disables Ollama on Vercel", () => {
    process.env.VERCEL = "1";
    expect(isVercel()).toBe(true);
    expect(ollamaAvailable()).toBe(false);
  });
});
