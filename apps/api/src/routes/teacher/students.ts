import { createStudentRequestSchema, patchStudentRequestSchema } from "@jaweb/shared";
import { Hono } from "hono";

import type { AppEnv } from "../../lib/app-types";
import { parseJson } from "../../lib/parse";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createStudent, listStudents, patchStudent } from "../../services/students";

export const teacherStudentsRoutes = new Hono<AppEnv>();

teacherStudentsRoutes.use("*", requireAuth, requireRole("teacher"));

teacherStudentsRoutes.get("/", async (c) => {
  const classId = c.req.query("classId");
  return c.json(await listStudents(classId));
});

teacherStudentsRoutes.post("/", async (c) => {
  const input = await parseJson(c, createStudentRequestSchema);
  return c.json(await createStudent(input), 201);
});

teacherStudentsRoutes.patch("/:id", async (c) => {
  const input = await parseJson(c, patchStudentRequestSchema);
  return c.json(await patchStudent(c.req.param("id"), input));
});
