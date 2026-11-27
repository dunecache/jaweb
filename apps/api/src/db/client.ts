import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { env } from "../env";
import { resolveDatabaseUrl } from "../lib/paths";
import * as schema from "./schema";

export const client = createClient({
  url: resolveDatabaseUrl(env.DATABASE_URL),
  authToken: env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle({ client, schema });
