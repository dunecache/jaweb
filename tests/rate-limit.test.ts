import { describe, expect, it } from "vitest";

import { LoginRateLimiter } from "../apps/api/src/lib/rate-limit";

describe("login rate limiter", () => {
  it("locks a username for one minute after five failures and doubles the backoff", () => {
    const limiter = new LoginRateLimiter();
    const start = 1_000_000;
    for (let i = 0; i < 4; i += 1) limiter.recordFailure("student", start);
    expect(limiter.lockRemainingMs("student", start)).toBe(0);
    limiter.recordFailure("student", start);
    expect(limiter.lockRemainingMs("student", start)).toBe(60_000);
    limiter.recordFailure("student", start);
    expect(limiter.lockRemainingMs("student", start)).toBe(120_000);
  });

  it("caps the backoff at 15 minutes", () => {
    const limiter = new LoginRateLimiter();
    for (let i = 0; i < 15; i += 1) limiter.recordFailure("student", 0);
    expect(limiter.lockRemainingMs("student", 0)).toBe(15 * 60_000);
  });

  it("clears the lockout on success and after expiry", () => {
    const limiter = new LoginRateLimiter();
    for (let i = 0; i < 5; i += 1) limiter.recordFailure("student", 0);
    limiter.reset("student");
    expect(limiter.lockRemainingMs("student", 0)).toBe(0);
    for (let i = 0; i < 5; i += 1) limiter.recordFailure("student", 0);
    expect(limiter.lockRemainingMs("student", 61_000)).toBe(0);
  });

  it("allows 30 attempts per IP per minute, then rejects", () => {
    const limiter = new LoginRateLimiter();
    for (let i = 0; i < 30; i += 1) expect(limiter.takeIpSlot("10.0.0.1", 0)).toBe(true);
    expect(limiter.takeIpSlot("10.0.0.1", 1)).toBe(false);
    expect(limiter.takeIpSlot("10.0.0.2", 1)).toBe(true);
    expect(limiter.takeIpSlot("10.0.0.1", 60_000)).toBe(true);
  });
});
