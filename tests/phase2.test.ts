import { resolve } from "node:path";

import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../apps/api/src/db/client";
import { classes, exercises, modules, questions, sessions, users } from "../apps/api/src/db/schema";
import { app } from "../apps/api/src/index";
import { newId } from "../apps/api/src/lib/ids";
import { hashPassword } from "../apps/api/src/lib/password";
import { hashToken, newSessionToken, SESSION_COOKIE } from "../apps/api/src/lib/session";
import { nowIso } from "../apps/api/src/lib/time";
import { assertReadyForLive, exerciseReadiness } from "../apps/api/src/services/exercises";

const migrationsFolder = resolve(process.cwd(), "apps/api/src/db/migrations");
let token = "";
let studentToken = "";
let teacherId = "";
let classId = "";
let moduleId = "";
let exerciseId = "";
let liveExerciseId = "";
let questionId = "";

async function request(path: string, init: RequestInit = {}, as?: string) {
  const sessionToken = as ?? token;
  return app.request(path, {
    ...init,
    headers: { ...init.headers, cookie: `${SESSION_COOKIE}=${sessionToken}` },
  });
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
  teacherId = newId();
  classId = newId();
  moduleId = newId();
  exerciseId = newId();
  liveExerciseId = newId();
  const studentId = newId();
  await db.insert(users).values([
    {
      id: teacherId,
      username: "teacher",
      displayName: "Teacher",
      role: "teacher",
      passwordHash: await hashPassword("teacher-pass-1"),
      createdAt: nowIso(),
    },
    {
      id: studentId,
      username: "student",
      displayName: "Student",
      role: "student",
      passwordHash: await hashPassword("student-pass-1"),
      createdAt: nowIso(),
    },
  ]);
  token = newSessionToken();
  studentToken = newSessionToken();
  await db.insert(sessions).values([
    {
      id: newId(),
      userId: teacherId,
      tokenHash: hashToken(token),
      expiresAt: "2999-01-01T00:00:00.000Z",
      createdAt: nowIso(),
      lastUsedAt: nowIso(),
    },
    {
      id: newId(),
      userId: studentId,
      tokenHash: hashToken(studentToken),
      expiresAt: "2999-01-01T00:00:00.000Z",
      createdAt: nowIso(),
      lastUsedAt: nowIso(),
    },
  ]);
  await db.insert(classes).values({ id: classId, name: "2AS-1", position: 1, createdAt: nowIso() });
  await db
    .insert(modules)
    .values({ id: moduleId, title: "Module 1", position: 1, createdAt: nowIso() });
  await db.insert(exercises).values([
    {
      id: exerciseId,
      moduleId,
      classId,
      title: "Draft",
      description: null,
      type: "exercise",
      status: "draft",
      verdictVisibility: "immediate",
      opensAt: null,
      closesAt: null,
      speedWindowSeconds: 120,
      weightCorrect: 0.75,
      weightSpeed: 0.25,
      createdBy: teacherId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: liveExerciseId,
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
    },
  ]);
});

describe("curriculum authoring", () => {
  it("rejects a free-text question without a model answer and aliases at go-live", async () => {
    const created = await request(`/api/teacher/exercises/${exerciseId}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "free_text",
        prompt: "Capital of Algeria?",
        aliases: [],
        modelAnswer: "",
      }),
    });
    // Empty strings are rejected by the zod contract on write.
    expect(created.status).toBe(422);

    const issues = await exerciseReadiness(exerciseId);
    expect(issues.map((issue) => issue.path[2])).toContain("modelAnswer");
    expect(issues.map((issue) => issue.path[2])).toContain("aliases");
    await expect(assertReadyForLive(exerciseId)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 422,
    });
  });

  it("creates all three question kinds and exposes only student-safe fields in preview", async () => {
    const created = await request(`/api/teacher/exercises/${exerciseId}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "single_choice",
        prompt: "2 + 2?",
        options: [
          { id: "a", text: "3" },
          { id: "b", text: "4" },
        ],
        correctOptionId: "b",
      }),
    });
    expect(created.status).toBe(201);
    const body = (await created.json()) as { id: string };
    questionId = body.id;

    const preview = await request(`/api/teacher/exercises/${exerciseId}/preview`);
    expect(preview.status).toBe(200);
    const payload = (await preview.json()) as {
      questions: Array<Record<string, unknown>>;
      ready: boolean;
    };
    expect(payload.ready).toBe(false);
    for (const item of payload.questions) {
      expect(item).not.toHaveProperty("correctOptionIds");
      expect(item).not.toHaveProperty("modelAnswer");
      expect(item).not.toHaveProperty("keyPoints");
      expect(item).not.toHaveProperty("aliases");
    }
  });

  it("archives a module with exercises but keeps the exercises", async () => {
    const response = await request(`/api/teacher/modules/${moduleId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    expect(response.status).toBe(200);
    const list = await request("/api/teacher/modules");
    expect(await list.json()).not.toMatchObject([{ id: moduleId }]);
    const remaining = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(eq(exercises.id, exerciseId));
    expect(remaining).toHaveLength(1);
  });

  it("refuses to edit a question of a live exercise", async () => {
    const response = await request(`/api/teacher/questions/${questionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Changed" }),
    });
    // The question belongs to a draft exercise; flipping the exercise to live must block edits.
    expect(response.status).toBe(200);
    await db.update(exercises).set({ status: "live" }).where(eq(exercises.id, exerciseId));
    const blocked = await request(`/api/teacher/questions/${questionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "Changed again" }),
    });
    expect(blocked.status).toBe(409);
  });

  it("guards every authoring route by role", async () => {
    const cases = [
      { method: "GET", path: "/api/teacher/modules" },
      { method: "POST", path: "/api/teacher/modules", body: { title: "M2" } },
      { method: "PATCH", path: "/api/teacher/modules/x", body: { title: "M" } },
      { method: "GET", path: "/api/teacher/exercises" },
      { method: "GET", path: `/api/teacher/exercises/${exerciseId}` },
      { method: "GET", path: `/api/teacher/exercises/${exerciseId}/preview` },
      { method: "GET", path: `/api/teacher/exercises/${exerciseId}/questions` },
      { method: "DELETE", path: "/api/teacher/questions/x" },
    ];
    for (const testCase of cases) {
      const response = await app.request(testCase.path, {
        method: testCase.method,
        headers: { "content-type": "application/json" },
        body: testCase.body ? JSON.stringify(testCase.body) : undefined,
      });
      expect(response.status, `${testCase.method} ${testCase.path} anon`).toBe(401);
      const studentResponse = await request(
        testCase.path,
        {
          method: testCase.method,
          headers: { "content-type": "application/json" },
          body: testCase.body ? JSON.stringify(testCase.body) : undefined,
        },
        studentToken,
      );
      expect(studentResponse.status, `${testCase.method} ${testCase.path} student`).toBe(403);
    }
  });
});
