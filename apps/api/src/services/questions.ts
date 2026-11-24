import {
  type CreateQuestionRequest,
  type PatchQuestionRequest,
  type QuestionDto,
  questionSchema,
  type StudentSafeQuestion,
  studentSafeQuestion,
} from "@jaweb/shared";
import { asc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { exercises, questions } from "../db/schema";
import { ConflictError, NotFoundError, ValidationError } from "../lib/errors";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/time";
import { getExercise } from "./exercises";

const questionColumns = {
  id: questions.id,
  exerciseId: questions.exerciseId,
  position: questions.position,
  prompt: questions.prompt,
  kind: questions.kind,
  options: questions.options,
  correctOptionIds: questions.correctOptionIds,
  modelAnswer: questions.modelAnswer,
  keyPoints: questions.keyPoints,
  aliases: questions.aliases,
  points: questions.points,
  partialCredit: questions.partialCredit,
  createdAt: questions.createdAt,
};

function toDto(row: typeof questions.$inferSelect): QuestionDto {
  return questionSchema.parse(row);
}

async function assertDraft(exerciseId: string): Promise<void> {
  const exercise = await getExercise(exerciseId);
  if (exercise.status !== "draft") throw new ConflictError("Questions are editable only in draft");
}

function assertAnswerKey(
  kind: QuestionDto["kind"],
  options: QuestionDto["options"],
  correctOptionIds: string[] | null,
): void {
  if (kind === "free_text" || !options || !correctOptionIds) return;
  const ids = new Set(options.map((option) => option.id));
  if (ids.size !== options.length) throw new ValidationError("Option ids must be unique");
  if (correctOptionIds.some((id) => !ids.has(id))) {
    throw new ValidationError("Correct options must be part of the options list");
  }
  if (kind === "single_choice" && correctOptionIds.length !== 1) {
    throw new ValidationError("A single-choice question needs exactly one correct option");
  }
}

export async function listQuestions(exerciseId: string): Promise<QuestionDto[]> {
  const rows = await db
    .select(questionColumns)
    .from(questions)
    .where(eq(questions.exerciseId, exerciseId))
    .orderBy(asc(questions.position));
  return rows.map(toDto);
}

export async function createQuestion(
  exerciseId: string,
  input: CreateQuestionRequest,
): Promise<QuestionDto> {
  await assertDraft(exerciseId);
  const existing = await db
    .select({ position: questions.position })
    .from(questions)
    .where(eq(questions.exerciseId, exerciseId));
  const row: typeof questions.$inferSelect = {
    id: newId(),
    exerciseId,
    position: Math.max(0, ...existing.map((item) => item.position)) + 1,
    prompt: input.prompt,
    kind: input.kind,
    options: input.kind === "free_text" ? null : input.options,
    correctOptionIds:
      input.kind === "single_choice"
        ? [input.correctOptionId]
        : input.kind === "multi_select"
          ? input.correctOptionIds
          : null,
    modelAnswer: input.kind === "free_text" ? input.modelAnswer : null,
    keyPoints: input.kind === "free_text" ? (input.keyPoints ?? []) : null,
    aliases: input.kind === "free_text" ? input.aliases : null,
    points: input.points ?? 10,
    partialCredit: input.kind === "multi_select" ? (input.partialCredit ?? false) : false,
    createdAt: nowIso(),
  };
  assertAnswerKey(row.kind, row.options, row.correctOptionIds);
  await db.insert(questions).values(row);
  return toDto(row);
}

export async function patchQuestion(id: string, input: PatchQuestionRequest): Promise<QuestionDto> {
  const row = await db.select(questionColumns).from(questions).where(eq(questions.id, id)).get();
  if (!row) throw new NotFoundError("Question not found");
  await assertDraft(row.exerciseId);

  const options = input.options === undefined ? row.options : input.options;
  const correctOptionIds =
    input.correctOptionId !== undefined
      ? [input.correctOptionId]
      : input.correctOptionIds === undefined
        ? row.correctOptionIds
        : input.correctOptionIds;
  const updated: QuestionDto = {
    ...toDto(row),
    prompt: input.prompt ?? row.prompt,
    options,
    correctOptionIds,
    modelAnswer: input.modelAnswer ?? row.modelAnswer,
    keyPoints: input.keyPoints ?? row.keyPoints,
    aliases: input.aliases ?? row.aliases,
    points: input.points ?? row.points,
    partialCredit: input.partialCredit ?? row.partialCredit,
  };
  assertAnswerKey(updated.kind, updated.options, updated.correctOptionIds);
  await db
    .update(questions)
    .set({
      prompt: updated.prompt,
      options: updated.options,
      correctOptionIds: updated.correctOptionIds,
      modelAnswer: updated.modelAnswer,
      keyPoints: updated.keyPoints,
      aliases: updated.aliases,
      points: updated.points,
      partialCredit: updated.partialCredit,
    })
    .where(eq(questions.id, id));
  return updated;
}

export async function deleteQuestion(id: string): Promise<void> {
  const row = await db
    .select({ exerciseId: questions.exerciseId })
    .from(questions)
    .where(eq(questions.id, id))
    .get();
  if (!row) throw new NotFoundError("Question not found");
  await assertDraft(row.exerciseId);
  await db.delete(questions).where(eq(questions.id, id));
}

// Teacher preview renders the exact student-safe payload (AGENTS §6).
export async function previewQuestions(exerciseId: string): Promise<StudentSafeQuestion[]> {
  const rows = await listQuestions(exerciseId);
  return rows.map(studentSafeQuestion);
}
