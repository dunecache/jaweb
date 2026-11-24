import { z } from "zod";

export const roleSchema = z.enum(["teacher", "student"]);
export type Role = z.infer<typeof roleSchema>;

export const questionKindSchema = z.enum(["single_choice", "multi_select", "free_text"]);
export type QuestionKind = z.infer<typeof questionKindSchema>;

export const exerciseTypeSchema = z.enum(["exercise", "exam"]);
export type ExerciseType = z.infer<typeof exerciseTypeSchema>;

export const exerciseStatusSchema = z.enum(["draft", "scheduled", "live", "closed"]);
export type ExerciseStatus = z.infer<typeof exerciseStatusSchema>;

export const verdictVisibilitySchema = z.enum(["immediate", "at_close"]);
export type VerdictVisibility = z.infer<typeof verdictVisibilitySchema>;

export const submissionStatusSchema = z.enum(["grading", "graded", "needs_review"]);
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

export const gradedBySchema = z.enum(["auto", "llm", "teacher"]);
export type GradedBy = z.infer<typeof gradedBySchema>;

export const verdictSchema = z.enum(["correct", "partial", "wrong"]);
export type Verdict = z.infer<typeof verdictSchema>;

export const providerNameSchema = z.enum([
  "google",
  "opencode",
  "openai",
  "anthropic",
  "openrouter",
  "ollama",
  "fake",
]);
export type ProviderName = z.infer<typeof providerNameSchema>;

export const leaderboardVisibilitySchema = z.enum(["full", "top10_self", "hidden"]);
export type LeaderboardVisibility = z.infer<typeof leaderboardVisibilitySchema>;

export const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export type Option = z.infer<typeof optionSchema>;

export const singleChoiceAnswerSchema = z.object({
  kind: z.literal("single_choice"),
  optionId: z.string().min(1),
});

export const multiSelectAnswerSchema = z.object({
  kind: z.literal("multi_select"),
  optionIds: z.array(z.string().min(1)),
});

export const freeTextAnswerSchema = z.object({
  kind: z.literal("free_text"),
  text: z.string(),
});

export const answerSchema = z.discriminatedUnion("kind", [
  singleChoiceAnswerSchema,
  multiSelectAnswerSchema,
  freeTextAnswerSchema,
]);
export type Answer = z.infer<typeof answerSchema>;

export const gradeResultSchema = z.object({
  score: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
  verdict: verdictSchema,
  confidence: z.number().min(0).max(1),
  feedback: z.string().max(240),
});
export type GradeResult = z.infer<typeof gradeResultSchema>;
