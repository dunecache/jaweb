import { describe, expect, it } from "vitest";

import { countdownMilestone } from "../apps/web/src/lib/countdown";

describe("countdownMilestone", () => {
  it("stays silent before five minutes and after close", () => {
    expect(countdownMilestone(null)).toBeNull();
    expect(countdownMilestone(0)).toBeNull();
    expect(countdownMilestone(-5)).toBeNull();
    expect(countdownMilestone(301)).toBeNull();
  });

  it("announces a stable string within each band", () => {
    expect(countdownMilestone(300)).toBe("underFiveMinutes");
    expect(countdownMilestone(120)).toBe("underFiveMinutes");
    expect(countdownMilestone(60)).toBe("underOneMinute");
    expect(countdownMilestone(31)).toBe("underOneMinute");
    expect(countdownMilestone(30)).toBe("thirtySecondsLeft");
    expect(countdownMilestone(11)).toBe("thirtySecondsLeft");
    expect(countdownMilestone(10)).toBe("tenSecondsLeft");
    expect(countdownMilestone(1)).toBe("tenSecondsLeft");
  });
});
