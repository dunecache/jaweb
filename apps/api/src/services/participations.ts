import type { Answer } from "@jaweb/shared";
import { and, eq } from "drizzle-orm";

import { db } from "../db/client";
import { participations } from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/time";

export async function touchParticipation(
  exerciseId: string,
  studentId: string,
): Promise<{ startedAt: string; lastSeenAt: string }> {
  const now = nowIso();
  // started_at is written once: the first view is the student's speed anchor.
  await db
    .insert(participations)
    .values({ id: newId(), exerciseId, studentId, startedAt: now, lastSeenAt: now })
    .onConflictDoNothing({ target: [participations.exerciseId, participations.studentId] });
  await db
    .update(participations)
    .set({ lastSeenAt: now })
    .where(and(eq(participations.exerciseId, exerciseId), eq(participations.studentId, studentId)));
  const row = await db
    .select({ startedAt: participations.startedAt, lastSeenAt: participations.lastSeenAt })
    .from(participations)
    .where(and(eq(participations.exerciseId, exerciseId), eq(participations.studentId, studentId)))
    .get();
  if (!row) throw new Error("Participation upsert failed");
  return row;
}

export async function getParticipation(exerciseId: string, studentId: string) {
  return db
    .select({ startedAt: participations.startedAt, lastSeenAt: participations.lastSeenAt })
    .from(participations)
    .where(and(eq(participations.exerciseId, exerciseId), eq(participations.studentId, studentId)))
    .get();
}

export function answerMatchesKind(answer: Answer, kind: string): boolean {
  return answer.kind === kind;
}
