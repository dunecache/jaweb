const WINDOW_MS = 60_000;
const FAILURES_BEFORE_LOCKOUT = 5;
const MAX_MINUTES = 15;
const IP_CEILING = 30;

type UsernameState = { failures: number; lockedUntil: number };

export class LoginRateLimiter {
  private readonly usernames = new Map<string, UsernameState>();
  private readonly ipAttempts = new Map<string, number[]>();

  lockRemainingMs(username: string, nowMs = Date.now()): number {
    const state = this.usernames.get(username);
    if (!state) return 0;
    if (state.lockedUntil <= nowMs) {
      if (state.lockedUntil !== 0) this.usernames.set(username, { ...state, lockedUntil: 0 });
      return 0;
    }
    return state.lockedUntil - nowMs;
  }

  recordFailure(username: string, nowMs = Date.now()): void {
    const state = this.usernames.get(username) ?? { failures: 0, lockedUntil: 0 };
    state.failures += 1;
    if (state.failures >= FAILURES_BEFORE_LOCKOUT) {
      const minutes = Math.min(2 ** (state.failures - FAILURES_BEFORE_LOCKOUT), MAX_MINUTES);
      state.lockedUntil = nowMs + minutes * 60_000;
    }
    this.usernames.set(username, state);
  }

  reset(username: string): void {
    this.usernames.delete(username);
  }

  takeIpSlot(ip: string, nowMs = Date.now()): boolean {
    const recent = (this.ipAttempts.get(ip) ?? []).filter((at) => nowMs - at < WINDOW_MS);
    if (recent.length >= IP_CEILING) {
      this.ipAttempts.set(ip, recent);
      return false;
    }
    recent.push(nowMs);
    this.ipAttempts.set(ip, recent);
    return true;
  }
}

export const loginLimiter = new LoginRateLimiter();
