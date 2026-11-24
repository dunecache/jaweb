import {
  type CreateStudentRequest,
  type PatchStudentRequest,
  type StudentDto,
  studentSchema,
} from "@jaweb/shared";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { classes, sessions, users } from "../db/schema";
import { ConflictError, NotFoundError } from "../lib/errors";
import { newId } from "../lib/ids";
import { hashPassword } from "../lib/password";
import { nowIso } from "../lib/time";

type StudentRow = {
  id: string;
  username: string;
  displayName: string;
  classId: string | null;
  archivedAt: string | null;
};

function toDto(row: StudentRow): StudentDto {
  return studentSchema.parse(row);
}

async function assertClassExists(classId: string): Promise<void> {
  const found = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.id, classId), isNull(classes.archivedAt)))
    .get();
  if (!found) throw new NotFoundError("Class not found");
}

export async function listStudents(classId?: string): Promise<StudentDto[]> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      classId: users.classId,
      archivedAt: users.archivedAt,
    })
    .from(users)
    .where(
      and(
        eq(users.role, "student"),
        isNull(users.archivedAt),
        classId ? eq(users.classId, classId) : undefined,
      ),
    );
  return rows.map(toDto);
}

export async function createStudent(input: CreateStudentRequest): Promise<StudentDto> {
  const username = input.username.toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .get();
  if (existing) throw new ConflictError("Username already taken");

  const classId = input.classId || null;
  if (classId) await assertClassExists(classId);

  const row: StudentRow = {
    id: newId(),
    username,
    displayName: input.displayName,
    classId,
    archivedAt: null,
  };
  await db.insert(users).values({
    ...row,
    role: "student",
    passwordHash: await hashPassword(input.password),
    createdAt: nowIso(),
  });
  return toDto(row);
}

export async function patchStudent(id: string, input: PatchStudentRequest): Promise<StudentDto> {
  const row = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      classId: users.classId,
      archivedAt: users.archivedAt,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "student"), isNull(users.archivedAt)))
    .get();
  if (!row) throw new NotFoundError("Student not found");

  const classId = input.classId === undefined ? row.classId : input.classId || null;
  if (classId) await assertClassExists(classId);

  const updated: StudentRow = {
    id: row.id,
    username: row.username,
    displayName: input.displayName ?? row.displayName,
    classId,
    archivedAt: input.archived ? nowIso() : row.archivedAt,
  };

  await db
    .update(users)
    .set({
      displayName: updated.displayName,
      classId: updated.classId,
      archivedAt: updated.archivedAt,
      ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
    })
    .where(eq(users.id, id));

  // Reset password and archive both invalidate every existing session.
  if (input.password || input.archived) {
    await db.delete(sessions).where(eq(sessions.userId, id));
  }
  return toDto(updated);
}
