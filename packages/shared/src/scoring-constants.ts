export const SCORING_DEFAULTS = {
  weightCorrect: 0.75,
  weightSpeed: 0.25,
  examWeightCorrect: 0.9,
  examWeightSpeed: 0.1,
  speedWindowSeconds: 120,
  fastSubmissionThresholdSeconds: 2,
  minGradingConfidence: 0.7,
} as const;
