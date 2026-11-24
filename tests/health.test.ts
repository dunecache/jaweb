import { describe, expect, it } from "vitest";

import { app } from "../apps/api/src/index";

describe("GET /api/health", () => {
  it("reports ok with a database check", async () => {
    const response = await app.request("/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, db: "up" });
  });

  it("attaches a request id", async () => {
    const response = await app.request("/api/health", {
      headers: { "x-request-id": "test-request-id" },
    });
    expect(response.headers.get("x-request-id")).toBe("test-request-id");
  });

  it("uses the error envelope for unknown routes", async () => {
    const response = await app.request("/api/does-not-exist");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });
  });
});
