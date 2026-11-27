import { createHash } from "node:crypto";
import { type StudentCurrent, safeExerciseSchema, studentSafeQuestion } from "@jaweb/shared";
import { and, eq } from "drizzle-orm";

import { db } from "../db/client";
import { exercises, users } from "../db/schema";
import { nowIso } from "../lib/time";
import { syncLifecycle } from "./lifecycle";
import { touchParticipation } from "./participations";
import { listQuestions } from "./questions";
import { revealSubmission } from "./reveal";
import { mySubmissions } from "./submissions";

function revOf(payload: Omit<StudentCurrent, "rev">): string {
  // serverTime changes on every request; hashing it would defeat polling backoff
  // and ETag matching. Hash only the state that can actually change.
  const stable = {
    exercise: payload.exercise,
    questions: payload.questions,
    submissions: payload.submissions,
    closesAt: payload.closesAt,
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 12);
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
  const submissions = own.map((row) =>
    revealSubmission(row, exercise.status, exercise.verdictVisibility),
  );
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
