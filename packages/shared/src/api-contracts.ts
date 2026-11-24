import { z } from "zod";
import { roleSchema } from "./domain";

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
  classId: z.string().nullable().optional(),
});
export type CreateStudentRequest = z.infer<typeof createStudentRequestSchema>;

export const patchStudentRequestSchema = z
  .object({
    displayName: z.string().min(1).max(120).optional(),
    classId: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    password: z.string().min(8).max(200).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");
export type PatchStudentRequest = z.infer<typeof patchStudentRequestSchema>;
