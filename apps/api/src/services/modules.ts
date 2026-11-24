import {
  type CreateModuleRequest,
  type ModuleDto,
  moduleSchema,
  type PatchModuleRequest,
} from "@jaweb/shared";
import { asc, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { modules } from "../db/schema";
import { NotFoundError } from "../lib/errors";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/time";

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  archivedAt: string | null;
};

function toDto(row: ModuleRow): ModuleDto {
  return moduleSchema.parse(row);
}

export async function listModules(includeArchived = false): Promise<ModuleDto[]> {
  const rows = await db
    .select({
      id: modules.id,
      title: modules.title,
      description: modules.description,
      position: modules.position,
      archivedAt: modules.archivedAt,
    })
    .from(modules)
    .where(includeArchived ? undefined : isNull(modules.archivedAt))
    .orderBy(asc(modules.position));
  return rows.map(toDto);
}

export async function createModule(input: CreateModuleRequest): Promise<ModuleDto> {
  const rows = await db.select({ position: modules.position }).from(modules);
  const row: ModuleRow = {
    id: newId(),
    title: input.title,
    description: input.description ?? null,
    position: input.position ?? Math.max(0, ...rows.map((item) => item.position)) + 1,
    archivedAt: null,
  };
  await db.insert(modules).values({ ...row, createdAt: nowIso() });
  return toDto(row);
}

// Archive-only delete: children and their history stay intact (AGENTS §6).
export async function patchModule(id: string, input: PatchModuleRequest): Promise<ModuleDto> {
  const row = await db
    .select({
      id: modules.id,
      title: modules.title,
      description: modules.description,
      position: modules.position,
      archivedAt: modules.archivedAt,
    })
    .from(modules)
    .where(eq(modules.id, id))
    .get();
  if (!row || row.archivedAt) throw new NotFoundError("Module not found");

  const updated: ModuleRow = {
    id: row.id,
    title: input.title ?? row.title,
    description: input.description === undefined ? row.description : input.description,
    position: input.position ?? row.position,
    archivedAt: input.archived ? nowIso() : row.archivedAt,
  };
  await db
    .update(modules)
    .set({
      title: updated.title,
      description: updated.description,
      position: updated.position,
      archivedAt: updated.archivedAt,
    })
    .where(eq(modules.id, id));
  return toDto(updated);
}
