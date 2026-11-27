import { eq } from "drizzle-orm";

import { env } from "../env";
import { newId } from "../lib/ids";
import { hashPassword } from "../lib/password";
import { nowIso } from "../lib/time";
import { client, db } from "./client";
import { classes, users } from "./schema";

const username = env.TEACHER_INITIAL_USERNAME;
const password = env.TEACHER_INITIAL_PASSWORD;

if (!username || !password) {
  console.log("Set TEACHER_INITIAL_USERNAME and TEACHER_INITIAL_PASSWORD to seed the teacher.");
} else {
  const normalized = username.toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, normalized))
    .get();
  if (existing) {
    console.log("Teacher already exists; seed skipped.");
  } else {
    await db.insert(users).values({
      id: newId(),
      username: normalized,
      displayName: "Teacher",
      role: "teacher",
      passwordHash: await hashPassword(password),
      createdAt: nowIso(),
    });
    console.log(`Teacher ${normalized} created.`);
  }

  if (env.SEED_DEMO_CLASS) {
    const found = await db
      .select({ id: classes.id })
      .from(classes)
      .where(eq(classes.name, env.SEED_DEMO_CLASS))
      .get();
    if (!found) {
      await db.insert(classes).values({
        id: newId(),
        name: env.SEED_DEMO_CLASS,
        position: 1,
        createdAt: nowIso(),
      });
      console.log(`Demo class ${env.SEED_DEMO_CLASS} created.`);
    }
  }
}

client.close();
