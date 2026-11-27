import { resolve } from "node:path";

import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../apps/api/src/db/client";
import {
  classes,
  exercises,
  modules,
  participations,
  questions,
  submissions,
  users,
} from "../apps/api/src/db/schema";
import { newId } from "../apps/api/src/lib/ids";
import { nowIso } from "../apps/api/src/lib/time";
import { applyPoints, pointsFor } from "../apps/api/src/services/scoring";

const migrationsFolder = resolve(process.cwd(), "apps/api/src/db/migrations");
const classId = newId();
const moduleId = newId();
const teacherId = newId();
const studentId = newId();
const exerciseId = newId();
const questionId = newId();
const submissionId = newId();

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
  await db.insert(classes).values({ id: classId, name: "2AS-1", position: 1, createdAt: nowIso() });
  await db
    .insert(modules)
    .values({ id: moduleId, title: "Module", position: 1, createdAt: nowIso() });
  await db.insert(users).values([
    {
      id: teacherId,
      username: "teacher",
      displayName: "Teacher",
      role: "teacher",
      passwordHash: "hash",
      createdAt: nowIso(),
    },
    {
      id: studentId,
      username: "student",
      displayName: "Student",
      role: "student",
      passwordHash: "hash",
      classId,
      createdAt: nowIso(),
    },
  ]);
  // Old weights on purpose: they must no longer change the award.
  await db.insert(exercises).values({
    id: exerciseId,
    moduleId,
    classId,
    title: "Exercise",
    type: "exercise",
    status: "draft",
    verdictVisibility: "immediate",
    speedWindowSeconds: 120,
    weightCorrect: 0.75,
    weightSpeed: 0.25,
    createdBy: teacherId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  await db.insert(questions).values({
    id: questionId,
    exerciseId,
    position: 1,
    prompt: "2+2?",
    kind: "single_choice",
    options: [
      { id: "a", text: "3" },
      { id: "b", text: "4" },
    ],
    correctOptionIds: ["b"],
    modelAnswer: null,
    keyPoints: null,
    aliases: null,
    points: 10,
    partialCredit: false,
    createdAt: nowIso(),
  });
  await db.insert(participations).values({
    id: newId(),
    exerciseId,
    studentId,
    startedAt: new Date(Date.now() - 600_000).toISOString(),
    lastSeenAt: nowIso(),
  });
  await db.insert(submissions).values({
    id: submissionId,
    exerciseId,
    questionId,
    studentId,
    answer: { kind: "single_choice", optionId: "b" },
    submittedAt: nowIso(),
    status: "graded",
    score: 1,
    verdict: "correct",
    feedback: null,
    gradedBy: "auto",
    gradedAt: nowIso(),
    points: null,
    flagged: false,
    archivedAt: null,
  });
});

describe("points", () => {
  it("awards exactly the question points for a given score", () => {
    expect(pointsFor(10, 1)).toBe(10);
    expect(pointsFor(10, 0.5)).toBe(5);
    expect(pointsFor(10, 0)).toBe(0);
  });

  it("ignores elapsed time and legacy speed weights when applying points", async () => {
    await applyPoints(submissionId);
    const row = await db
      .select({ points: submissions.points })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .get();
    expect(row?.points).toBe(10);
  });
});
