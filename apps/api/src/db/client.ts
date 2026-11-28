import type { Client } from "@libsql/client";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

import { env } from "../env";
import { resolveDatabaseUrl } from "../lib/paths";
import { createLocalClient } from "./local-client";
import * as schema from "./schema";

const url = resolveDatabaseUrl(env.DATABASE_URL);

// Local `file:` URLs use the WASM-backed adapter so the API also boots on
// hosts without a native libSQL binding (Android/Termux). Remote Turso URLs
// keep the pinned native client — both satisfy the same drizzle libsql driver.
// The imports are dynamic because both `drizzle-orm/libsql` and
// `@libsql/client` load the native binding eagerly at module evaluation.
const client: Client = url.startsWith("file:")
  ? await createLocalClient(url)
  : (await import("@libsql/client")).createClient({ url, authToken: env.DATABASE_AUTH_TOKEN });

// `construct` is the driver-core factory that skips drizzle's eager
// @libsql/client import; it is intentionally not part of the public typings.
type Construct = (
  client: Client,
  config: { schema: typeof schema },
) => LibSQLDatabase<typeof schema>;
const { construct } = (await import("drizzle-orm/libsql/driver-core")) as unknown as {
  construct: Construct;
};

export { client };
export const db = construct(client, { schema });
