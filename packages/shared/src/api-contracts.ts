import { z } from "zod";
import { exerciseTypeSchema, optionSchema, roleSchema, verdictVisibilitySchema } from "./domain";

export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const validationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
  code: z.string().optional(),
});
export type ValidationIssue = z.infer<typeof validationIssueSchema>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    issues: z.array(validationIssueSchema).optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  db: z.literal("up"),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  role: roleSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const classSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: z.number().int(),
  archivedAt: z.string().nullable(),
});
export type ClassDto = z.infer<typeof classSchema>;

export const createClassRequestSchema = z.object({
  name: z.string().min(1).max(80),
  position: z.number().int().optional(),
});
export type CreateClassRequest = z.infer<typeof createClassRequestSchema>;

export const patchClassRequestSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    position: z.number().int().optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
export type PatchClassRequest = z.infer<typeof patchClassRequestSchema>;

export const studentSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  classId: z.string().nullable(),
  archivedAt: z.string().nullable(),
});
export type StudentDto = z.infer<typeof studentSchema>;

export const createStudentRequestSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9._-]+$/, "Use lowercase letters, digits, . _ or -"),
  displayName: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
  classId: z.string().min(1).nullable().optional(),
});
export type CreateStudentRequest = z.infer<typeof createStudentRequestSchema>;

export const createModuleRequestSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  position: z.number().int().optional(),
});
export type CreateModuleRequest = z.infer<typeof createModuleRequestSchema>;

export const patchModuleRequestSchema = z
  .object({
    title: z.string().min(1).max(160).optional(),
    description: z.string().max(2000).nullable().optional(),
    position: z.number().int().optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
export type PatchModuleRequest = z.infer<typeof patchModuleRequestSchema>;

export const createExerciseRequestSchema = z.object({
  moduleId: z.string().min(1),
  classId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  type: exerciseTypeSchema,
  verdictVisibility: verdictVisibilitySchema.optional(),
  opensAt: z.string().nullable().optional(),
  closesAt: z.string().nullable().optional(),
  speedWindowSeconds: z.number().int().positive().optional(),
  weightCorrect: z.number().min(0).max(1).optional(),
  weightSpeed: z.number().min(0).max(1).optional(),
});
export type CreateExerciseRequest = z.infer<typeof createExerciseRequestSchema>;

export const patchExerciseRequestSchema = z
  .object({
    moduleId: z.string().min(1).optional(),
    classId: z.string().min(1).optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(4000).nullable().optional(),
    verdictVisibility: verdictVisibilitySchema.optional(),
    opensAt: z.string().nullable().optional(),
    closesAt: z.string().nullable().optional(),
    speedWindowSeconds: z.number().int().positive().optional(),
    weightCorrect: z.number().min(0).max(1).optional(),
    weightSpeed: z.number().min(0).max(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
export type PatchExerciseRequest = z.infer<typeof patchExerciseRequestSchema>;

const questionBase = {
  prompt: z.string().min(1),
  points: z.number().int().positive().optional(),
};

export const createQuestionRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    ...questionBase,
    kind: z.literal("single_choice"),
    options: z.array(optionSchema).min(2),
    correctOptionId: z.string().min(1),
  }),
  z.object({
    ...questionBase,
    kind: z.literal("multi_select"),
    options: z.array(optionSchema).min(2),
    correctOptionIds: z.array(z.string().min(1)).min(1),
    partialCredit: z.boolean().optional(),
  }),
  z.object({
    ...questionBase,
    kind: z.literal("free_text"),
    modelAnswer: z.string().min(1),
    keyPoints: z.array(z.string().min(1)).optional(),
    aliases: z.array(z.string().min(1)).min(1),
  }),
]);
export type CreateQuestionRequest = z.infer<typeof createQuestionRequestSchema>;

export const patchQuestionRequestSchema = z
  .object({
    prompt: z.string().min(1).optional(),
    options: z.array(optionSchema).min(2).optional(),
    correctOptionId: z.string().min(1).optional(),
    correctOptionIds: z.array(z.string().min(1)).min(1).optional(),
    modelAnswer: z.string().min(1).optional(),
    keyPoints: z.array(z.string().min(1)).optional(),
    aliases: z.array(z.string().min(1)).optional(),
    points: z.number().int().positive().optional(),
    partialCredit: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
export type PatchQuestionRequest = z.infer<typeof patchQuestionRequestSchema>;

export const patchStudentRequestSchema = z
  .object({
    displayName: z.string().min(1).max(120).optional(),
    classId: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    password: z.string().min(8).max(200).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
export type PatchStudentRequest = z.infer<typeof patchStudentRequestSchema>;
