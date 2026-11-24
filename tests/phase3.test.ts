import { resolve } from "node:path";

import { and, eq } from "drizzle-orm";
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
  users,
} from "../apps/api/src/db/schema";
import { app } from "../apps/api/src/index";
import { newId } from "../apps/api/src/lib/ids";
import { hashPassword } from "../apps/api/src/lib/password";
import { hashToken, newSessionToken, SESSION_COOKIE } from "../apps/api/src/lib/session";
import { nowIso } from "../apps/api/src/lib/time";

const migrationsFolder = resolve(process.cwd(), "apps/api/src/db/migrations");
let teacherToken = "";
let studentToken = "";
let classId = "";
let otherClassId = "";
let moduleId = "";
let exerciseId = "";
let emptyExerciseId = "";
let incompleteExerciseId = "";
let otherClassExerciseId = "";
let choiceQuestionId = "";
let freeQuestionId = "";
let studentId = "";

async function request(path: string, init: RequestInit = {}, token?: string) {
  return app.request(path, {
    ...init,
    headers: {
      ...init.headers,
      ...(token ? { cookie: `${SESSION_COOKIE}=${token}` } : {}),
    },
  });
}

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

function exerciseRow(
  id: string,
  title: string,
  targetClassId: string,
  verdictVisibility = "immediate",
) {
  return {
    id,
    moduleId,
    classId: targetClassId,
    title,
    description: null,
    type: "exercise" as const,
    status: "draft" as const,
    verdictVisibility: verdictVisibility as "immediate" | "at_close",
    opensAt: null,
    closesAt: null,
    speedWindowSeconds: 120,
    weightCorrect: 0.75,
    weightSpeed: 0.25,
    createdBy: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
  const teacherId = newId();
  studentId = newId();
  classId = newId();
  otherClassId = newId();
  moduleId = newId();
  const hash = await hashPassword("pass-1234");
  // Classes must exist before students reference them.
  await db.insert(classes).values([
    { id: classId, name: "2AS-1", position: 1, createdAt: nowIso() },
    { id: otherClassId, name: "3AS-1", position: 2, createdAt: nowIso() },
  ]);
  await db
    .insert(modules)
    .values({ id: moduleId, title: "Module", position: 1, createdAt: nowIso() });
  await db.insert(users).values([
    {
      id: teacherId,
      username: "teacher",
      displayName: "Teacher",
      role: "teacher",
      passwordHash: hash,
      createdAt: nowIso(),
    },
    {
      id: studentId,
      username: "student",
      displayName: "Student",
      role: "student",
      passwordHash: hash,
      classId,
      createdAt: nowIso(),
    },
  ]);
  teacherToken = await session(teacherId);
  studentToken = await session(studentId);

  exerciseId = newId();
  emptyExerciseId = newId();
  incompleteExerciseId = newId();
  otherClassExerciseId = newId();
  await db.insert(exercises).values([
    { ...exerciseRow(exerciseId, "Live one", classId), createdBy: teacherId },
    { ...exerciseRow(emptyExerciseId, "Empty", classId), createdBy: teacherId },
    { ...exerciseRow(incompleteExerciseId, "Incomplete", classId), createdBy: teacherId },
    { ...exerciseRow(otherClassExerciseId, "Other class", otherClassId), createdBy: teacherId },
  ]);

  choiceQuestionId = newId();
  freeQuestionId = newId();
  await db.insert(questions).values([
    {
      id: choiceQuestionId,
      exerciseId,
      position: 1,
      prompt: "2 + 2?",
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
    },
    {
      id: freeQuestionId,
      exerciseId,
      position: 2,
      prompt: "Capital of Algeria?",
      kind: "free_text",
      options: null,
      correctOptionIds: null,
      modelAnswer: "Algiers",
      keyPoints: ["Algiers"],
      aliases: ["alger", "الجزائر"],
      points: 10,
      partialCredit: false,
      createdAt: nowIso(),
    },
    {
      id: newId(),
      exerciseId: otherClassExerciseId,
      position: 1,
      prompt: "Other question",
      kind: "single_choice",
      options: [
        { id: "a", text: "yes" },
        { id: "b", text: "no" },
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
      id: newId(),
      exerciseId: emptyExerciseId,
      position: 1,
      prompt: "Ready question",
      kind: "single_choice",
      options: [
        { id: "a", text: "yes" },
        { id: "b", text: "no" },
      ],
      correctOptionIds: ["a"],
      modelAnswer: null,
      keyPoints: null,
      aliases: null,
      points: 10,
      partialCredit: false,
      createdAt: nowIso(),
    },
  ]);
});

describe("lifecycle", () => {
  it("refuses to go live without a complete answer key", async () => {
    const response = await request(
      `/api/teacher/exercises/${incompleteExerciseId}/live`,
      {
        method: "POST",
      },
      teacherToken,
    );
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: { issues: Array<{ path: string[] }> } };
    expect(body.error.issues.map((issue) => issue.path[0])).toContain("questions");
  });

  it("enforces at most one live exercise per class", async () => {
    const first = await request(
      `/api/teacher/exercises/${exerciseId}/live`,
      { method: "POST" },
      teacherToken,
    );
    expect(first.status).toBe(200);
    const sameClass = await request(
      `/api/teacher/exercises/${emptyExerciseId}/live`,
      { method: "POST" },
      teacherToken,
    );
    expect(sameClass.status).toBe(409);
    const differentClass = await request(
      `/api/teacher/exercises/${otherClassExerciseId}/live`,
      { method: "POST" },
      teacherToken,
    );
    expect(differentClass.status).toBe(200);
  });

  it("closes an exercise lazily when closes_at has passed", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    await db.update(exercises).set({ closesAt: past }).where(eq(exercises.id, exerciseId));
    const current = await request("/api/student/current", {}, studentToken);
    expect(current.status).toBe(200);
    expect(((await current.json()) as { exercise: unknown }).exercise).toBeNull();
  });
});

describe("student loop", () => {
  it("returns student-safe questions, a server time, and a stable speed anchor", async () => {
    await db
      .update(exercises)
      .set({ closesAt: null, status: "live" })
      .where(eq(exercises.id, exerciseId));
    const first = await request("/api/student/current", {}, studentToken);
    const payload = (await first.json()) as Record<string, unknown>;
    expect(payload).toHaveProperty("serverTime");
    const questionsPayload = payload.questions as Array<Record<string, unknown>>;
    for (const question of questionsPayload) {
      expect(question).not.toHaveProperty("correctOptionIds");
      expect(question).not.toHaveProperty("modelAnswer");
      expect(question).not.toHaveProperty("keyPoints");
      expect(question).not.toHaveProperty("aliases");
    }
    const anchored = await db
      .select({ startedAt: participations.startedAt })
      .from(participations)
      .where(
        and(eq(participations.exerciseId, exerciseId), eq(participations.studentId, studentId)),
      )
      .get();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
    await request("/api/student/current", {}, studentToken);
    const again = await db
      .select({ startedAt: participations.startedAt })
      .from(participations)
      .where(
        and(eq(participations.exerciseId, exerciseId), eq(participations.studentId, studentId)),
      )
      .get();
    expect(again?.startedAt).toBe(anchored?.startedAt);
  });

  it("grades choice answers instantly, rejects resubmission, and queues free text", async () => {
    const correct = await request(
      "/api/student/submissions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId: choiceQuestionId,
          answer: { kind: "single_choice", optionId: "b" },
        }),
      },
      studentToken,
    );
    expect(correct.status).toBe(201);
    const body = (await correct.json()) as {
      status: string;
      score: number;
      verdict: string;
      flagged: boolean;
    };
    expect(body).toMatchObject({ status: "graded", score: 1, verdict: "correct" });
    expect(typeof body.flagged).toBe("boolean");

    const resubmit = await request(
      "/api/student/submissions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId: choiceQuestionId,
          answer: { kind: "single_choice", optionId: "b" },
        }),
      },
      studentToken,
    );
    expect(resubmit.status).toBe(409);

    const typed = await request(
      "/api/student/submissions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId: freeQuestionId,
          answer: { kind: "free_text", text: "Algiers" },
        }),
      },
      studentToken,
    );
    expect(typed.status).toBe(202);
    expect(await typed.json()).toMatchObject({ status: "grading" });
  });

  it("guards student routes by role", async () => {
    const cases = [
      { method: "GET", path: "/api/student/current" },
      { method: "POST", path: `/api/student/exercises/${exerciseId}/start` },
      {
        method: "POST",
        path: "/api/student/submissions",
        body: { questionId: choiceQuestionId, answer: { kind: "single_choice", optionId: "b" } },
      },
    ];
    for (const testCase of cases) {
      const init: RequestInit & { headers: Record<string, string> } = {
        method: testCase.method,
        headers: { "content-type": "application/json" },
      };
      if (testCase.body) init.body = JSON.stringify(testCase.body);
      expect((await request(testCase.path, init)).status).toBe(401);
      expect((await request(testCase.path, init, teacherToken)).status).toBe(403);
    }
  });
});
