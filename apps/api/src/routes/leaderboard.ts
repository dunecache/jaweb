import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "../db/client";
import { users } from "../db/schema";
import type { AppEnv } from "../lib/app-types";
import { ValidationError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { buildLeaderboard } from "../services/leaderboard";

export const leaderboardRoutes = new Hono<AppEnv>();

leaderboardRoutes.use("*", requireAuth);

leaderboardRoutes.get("/", async (c) => {
  const scope = z.enum(["live", "all", "exercise"]).safeParse(c.req.query("scope") ?? "all");
  if (!scope.success) throw new ValidationError("Invalid scope");

  let classId = c.req.query("classId") ?? "";
  if (c.var.user.role !== "teacher") {
    const student = await db
      .select({ classId: users.classId })
      .from(users)
      .where(eq(users.id, c.var.user.id))
      .get();
    classId = student?.classId ?? "";
  }
  if (!classId) throw new ValidationError("No class for this board");

  const board = await buildLeaderboard({
    scope: scope.data,
    classId,
    exerciseId: c.req.query("exerciseId"),
    viewerRole: c.var.user.role,
    viewerStudentId: c.var.user.role === "student" ? c.var.user.id : undefined,
  });
  const clientRev = c.req.header("if-none-match")?.replace(/^W\//, "").replaceAll('"', "");
  c.header("etag", `"${board.rev}"`);
  if (clientRev === board.rev) return c.body(null, 304);
  return c.json(board);
});
