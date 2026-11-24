import { resolve } from "node:path";

import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../apps/api/src/db/client";
import {
  classes,
  exercises,
  modules,
  participations,
  questions,
  sessions,
  submissions,
  users,
} from "../apps/api/src/db/schema";
import { app } from "../apps/api/src/index";
import { newId } from "../apps/api/src/lib/ids";
import { hashToken, newSessionToken, SESSION_COOKIE } from "../apps/api/src/lib/session";
import { nowIso } from "../apps/api/src/lib/time";

const migrationsFolder = resolve(process.cwd(), "apps/api/src/db/migrations");
let teacherToken = "";
let studentToken = "";
let exerciseId = "";
let studentId = "";
let flaggedSubmissionId = "";

async function session(userId: string): Promise<string> {
  const token = newSessionToken();
  await db.insert(sessions).values({
    id: newId(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: "2999-01-01T00:00:00.000Z",
    createdAt: nowIso(),
    lastUsedAt: nowIso(),
  });
  return token;
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
  const teacherId = newId();
  studentId = newId();
  const classId = newId();
  const moduleId = newId();
  exerciseId = newId();
  const questionA = newId();
  const questionB = newId();
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
      passwordHash: "x",
      createdAt: nowIso(),
    },
    {
      id: studentId,
      username: "alice",
      displayName: "Alice",
      role: "student",
      passwordHash: "x",
      classId,
      createdAt: nowIso(),
    },
  ]);
  teacherToken = await session(teacherId);
  studentToken = await session(studentId);
  await db.insert(exercises).values({
    id: exerciseId,
    moduleId,
    classId,
    title: "Live",
    description: null,
    type: "exercise",
    status: "live",
    verdictVisibility: "immediate",
    opensAt: null,
    closesAt: null,
    speedWindowSeconds: 120,
    weightCorrect: 0.75,
    weightSpeed: 0.25,
    createdBy: teacherId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  await db.insert(questions).values([
    {
      id: questionA,
      exerciseId,
      position: 1,
      prompt: "Q1",
      kind: "single_choice",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      correctOptionIds: ["a"],
      modelAnswer: null,
      keyPoints: null,
      aliases: null,
      points: 10,
      partialCredit: false,
      createdAt: nowIso(),
    },
    {
      id: questionB,
      exerciseId,
      position: 2,
      prompt: "Q2",
      kind: "free_text",
      options: null,
      correctOptionIds: null,
      modelAnswer: "x",
      keyPoints: [],
      aliases: ["x"],
      points: 10,
      partialCredit: false,
      createdAt: nowIso(),
    },
  ]);
  await db.insert(participations).values({
    id: newId(),
    exerciseId,
    studentId,
    startedAt: new Date(Date.now() - 5_000).toISOString(),
    lastSeenAt: nowIso(),
  });
  flaggedSubmissionId = newId();
  await db.insert(submissions).values({
    id: flaggedSubmissionId,
    exerciseId,
    questionId: questionA,
    studentId,
    answer: { kind: "single_choice", optionId: "a" },
    submittedAt: nowIso(),
    status: "graded",
    score: 1,
    verdict: "correct",
    feedback: null,
    gradedBy: "auto",
    gradedAt: nowIso(),
    points: 10,
    flagged: true,
    archivedAt: null,
  });
});

describe("monitor", () => {
  it("returns a roster grid, counts and flagged submissions", async () => {
    const response = await app.request(`/api/teacher/exercises/${exerciseId}/monitor`, {
      headers: { cookie: `${SESSION_COOKIE}=${teacherToken}` },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      roster: Array<{ username: string; cells: Record<string, string> }>;
      counts: Record<string, number>;
      flagged: Array<{ submissionId: string }>;
      medianSeconds: number | null;
    };
    expect(body.roster).toHaveLength(1);
    expect(body.roster[0]?.username).toBe("alice");
    expect(Object.values(body.roster[0]?.cells ?? {})).toContain("graded");
    expect(Object.values(body.roster[0]?.cells ?? {})).toContain("opened");
    expect(body.counts.submitted).toBe(1);
    expect(body.counts.missing).toBe(1);
    expect(body.flagged.map((item) => item.submissionId)).toContain(flaggedSubmissionId);
    expect(body.medianSeconds).toBeGreaterThanOrEqual(0);
  });

  it("exports CSV with a UTF-8 BOM", async () => {
    const response = await app.request(`/api/teacher/exercises/${exerciseId}/export.csv`, {
      headers: { cookie: `${SESSION_COOKIE}=${teacherToken}` },
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain("Username");
    expect(text).toContain("alice");
  });

  it("guards monitor and export routes by role", async () => {
    for (const path of [
      `/api/teacher/exercises/${exerciseId}/monitor`,
      `/api/teacher/exercises/${exerciseId}/export.csv`,
    ]) {
      expect((await app.request(path)).status).toBe(401);
      expect(
        (await app.request(path, { headers: { cookie: `${SESSION_COOKIE}=${studentToken}` } }))
          .status,
      ).toBe(403);
    }
  });
});
