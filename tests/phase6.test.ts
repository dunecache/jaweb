import { resolve } from "node:path";

import { and, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "../apps/api/src/db/client";
import {
  classes,
  exercises,
  modules,
  providerSettings,
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
let studentId = "";
let otherStudentId = "";
let classId = "";
let closedExerciseId = "";
let liveExamId = "";

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
  targetClassId: string,
  status: "closed" | "live",
  verdict: "immediate" | "at_close",
) {
  return {
    id,
    moduleId: "",
    classId: targetClassId,
    title: id,
    description: null,
    type: "exercise" as const,
    status,
    verdictVisibility: verdict,
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
  otherStudentId = newId();
  const moduleId = newId();
  classId = newId();
  closedExerciseId = newId();
  liveExamId = newId();
  const closedQuestionId = newId();
  const examQuestionId = newId();
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
    {
      id: otherStudentId,
      username: "bob",
      displayName: "Bob",
      role: "student",
      passwordHash: "x",
      classId,
      createdAt: nowIso(),
    },
  ]);
  teacherToken = await session(teacherId);
  studentToken = await session(studentId);
  await db.insert(exercises).values([
    {
      ...exerciseRow(closedExerciseId, classId, "closed", "immediate"),
      moduleId,
      createdBy: teacherId,
    },
    { ...exerciseRow(liveExamId, classId, "live", "at_close"), moduleId, createdBy: teacherId },
  ]);
  await db.insert(questions).values([
    {
      id: closedQuestionId,
      exerciseId: closedExerciseId,
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
    },
    {
      id: examQuestionId,
      exerciseId: liveExamId,
      position: 1,
      prompt: "Explain",
      kind: "free_text",
      options: null,
      correctOptionIds: null,
      modelAnswer: "Secret answer",
      keyPoints: ["secret"],
      aliases: ["secret"],
      points: 10,
      partialCredit: false,
      createdAt: nowIso(),
    },
  ]);
  await db.insert(submissions).values([
    {
      id: newId(),
      exerciseId: closedExerciseId,
      questionId: closedQuestionId,
      studentId,
      answer: { kind: "single_choice", optionId: "b" },
      submittedAt: nowIso(),
      status: "graded",
      score: 1,
      verdict: "correct",
      feedback: "Well done",
      gradedBy: "auto",
      gradedAt: nowIso(),
      points: 10,
      flagged: false,
      archivedAt: null,
    },
    {
      id: newId(),
      exerciseId: closedExerciseId,
      questionId: closedQuestionId,
      studentId: otherStudentId,
      answer: { kind: "single_choice", optionId: "a" },
      submittedAt: new Date(Date.now() - 1000).toISOString(),
      status: "graded",
      score: 0,
      verdict: "wrong",
      feedback: null,
      gradedBy: "auto",
      gradedAt: nowIso(),
      points: 0,
      flagged: false,
      archivedAt: null,
    },
    {
      id: newId(),
      exerciseId: liveExamId,
      questionId: examQuestionId,
      studentId,
      answer: { kind: "free_text", text: "draft" },
      submittedAt: nowIso(),
      status: "grading",
      score: null,
      verdict: null,
      feedback: null,
      gradedBy: null,
      gradedAt: null,
      points: null,
      flagged: false,
      archivedAt: null,
    },
  ]);
});

describe("leaderboard", () => {
  it("ranks by points and pins the student's own row", async () => {
    const teacher = await app.request("/api/leaderboard?scope=all", {
      headers: { cookie: `${SESSION_COOKIE}=${teacherToken}` },
    });
    expect(teacher.status).toBe(200);
    const full = (await teacher.json()) as { entries: Array<{ username: string; points: number }> };
    expect(full.entries.map((entry) => entry.username)).toEqual(["alice", "bob"]);
    expect(full.entries[0]?.points).toBe(10);

    const student = await app.request("/api/leaderboard?scope=all", {
      headers: { cookie: `${SESSION_COOKIE}=${studentToken}` },
    });
    const board = (await student.json()) as {
      entries: Array<{ username: string; isSelf: boolean }>;
      visibility: string;
    };
    expect(board.visibility).toBe("top10_self");
    expect(board.entries.some((entry) => entry.isSelf)).toBe(true);
  });

  it("shows activity only for a live at_close exam", async () => {
    const response = await app.request(`/api/leaderboard?scope=exercise&exerciseId=${liveExamId}`, {
      headers: { cookie: `${SESSION_COOKIE}=${studentToken}` },
    });
    const board = (await response.json()) as {
      activityOnly: boolean;
      entries: Array<{ points: number; pendingCount: number }>;
    };
    expect(board.activityOnly).toBe(true);
    expect(board.entries.every((entry) => entry.points === 0)).toBe(true);
    expect(board.entries.some((entry) => entry.pendingCount > 0)).toBe(true);
  });

  it("honours hidden visibility for students but not teachers", async () => {
    await db
      .insert(providerSettings)
      .values({
        id: "grading",
        provider: "fake",
        model: "fake",
        apiKeyCiphertext: null,
        apiKeyLast4: null,
        baseUrl: null,
        testedAt: null,
        testOk: null,
        leaderboardVisibility: "hidden",
        updatedAt: nowIso(),
      })
      .onConflictDoUpdate({
        target: providerSettings.id,
        set: { leaderboardVisibility: "hidden" },
      });
    const student = await app.request("/api/leaderboard?scope=all", {
      headers: { cookie: `${SESSION_COOKIE}=${studentToken}` },
    });
    expect(((await student.json()) as { entries: unknown[] }).entries).toHaveLength(0);
    const teacher = await app.request("/api/leaderboard?scope=all", {
      headers: { cookie: `${SESSION_COOKIE}=${teacherToken}` },
    });
    expect(((await teacher.json()) as { entries: unknown[] }).entries.length).toBeGreaterThan(0);
  });

  it("guards the leaderboard by role", async () => {
    expect((await app.request("/api/leaderboard")).status).toBe(401);
  });

  it("returns an empty board when scope=live has no live exercise", async () => {
    await db.update(exercises).set({ status: "closed" }).where(eq(exercises.id, liveExamId));
    try {
      const response = await app.request("/api/leaderboard?scope=live", {
        headers: { cookie: `${SESSION_COOKIE}=${studentToken}` },
      });
      expect(response.status).toBe(200);
      const board = (await response.json()) as { scope: string; entries: unknown[] };
      expect(board.scope).toBe("live");
      expect(board.entries).toHaveLength(0);
    } finally {
      await db.update(exercises).set({ status: "live" }).where(eq(exercises.id, liveExamId));
    }
  });
});

describe("student history", () => {
  it("lists closed exercises only", async () => {
    const response = await app.request("/api/student/history", {
      headers: { cookie: `${SESSION_COOKIE}=${studentToken}` },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { exercises: Array<{ exerciseId: string }> };
    expect(body.exercises.map((item) => item.exerciseId)).toEqual([closedExerciseId]);
  });

  it("reveals answers only for closed exercises", async () => {
    const closed = await app.request(`/api/student/history/${closedExerciseId}`, {
      headers: { cookie: `${SESSION_COOKIE}=${studentToken}` },
    });
    const closedBody = (await closed.json()) as {
      questions: Array<{ revealed: boolean; correctOptionIds: string[] | null }>;
    };
    expect(closedBody.questions[0]?.revealed).toBe(true);
    expect(closedBody.questions[0]?.correctOptionIds).toEqual(["b"]);

    const live = await app.request(`/api/student/history/${liveExamId}`, {
      headers: { cookie: `${SESSION_COOKIE}=${studentToken}` },
    });
    const liveBody = (await live.json()) as {
      questions: Array<{ revealed: boolean; modelAnswer: string | null }>;
    };
    expect(liveBody.questions[0]?.revealed).toBe(false);
    expect(liveBody.questions[0]?.modelAnswer).toBeNull();
  });

  it("withholds score, verdict and feedback for a live at_close exercise", async () => {
    const examQuestion = await db
      .select()
      .from(questions)
      .where(eq(questions.exerciseId, liveExamId))
      .get();
    if (!examQuestion) throw new Error("Exam question fixture missing");
    const submissionId = newId();
    // The fixture already holds a submission for this (question, student);
    // archive it so the unique active index accepts the graded replacement.
    await db
      .update(submissions)
      .set({ archivedAt: nowIso() })
      .where(
        and(eq(submissions.questionId, examQuestion.id), eq(submissions.studentId, studentId)),
      );
    await db.insert(submissions).values({
      id: submissionId,
      exerciseId: liveExamId,
      questionId: examQuestion.id,
      studentId,
      answer: { kind: "free_text", text: "secret" },
      submittedAt: nowIso(),
      status: "graded",
      score: 1,
      verdict: "correct",
      feedback: "Secret feedback",
      gradedBy: "teacher",
      gradedAt: nowIso(),
      points: 10,
      flagged: false,
      archivedAt: null,
    });
    try {
      const response = await app.request(`/api/student/history/${liveExamId}`, {
        headers: { cookie: `${SESSION_COOKIE}=${studentToken}` },
      });
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        submissions: Array<{
          score: number | null;
          verdict: string | null;
          feedback: string | null;
        }>;
      };
      expect(body.submissions.length).toBeGreaterThan(0);
      expect(
        body.submissions.every(
          (item) => item.score === null && item.verdict === null && item.feedback === null,
        ),
      ).toBe(true);
    } finally {
      await db.delete(submissions).where(eq(submissions.id, submissionId));
      await db
        .update(submissions)
        .set({ archivedAt: null })
        .where(
          and(eq(submissions.questionId, examQuestion.id), eq(submissions.studentId, studentId)),
        );
    }
  });

  it("guards history by role", async () => {
    expect((await app.request("/api/student/history")).status).toBe(401);
    expect(
      (
        await app.request("/api/student/history", {
          headers: { cookie: `${SESSION_COOKIE}=${teacherToken}` },
        })
      ).status,
    ).toBe(403);
  });
});
