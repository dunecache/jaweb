import { and, eq, inArray, isNotNull, lt, lte } from "drizzle-orm";

import { db } from "../db/client";
import { exercises } from "../db/schema";
import { ConflictError } from "../lib/errors";
import { nowIso } from "../lib/time";
import { assertReadyForLive, getExercise } from "./exercises";

// Closing is computed, never timed: every read/submit flips stored statuses
// opportunistically (AGENTS §7/§16).
export async function syncLifecycle(): Promise<void> {
  const now = nowIso();
  await db
    .update(exercises)
    .set({ status: "closed", updatedAt: now })
    .where(
      and(eq(exercises.status, "live"), isNotNull(exercises.closesAt), lt(exercises.closesAt, now)),
    );

  const due = await db
    .select({ id: exercises.id, classId: exercises.classId })
    .from(exercises)
    .where(
      and(
        inArray(exercises.status, ["scheduled"]),
        isNotNull(exercises.opensAt),
        lte(exercises.opensAt, now),
      ),
    );

  for (const candidate of due) {
    await db.transaction(async (tx) => {
      const live = await tx
        .select({ id: exercises.id })
        .from(exercises)
        .where(and(eq(exercises.classId, candidate.classId), eq(exercises.status, "live")))
        .get();
      if (live) return;
      await tx
        .update(exercises)
        .set({ status: "live", updatedAt: now })
        .where(eq(exercises.id, candidate.id));
    });
  }
}

export async function goLive(exerciseId: string): Promise<void> {
  const exercise = await getExercise(exerciseId);
  if (exercise.status !== "draft") throw new ConflictError("Only a draft can go live");
  await assertReadyForLive(exerciseId);

  const now = nowIso();
  const scheduled = exercise.opensAt !== null && exercise.opensAt > now;
  await db.transaction(async (tx) => {
    const live = await tx
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.classId, exercise.classId), eq(exercises.status, "live")))
      .get();
    if (live) throw new ConflictError("Another exercise of this class is already live");
    await tx
      .update(exercises)
      .set({ status: scheduled ? "scheduled" : "live", updatedAt: now })
      .where(eq(exercises.id, exerciseId));
  });
}

export async function closeExercise(exerciseId: string): Promise<void> {
  await getExercise(exerciseId);
  await db
    .update(exercises)
    .set({ status: "closed", updatedAt: nowIso() })
    .where(eq(exercises.id, exerciseId));
}
