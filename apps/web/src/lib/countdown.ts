// Student countdown announcements are banded so the per-second visual tick does
// not flood screen readers. Each band maps to a stable, localized string.
export type CountdownMilestone =
  | "underFiveMinutes"
  | "underOneMinute"
  | "thirtySecondsLeft"
  | "tenSecondsLeft"
  | null;

export function countdownMilestone(remainingSeconds: number | null): CountdownMilestone {
  if (remainingSeconds === null || remainingSeconds <= 0) return null;
  if (remainingSeconds <= 10) return "tenSecondsLeft";
  if (remainingSeconds <= 30) return "thirtySecondsLeft";
  if (remainingSeconds <= 60) return "underOneMinute";
  if (remainingSeconds <= 300) return "underFiveMinutes";
  return null;
}
