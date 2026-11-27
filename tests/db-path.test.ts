import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { repoRoot, resolveDatabaseUrl } from "../apps/api/src/lib/paths";

describe("local database URL resolution", () => {
  it("anchors relative file URLs to the repo root", () => {
    // Vitest runs from the repo root, so this is the DB that db:migrate seeds.
    expect(repoRoot).toBe(process.cwd());
    expect(resolveDatabaseUrl("file:./local.db")).toBe(
      `file:${resolve(process.cwd(), "local.db")}`,
    );
    expect(resolveDatabaseUrl("file:../other.db")).toBe(`file:${resolve(repoRoot, "../other.db")}`);
  });

  it("leaves remote and in-memory URLs untouched", () => {
    expect(resolveDatabaseUrl("libsql://example.turso.io")).toBe("libsql://example.turso.io");
    expect(resolveDatabaseUrl("file::memory:")).toBe("file::memory:");
  });
});
