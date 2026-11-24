import { createHash } from "node:crypto";
import {
  type HistoryDetail,
  type HistoryList,
  historyDetailSchema,
  historyListSchema,
} from "@jaweb/shared";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { exercises, questions, submissions, users } from "../db/schema";
import { NotFoundError, ValidationError } from "../lib/errors";

async function mySubmissions(studentId: string) {
  return db
    .select()
    .from(submissions)
    .where(and(eq(submissions.studentId, studentId), isNull(submissions.archivedAt)));
}

function revOf(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 12);
}

async function classOf(studentId: string): Promise<string> {
  const student = await db
    .select({ classId: users.classId })
    .from(users)
    .where(eq(users.id, studentId))
    .get();
  if (!student?.classId) throw new ValidationError("You are not assigned to a class");
  return student.classId;
}

export async function historyList(studentId: string): Promise<HistoryList> {
  const classId = await classOf(studentId);
  const rows = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.classId, classId), eq(exercises.status, "closed")));
  const all = await mySubmissions(studentId);
  const questionCounts = new Map<string, number>();
  for (const question of await db.select({ exerciseId: questions.exerciseId }).from(questions)) {
    questionCounts.set(question.exerciseId, (questionCounts.get(question.exerciseId) ?? 0) + 1);
  }
  const exercisesPayload = rows.map((exercise) => ({
    exerciseId: exercise.id,
    title: exercise.title,
    status: exercise.status,
    closedAt: exercise.closesAt,
    myPoints: all
      .filter((item) => item.exerciseId === exercise.id && item.score !== null)
      .reduce((total, item) => total + (item.points ?? 0), 0),
    questionCount: questionCounts.get(exercise.id) ?? 0,
    submittedCount: all.filter((item) => item.exerciseId === exercise.id).length,
  }));
  const payload = { exercises: exercisesPayload };
  return historyListSchema.parse({ ...payload, rev: revOf(payload) });
}

export async function historyDetail(studentId: string, exerciseId: string): Promise<HistoryDetail> {
  const classId = await classOf(studentId);
  const exercise = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.classId, classId)))
    .get();
  if (!exercise) throw new NotFoundError("Exercise not found");

  const revealed = exercise.status === "closed";
  const rows = await db.select().from(questions).where(eq(questions.exerciseId, exerciseId));
  const questionPayload = rows.map((question) => ({
    id: question.id,
    position: question.position,
    prompt: question.prompt,
    kind: question.kind,
    options: question.options,
    points: question.points,
    revealed,
    correctOptionIds: revealed ? question.correctOptionIds : null,
    modelAnswer: revealed ? question.modelAnswer : null,
  }));
  const own = (await mySubmissions(studentId)).filter((item) => item.exerciseId === exerciseId);
  const payload = {
    exerciseId,
    title: exercise.title,
    status: exercise.status,
    questions: questionPayload,
    submissions: own.map((item) => ({
      questionId: item.questionId,
      status: item.status,
      submittedAt: item.submittedAt,
      score: item.score,
      verdict: item.verdict,
      feedback: item.feedback,
      gradedBy: item.gradedBy,
      flagged: item.flagged,
    })),
  };
  return historyDetailSchema.parse({ ...payload, rev: revOf(payload) });
}
