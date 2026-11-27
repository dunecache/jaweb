export const SCORING_DEFAULTS = {
  // Speed no longer affects points. These columns remain in the data model for
  // backwards compatibility; new exercises store a correctness-only config.
  weightCorrect: 1,
  weightSpeed: 0,
  examWeightCorrect: 1,
  examWeightSpeed: 0,
  speedWindowSeconds: 120,
  fastSubmissionThresholdSeconds: 2,
  minGradingConfidence: 0.7,
} as const;
