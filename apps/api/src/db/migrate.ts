import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/libsql/migrator";

import { client, db } from "./client";

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "migrations");

await migrate(db, { migrationsFolder });
client.close();
