import { createHash } from "node:crypto";
import { type Monitor, type MonitorCell, monitorSchema } from "@jaweb/shared";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { participations, submissions, users } from "../db/schema";
import { getExercise } from "./exercises";
import { listQuestions } from "./questions";

function cellFor(status: string): MonitorCell {
  return status === "grading" || status === "graded" || status === "needs_review"
    ? status
    : "submitted";
}

export async function buildMonitor(exerciseId: string): Promise<Monitor> {
  const exercise = await getExercise(exerciseId);
  const questions = await listQuestions(exerciseId);
  const students = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(users)
    .where(
      and(eq(users.role, "student"), isNull(users.archivedAt), eq(users.classId, exercise.classId)),
    );
  const participationRows = await db
    .select()
    .from(participations)
    .where(eq(participations.exerciseId, exerciseId));
  const submissionRows = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.exerciseId, exerciseId), isNull(submissions.archivedAt)));

  const participationByStudent = new Map(participationRows.map((row) => [row.studentId, row]));
  const submissionByKey = new Map(
    submissionRows.map((row) => [`${row.studentId}:${row.questionId}`, row]),
  );
  const usernames = new Map(students.map((student) => [student.id, student.username]));

  const roster = students.map((student) => {
    const participation = participationByStudent.get(student.id);
    const cells: Record<string, MonitorCell> = {};
    for (const question of questions) {
      const submission = submissionByKey.get(`${student.id}:${question.id}`);
      cells[question.id] = !participation
        ? "not_opened"
        : !submission
          ? "opened"
          : cellFor(submission.status);
    }
    return {
      studentId: student.id,
      username: student.username,
      displayName: student.displayName,
      cells,
      lastSeenAt: participation?.lastSeenAt ?? null,
    };
  });

  const times = submissionRows
    .map((row) => {
      const participation = participationByStudent.get(row.studentId);
      return participation
        ? (Date.parse(row.submittedAt) - Date.parse(participation.startedAt)) / 1000
        : null;
    })
    .filter((value): value is number => value !== null && value >= 0)
    .sort((a, b) => a - b);
  const medianSeconds = times.length ? Math.round(times[Math.floor(times.length / 2)] ?? 0) : null;

  const payload = {
    exerciseId,
    questions: questions.map((question) => ({
      id: question.id,
      position: question.position,
      prompt: question.prompt,
    })),
    roster,
    counts: {
      submitted: submissionRows.length,
      grading: submissionRows.filter((row) => row.status === "grading").length,
      needsReview: submissionRows.filter((row) => row.status === "needs_review").length,
      graded: submissionRows.filter((row) => row.status === "graded").length,
      missing: Math.max(0, students.length * questions.length - submissionRows.length),
    },
    medianSeconds,
    flagged: submissionRows
      .filter((row) => row.flagged)
      .map((row) => ({
        submissionId: row.id,
        username: usernames.get(row.studentId) ?? "unknown",
        questionId: row.questionId,
        submittedAt: row.submittedAt,
      })),
  };
  const rev = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 12);
  return monitorSchema.parse({ ...payload, rev });
}

export async function exportRows(exerciseId: string) {
  const rows = await db
    .select({
      username: users.username,
      displayName: users.displayName,
      questionId: submissions.questionId,
      status: submissions.status,
      verdict: submissions.verdict,
      score: submissions.score,
      points: submissions.points,
      submittedAt: submissions.submittedAt,
      flagged: submissions.flagged,
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.studentId, users.id))
    .where(and(eq(submissions.exerciseId, exerciseId), isNull(submissions.archivedAt)));
  return rows;
}

export function submissionsCsv(
  rows: Array<{
    username: string;
    displayName: string;
    questionId: string;
    status: string;
    verdict: string | null;
    score: number | null;
    points: number | null;
    submittedAt: string;
    flagged: boolean;
  }>,
): string {
  const quote = (value: string | number | boolean | null) => {
    const text = value === null ? "" : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };
  const lines = [
    [
      "Username",
      "Display name",
      "Question",
      "Status",
      "Verdict",
      "Score",
      "Points",
      "Submitted at",
      "Flagged",
    ]
      .map(quote)
      .join(","),
    ...rows.map((row) =>
      [
        row.username,
        row.displayName,
        row.questionId,
        row.status,
        row.verdict,
        row.score,
        row.points,
        row.submittedAt,
        row.flagged,
      ]
        .map(quote)
        .join(","),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
