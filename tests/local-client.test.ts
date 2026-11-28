import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "../apps/api/src/db/client";
import { createLocalClient } from "../apps/api/src/db/local-client";
import { classes } from "../apps/api/src/db/schema";
import { newId } from "../apps/api/src/lib/ids";
import { nowIso } from "../apps/api/src/lib/time";

const migrationsFolder = resolve(process.cwd(), "apps/api/src/db/migrations");
const tempDir = mkdtempSync(join(tmpdir(), "jaweb-local-client-"));

beforeAll(async () => {
  await migrate(db, { migrationsFolder });
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("local file: client", () => {
  it("persists writes across connections", async () => {
    const url = `file:${join(tempDir, "persist.db")}`;
    const first = await createLocalClient(url);
    await first.execute("CREATE TABLE messages (text TEXT)");
    await first.execute({ sql: "INSERT INTO messages VALUES (?)", args: ["hello"] });
    first.close();

    const second = await createLocalClient(url);
    const result = await second.execute("SELECT text FROM messages");
    expect(result.rows.map((row) => row.text)).toEqual(["hello"]);
    second.close();
  });

  it("rolls back failed transactions", async () => {
    const client = await createLocalClient(`file:${join(tempDir, "tx.db")}`);
    await client.execute("CREATE TABLE items (value INTEGER UNIQUE)");
    const tx = await client.transaction("write");
    await tx.execute("INSERT INTO items VALUES (1)");
    await tx.rollback();

    const result = await client.execute("SELECT value FROM items");
    expect(result.rows).toEqual([]);
    client.close();
  });
});

describe("drizzle over the local client", () => {
  it("runs migrations and round-trips rows", async () => {
    const id = newId();
    await db.insert(classes).values({ id, name: "2AS-1", position: 1, createdAt: nowIso() });
    const rows = await db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(eq(classes.id, id));
    expect(rows).toEqual([{ id, name: "2AS-1" }]);
  });
});
