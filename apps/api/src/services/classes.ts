import {
  type ClassDto,
  type CreateClassRequest,
  classSchema,
  type PatchClassRequest,
} from "@jaweb/shared";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";

import { db } from "../db/client";
import { classes } from "../db/schema";
import { ConflictError, NotFoundError } from "../lib/errors";
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

async function assertNameAvailable(name: string, excludeId?: string): Promise<void> {
  const found = await db
    .select({ id: classes.id })
    .from(classes)
    .where(
      and(
        isNull(classes.archivedAt),
        eq(sql`lower(${classes.name})`, name.toLowerCase()),
        excludeId ? ne(classes.id, excludeId) : undefined,
      ),
    )
    .get();
  if (found) throw new ConflictError("Class name already taken");
}

async function assertPositionAvailable(position: number, excludeId?: string): Promise<void> {
  const found = await db
    .select({ id: classes.id })
    .from(classes)
    .where(
      and(
        isNull(classes.archivedAt),
        eq(classes.position, position),
        excludeId ? ne(classes.id, excludeId) : undefined,
      ),
    )
    .get();
  if (found) throw new ConflictError("Class position already taken");
}

export async function listClasses(includeArchived = false): Promise<ClassDto[]> {
  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      position: classes.position,
      archivedAt: classes.archivedAt,
    })
    .from(classes)
    .where(includeArchived ? undefined : isNull(classes.archivedAt))
    .orderBy(asc(classes.position));
  return rows.map(toDto);
}

export async function createClass(input: CreateClassRequest): Promise<ClassDto> {
  await assertNameAvailable(input.name);
  if (input.position !== undefined) await assertPositionAvailable(input.position);
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

// One call owns the whole ordering, so positions stay unique and contiguous.
export async function reorderClasses(ids: string[]): Promise<ClassDto[]> {
  const active = await db
    .select({ id: classes.id })
    .from(classes)
    .where(isNull(classes.archivedAt));
  const activeIds = active.map((row) => row.id);
  const submitted = new Set(ids);
  if (
    submitted.size !== ids.length ||
    ids.length !== activeIds.length ||
    activeIds.some((id) => !submitted.has(id))
  ) {
    throw new ConflictError("Class list is out of date");
  }
  const updates = ids.map((id, index) =>
    db
      .update(classes)
      .set({ position: index + 1 })
      .where(eq(classes.id, id)),
  );
  const [first, ...rest] = updates;
  if (!first) throw new ConflictError("Class list is out of date");
  await db.batch([first, ...rest]);
  return listClasses();
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

  if (input.name !== undefined) await assertNameAvailable(input.name, id);
  if (input.position !== undefined) await assertPositionAvailable(input.position, id);

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
