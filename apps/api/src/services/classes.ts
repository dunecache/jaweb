import {
  type ClassDto,
  type CreateClassRequest,
  classSchema,
  type PatchClassRequest,
} from "@jaweb/shared";
import { asc, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { classes } from "../db/schema";
import { NotFoundError } from "../lib/errors";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/time";

type ClassRow = {
  id: string;
  name: string;
  position: number;
  archivedAt: string | null;
};

function toDto(row: ClassRow): ClassDto {
  return classSchema.parse(row);
}

export async function listClasses(): Promise<ClassDto[]> {
  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      position: classes.position,
      archivedAt: classes.archivedAt,
    })
    .from(classes)
    .where(isNull(classes.archivedAt))
    .orderBy(asc(classes.position));
  return rows.map(toDto);
}

export async function createClass(input: CreateClassRequest): Promise<ClassDto> {
  const existing = await db.select({ position: classes.position }).from(classes);
  const position = input.position ?? Math.max(0, ...existing.map((row) => row.position)) + 1;
  const row: ClassRow = {
    id: newId(),
    name: input.name,
    position,
    archivedAt: null,
  };
  await db.insert(classes).values({ ...row, createdAt: nowIso() });
  return toDto(row);
}

export async function patchClass(id: string, input: PatchClassRequest): Promise<ClassDto> {
  const row = await db
    .select({
      id: classes.id,
      name: classes.name,
      position: classes.position,
      archivedAt: classes.archivedAt,
    })
    .from(classes)
    .where(eq(classes.id, id))
    .get();
  if (!row || row.archivedAt) throw new NotFoundError("Class not found");

  const updated: ClassRow = {
    id: row.id,
    name: input.name ?? row.name,
    position: input.position ?? row.position,
    archivedAt: input.archived ? nowIso() : row.archivedAt,
  };
  await db
    .update(classes)
    .set({ name: updated.name, position: updated.position, archivedAt: updated.archivedAt })
    .where(eq(classes.id, id));
  return toDto(updated);
}
