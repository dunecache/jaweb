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

export const moduleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  position: z.number().int(),
  archivedAt: z.string().nullable(),
});
export type ModuleDto = z.infer<typeof moduleSchema>;

export const exerciseSchema = z.object({
  id: z.string().min(1),
  moduleId: z.string().min(1),
  classId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  type: exerciseTypeSchema,
  status: exerciseStatusSchema,
  verdictVisibility: verdictVisibilitySchema,
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  speedWindowSeconds: z.number().int(),
  weightCorrect: z.number(),
  weightSpeed: z.number(),
  createdBy: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExerciseDto = z.infer<typeof exerciseSchema>;

export const questionSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  position: z.number().int(),
  prompt: z.string().min(1),
  kind: questionKindSchema,
  options: z.array(optionSchema).nullable(),
  correctOptionIds: z.array(z.string()).nullable(),
  modelAnswer: z.string().nullable(),
  keyPoints: z.array(z.string()).nullable(),
  aliases: z.array(z.string()).nullable(),
  points: z.number().int(),
  partialCredit: z.boolean(),
  createdAt: z.string(),
});
export type QuestionDto = z.infer<typeof questionSchema>;

// The only question fields a student route may ever see (AGENTS §6).
export const studentSafeQuestionSchema = z.object({
  id: z.string().min(1),
  position: z.number().int(),
  prompt: z.string().min(1),
  kind: questionKindSchema,
  options: z.array(optionSchema).nullable(),
  points: z.number().int(),
});
export type StudentSafeQuestion = z.infer<typeof studentSafeQuestionSchema>;

export function studentSafeQuestion(question: QuestionDto): StudentSafeQuestion {
  return studentSafeQuestionSchema.parse({
    id: question.id,
    position: question.position,
    prompt: question.prompt,
    kind: question.kind,
    options: question.options,
    points: question.points,
  });
}

export const safeExerciseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  type: exerciseTypeSchema,
  status: exerciseStatusSchema,
  verdictVisibility: verdictVisibilitySchema,
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  speedWindowSeconds: z.number().int(),
});
export type SafeExercise = z.infer<typeof safeExerciseSchema>;

export const submissionDtoSchema = z.object({
  questionId: z.string().min(1),
  status: submissionStatusSchema,
  submittedAt: z.string(),
  score: z.number().min(0).max(1).nullable(),
  verdict: verdictSchema.nullable(),
  feedback: z.string().nullable(),
  gradedBy: gradedBySchema.nullable(),
  flagged: z.boolean(),
});
export type SubmissionDto = z.infer<typeof submissionDtoSchema>;

export const leaderboardEntrySchema = z.object({
  rank: z.number().int(),
  studentId: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  points: z.number().int(),
  gradedCount: z.number().int(),
  pendingCount: z.number().int(),
  lastSubmissionAt: z.string().nullable(),
  isSelf: z.boolean(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const leaderboardSchema = z.object({
  scope: z.enum(["live", "all", "exercise"]),
  activityOnly: z.boolean(),
  visibility: leaderboardVisibilitySchema,
  entries: z.array(leaderboardEntrySchema),
  rev: z.string(),
});
export type Leaderboard = z.infer<typeof leaderboardSchema>;

export const historySummarySchema = z.object({
  exerciseId: z.string().min(1),
  title: z.string().min(1),
  status: exerciseStatusSchema,
  closedAt: z.string().nullable(),
  myPoints: z.number().int(),
  questionCount: z.number().int(),
  submittedCount: z.number().int(),
});
export type HistorySummary = z.infer<typeof historySummarySchema>;

export const historyListSchema = z.object({
  exercises: z.array(historySummarySchema),
  rev: z.string(),
});
export type HistoryList = z.infer<typeof historyListSchema>;

export const historyDetailSchema = z.object({
  exerciseId: z.string().min(1),
  title: z.string().min(1),
  status: exerciseStatusSchema,
  questions: z.array(
    z.object({
      id: z.string().min(1),
      position: z.number().int(),
      prompt: z.string(),
      kind: questionKindSchema,
      options: z.array(optionSchema).nullable(),
      points: z.number().int(),
      revealed: z.boolean(),
      correctOptionIds: z.array(z.string()).nullable(),
      modelAnswer: z.string().nullable(),
    }),
  ),
  submissions: z.array(submissionDtoSchema),
  rev: z.string(),
});
export type HistoryDetail = z.infer<typeof historyDetailSchema>;

export const monitorCellSchema = z.enum([
  "not_opened",
  "opened",
  "submitted",
  "grading",
  "graded",
  "needs_review",
]);
export type MonitorCell = z.infer<typeof monitorCellSchema>;

export const monitorRowSchema = z.object({
  studentId: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  cells: z.record(z.string(), monitorCellSchema),
  lastSeenAt: z.string().nullable(),
});
export type MonitorRow = z.infer<typeof monitorRowSchema>;

export const monitorSchema = z.object({
  exerciseId: z.string().min(1),
  questions: z.array(
    z.object({ id: z.string().min(1), position: z.number().int(), prompt: z.string() }),
  ),
  roster: z.array(monitorRowSchema),
  counts: z.object({
    submitted: z.number().int(),
    grading: z.number().int(),
    needsReview: z.number().int(),
    graded: z.number().int(),
    missing: z.number().int(),
  }),
  medianSeconds: z.number().nullable(),
  flagged: z.array(
    z.object({
      submissionId: z.string().min(1),
      username: z.string().min(1),
      questionId: z.string().min(1),
      submittedAt: z.string(),
    }),
  ),
  rev: z.string(),
});
export type Monitor = z.infer<typeof monitorSchema>;

export const teacherSubmissionSchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  questionId: z.string().min(1),
  studentId: z.string().min(1),
  answer: answerSchema.nullable(),
  submittedAt: z.string(),
  status: submissionStatusSchema,
  score: z.number().min(0).max(1).nullable(),
  verdict: verdictSchema.nullable(),
  feedback: z.string().nullable(),
  gradedBy: gradedBySchema.nullable(),
  gradedAt: z.string().nullable(),
  points: z.number().int().nullable(),
  flagged: z.boolean(),
});
export type TeacherSubmission = z.infer<typeof teacherSubmissionSchema>;

export function deriveVerdict(score: number): Verdict {
  return score >= 1 ? "correct" : score > 0 ? "partial" : "wrong";
}

export const gradeResultSchema = z.object({
  score: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
  verdict: verdictSchema,
  confidence: z.number().min(0).max(1),
  feedback: z.string().max(240),
});
export type GradeResult = z.infer<typeof gradeResultSchema>;
