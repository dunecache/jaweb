import { createHash } from "node:crypto";
import {
  type Leaderboard,
  type LeaderboardEntry,
  leaderboardSchema,
  type Role,
} from "@jaweb/shared";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { exercises, providerSettings, submissions, users } from "../db/schema";
import { syncLifecycle } from "./lifecycle";

export async function buildLeaderboard(input: {
  scope: "live" | "all" | "exercise";
  classId: string;
  exerciseId?: string;
  viewerRole: Role;
  viewerStudentId?: string;
}): Promise<Leaderboard> {
  await syncLifecycle();

  const settings = await db
    .select({ visibility: providerSettings.leaderboardVisibility })
    .from(providerSettings)
    .where(eq(providerSettings.id, "grading"))
    .get();
  const configured = settings?.visibility ?? "top10_self";
  const visibility = input.viewerRole === "teacher" ? "full" : configured;

  let exerciseId = input.exerciseId;
  if (input.scope === "live") {
    const live = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.classId, input.classId), eq(exercises.status, "live")))
      .get();
    exerciseId = live?.id;
  }
  const exercise = exerciseId
    ? await db.select().from(exercises).where(eq(exercises.id, exerciseId)).get()
    : undefined;
  const activityOnly = Boolean(
    exercise && exercise.status === "live" && exercise.verdictVisibility === "at_close",
  );

  const students = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(users)
    .where(
      and(eq(users.role, "student"), isNull(users.archivedAt), eq(users.classId, input.classId)),
    );
  const rows = await db
    .select({
      studentId: submissions.studentId,
      points: submissions.points,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .where(
      and(
        isNull(submissions.archivedAt),
        exerciseId ? eq(submissions.exerciseId, exerciseId) : undefined,
      ),
    );

  const byStudent = new Map<
    string,
    { points: number; gradedCount: number; pendingCount: number; lastSubmissionAt: string | null }
  >();
  for (const student of students) {
    byStudent.set(student.id, {
      points: 0,
      gradedCount: 0,
      pendingCount: 0,
      lastSubmissionAt: null,
    });
  }
  for (const row of rows) {
    const entry = byStudent.get(row.studentId);
    if (!entry) continue;
    if (row.status === "graded" && row.points !== null) {
      entry.points += row.points;
      entry.gradedCount += 1;
    } else {
      entry.pendingCount += 1;
    }
    if (!entry.lastSubmissionAt || row.submittedAt > entry.lastSubmissionAt) {
      entry.lastSubmissionAt = row.submittedAt;
    }
  }

  const entries: LeaderboardEntry[] = students
    .map((student) => ({
      ...(byStudent.get(student.id) ?? {
        points: 0,
        gradedCount: 0,
        pendingCount: 0,
        lastSubmissionAt: null,
      }),
      studentId: student.id,
      username: student.username,
      displayName: student.displayName,
      rank: 0,
      isSelf: student.id === input.viewerStudentId,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aTime = a.lastSubmissionAt ?? "9999";
      const bTime = b.lastSubmissionAt ?? "9999";
      if (aTime !== bTime) return aTime.localeCompare(bTime);
      return a.username.localeCompare(b.username);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  let visible = entries;
  if (activityOnly) {
    visible = entries.map((entry) => ({ ...entry, points: 0 }));
  }
  if (visibility === "hidden" && input.viewerRole !== "teacher") visible = [];
  if (visibility === "top10_self" && input.viewerRole !== "teacher") {
    const self = visible.find((entry) => entry.isSelf);
    visible =
      self && !visible.slice(0, 10).some((entry) => entry.isSelf)
        ? [...visible.slice(0, 10), self]
        : visible.slice(0, 10);
  }

  const payload = { scope: input.scope, activityOnly, visibility, entries: visible };
  const rev = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 12);
  return leaderboardSchema.parse({ ...payload, rev });
}
