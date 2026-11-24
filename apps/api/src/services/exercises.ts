import {
  type CreateExerciseRequest,
  type ExerciseDto,
  type ExerciseStatus,
  exerciseSchema,
  type PatchExerciseRequest,
  SCORING_DEFAULTS,
  type ValidationIssue,
} from "@jaweb/shared";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { classes, exercises, modules, questions, type users } from "../db/schema";
import { ConflictError, ValidationError } from "../lib/errors";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/time";

const exerciseColumns = {
  id: exercises.id,
  moduleId: exercises.moduleId,
  classId: exercises.classId,
  title: exercises.title,
  description: exercises.description,
  type: exercises.type,
  status: exercises.status,
  verdictVisibility: exercises.verdictVisibility,
  opensAt: exercises.opensAt,
  closesAt: exercises.closesAt,
  speedWindowSeconds: exercises.speedWindowSeconds,
  weightCorrect: exercises.weightCorrect,
  weightSpeed: exercises.weightSpeed,
  createdBy: exercises.createdBy,
  createdAt: exercises.createdAt,
  updatedAt: exercises.updatedAt,
};

type ExerciseRow = typeof exercises.$inferSelect;

function toDto(row: ExerciseRow): ExerciseDto {
  return exerciseSchema.parse(row);
}

async function assertActive(
  table: typeof modules | typeof classes | typeof users,
  id: string,
): Promise<void> {
  const row = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), isNull(table.archivedAt)))
    .get();
  if (!row) throw new ValidationError("Referenced entity does not exist or is archived");
}

export async function listExercises(
  filters: { moduleId?: string; status?: ExerciseStatus } = {},
): Promise<ExerciseDto[]> {
  const rows = await db
    .select(exerciseColumns)
    .from(exercises)
    .where(
      and(
        filters.moduleId ? eq(exercises.moduleId, filters.moduleId) : undefined,
        filters.status ? eq(exercises.status, filters.status) : undefined,
      ),
    );
  return rows.map(toDto);
}

export async function getExercise(id: string): Promise<ExerciseDto> {
  const row = await db.select(exerciseColumns).from(exercises).where(eq(exercises.id, id)).get();
  if (!row) throw new ConflictError("Exercise not found");
  return toDto(row);
}

export async function createExercise(
  input: CreateExerciseRequest,
  teacherId: string,
): Promise<ExerciseDto> {
  await assertActive(modules, input.moduleId);
  await assertActive(classes, input.classId);
  const isExam = input.type === "exam";
  const row: ExerciseRow = {
    id: newId(),
    moduleId: input.moduleId,
    classId: input.classId,
    title: input.title,
    description: input.description ?? null,
    type: input.type,
    status: "draft",
    verdictVisibility: input.verdictVisibility ?? (isExam ? "at_close" : "immediate"),
    opensAt: input.opensAt ?? null,
    closesAt: input.closesAt ?? null,
    speedWindowSeconds: input.speedWindowSeconds ?? SCORING_DEFAULTS.speedWindowSeconds,
    weightCorrect:
      input.weightCorrect ??
      (isExam ? SCORING_DEFAULTS.examWeightCorrect : SCORING_DEFAULTS.weightCorrect),
    weightSpeed:
      input.weightSpeed ??
      (isExam ? SCORING_DEFAULTS.examWeightSpeed : SCORING_DEFAULTS.weightSpeed),
    createdBy: teacherId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.insert(exercises).values(row);
  return toDto(row);
}

export async function patchExercise(id: string, input: PatchExerciseRequest): Promise<ExerciseDto> {
  const current = await getExercise(id);
  if (current.status !== "draft") throw new ConflictError("Only draft exercises are editable");
  if (input.moduleId) await assertActive(modules, input.moduleId);
  if (input.classId) await assertActive(classes, input.classId);

  const updated: ExerciseDto = {
    ...current,
    moduleId: input.moduleId ?? current.moduleId,
    classId: input.classId ?? current.classId,
    title: input.title ?? current.title,
    description: input.description === undefined ? current.description : input.description,
    verdictVisibility: input.verdictVisibility ?? current.verdictVisibility,
    opensAt: input.opensAt === undefined ? current.opensAt : input.opensAt,
    closesAt: input.closesAt === undefined ? current.closesAt : input.closesAt,
    speedWindowSeconds: input.speedWindowSeconds ?? current.speedWindowSeconds,
    weightCorrect: input.weightCorrect ?? current.weightCorrect,
    weightSpeed: input.weightSpeed ?? current.weightSpeed,
    updatedAt: nowIso(),
  };
  await db
    .update(exercises)
    .set({
      moduleId: updated.moduleId,
      classId: updated.classId,
      title: updated.title,
      description: updated.description,
      verdictVisibility: updated.verdictVisibility,
      opensAt: updated.opensAt,
      closesAt: updated.closesAt,
      speedWindowSeconds: updated.speedWindowSeconds,
      weightCorrect: updated.weightCorrect,
      weightSpeed: updated.weightSpeed,
      updatedAt: updated.updatedAt,
    })
    .where(eq(exercises.id, id));
  return updated;
}

// Phase 3's go-live endpoint calls this guard. Field-level issues let the UI
// show exactly what is missing before going live.
export async function exerciseReadiness(id: string): Promise<ValidationIssue[]> {
  const exercise = await getExercise(id);
  const rows = await db
    .select({
      kind: questions.kind,
      options: questions.options,
      correctOptionIds: questions.correctOptionIds,
      modelAnswer: questions.modelAnswer,
      aliases: questions.aliases,
    })
    .from(questions)
    .where(eq(questions.exerciseId, exercise.id));

  const issues: ValidationIssue[] = [];
  if (rows.length === 0) issues.push({ path: ["questions"], message: "Add at least one question" });
  for (const [index, question] of rows.entries()) {
    const at = (field: string) => ["questions", index, field];
    if (question.kind === "single_choice" || question.kind === "multi_select") {
      const options = question.options ?? [];
      const correct = question.correctOptionIds ?? [];
      if (options.length < 2)
        issues.push({ path: at("options"), message: "Add at least two options" });
      if (correct.length === 0) {
        issues.push({ path: at("correctOptionIds"), message: "Mark a correct option" });
      }
      if (correct.some((optionId) => !options.some((option) => option.id === optionId))) {
        issues.push({
          path: at("correctOptionIds"),
          message: "Correct option is not in the options list",
        });
      }
    } else {
      if (!question.modelAnswer?.trim()) {
        issues.push({ path: at("modelAnswer"), message: "A model answer is required" });
      }
      if (!question.aliases?.length) {
        issues.push({ path: at("aliases"), message: "At least one accepted alias is required" });
      }
    }
  }
  return issues;
}

export async function assertReadyForLive(id: string): Promise<void> {
  const issues = await exerciseReadiness(id);
  if (issues.length > 0) throw new ValidationError("Exercise is not ready to go live", issues);
}
