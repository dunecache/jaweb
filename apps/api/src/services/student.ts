import { createHash } from "node:crypto";
import {
  type StudentCurrent,
  type SubmissionDto,
  safeExerciseSchema,
  studentSafeQuestion,
} from "@jaweb/shared";
import { and, eq } from "drizzle-orm";

import { db } from "../db/client";
import { exercises, users } from "../db/schema";
import { nowIso } from "../lib/time";
import { syncLifecycle } from "./lifecycle";
import { touchParticipation } from "./participations";
import { listQuestions } from "./questions";
import { mySubmissions } from "./submissions";

function revOf(payload: Omit<StudentCurrent, "rev">): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 12);
}

function reveal(row: SubmissionDto, exerciseStatus: string, visibility: string): SubmissionDto {
  if (exerciseStatus === "closed") return row;
  return {
    ...row,
    feedback: null,
    ...(visibility === "at_close" ? { score: null, verdict: null } : {}),
  };
}

export async function currentForStudent(studentId: string): Promise<StudentCurrent> {
  await syncLifecycle();
  const serverTime = nowIso();
  const student = await db
    .select({ classId: users.classId })
    .from(users)
    .where(eq(users.id, studentId))
    .get();

  const exercise = student?.classId
    ? await db
        .select()
        .from(exercises)
        .where(and(eq(exercises.classId, student.classId), eq(exercises.status, "live")))
        .get()
    : undefined;

  if (!exercise) {
    const empty: Omit<StudentCurrent, "rev"> = {
      exercise: null,
      questions: [],
      submissions: [],
      serverTime,
      closesAt: null,
    };
    return { ...empty, rev: revOf(empty) };
  }

  await touchParticipation(exercise.id, studentId);
  const questions = (await listQuestions(exercise.id)).map(studentSafeQuestion);
  const own = await mySubmissions(exercise.id, studentId);
  const submissions = own.map((row) => reveal(row, exercise.status, exercise.verdictVisibility));
  const safeExercise = safeExerciseSchema.parse({
    id: exercise.id,
    title: exercise.title,
    description: exercise.description,
    type: exercise.type,
    status: exercise.status,
    verdictVisibility: exercise.verdictVisibility,
    opensAt: exercise.opensAt,
    closesAt: exercise.closesAt,
    speedWindowSeconds: exercise.speedWindowSeconds,
  });

  const payload: Omit<StudentCurrent, "rev"> = {
    exercise: safeExercise,
    questions,
    submissions,
    serverTime,
    closesAt: exercise.closesAt,
  };
  return { ...payload, rev: revOf(payload) };
}
