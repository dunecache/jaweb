import { pathToFileURL } from "node:url";

import { serve } from "@hono/node-server";
import type { ErrorEnvelope } from "@jaweb/shared";
import { Hono } from "hono";

import { env } from "./env";
import { recoverStaleGrading } from "./grading/queue";
import type { AppEnv } from "./lib/app-types";
import { originCheck } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
import { loggerMiddleware } from "./middleware/logger";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { leaderboardRoutes } from "./routes/leaderboard";
import { studentCurrentRoutes } from "./routes/student/current";
import { studentExercisesRoutes } from "./routes/student/exercises";
import { studentHistoryRoutes } from "./routes/student/history";
import { studentSubmissionRoutes } from "./routes/student/submissions";
import { teacherClassesRoutes } from "./routes/teacher/classes";
import { teacherExercisesRoutes } from "./routes/teacher/exercises";
import { teacherModulesRoutes } from "./routes/teacher/modules";
import { teacherQuestionsRoutes } from "./routes/teacher/questions";
import { teacherSettingsRoutes } from "./routes/teacher/settings";
import { teacherStudentsRoutes } from "./routes/teacher/students";
import { teacherSubmissionRoutes } from "./routes/teacher/submissions";

const notFoundBody: ErrorEnvelope = {
  error: { code: "NOT_FOUND", message: "Resource not found" },
};

export const app = new Hono<AppEnv>();

app.use("*", loggerMiddleware);
app.use("*", originCheck);
app.route("/api/health", healthRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/teacher/classes", teacherClassesRoutes);
app.route("/api/teacher/students", teacherStudentsRoutes);
app.route("/api/teacher/modules", teacherModulesRoutes);
app.route("/api/teacher/exercises", teacherExercisesRoutes);
app.route("/api/teacher/questions", teacherQuestionsRoutes);
app.route("/api/teacher/settings/grading", teacherSettingsRoutes);
app.route("/api/teacher/submissions", teacherSubmissionRoutes);
app.route("/api/student/current", studentCurrentRoutes);
app.route("/api/student/exercises", studentExercisesRoutes);
app.route("/api/student/submissions", studentSubmissionRoutes);
app.route("/api/student/history", studentHistoryRoutes);
app.route("/api/leaderboard", leaderboardRoutes);
app.all("/api/*", (c) => c.json(notFoundBody, 404));

app.notFound((c) => c.json(notFoundBody, 404));
app.onError(errorHandler);

// Vercel's Hono builder uses the default export as the function handler.
// The SPA is served by the separate `web` service; dev uses the Vite proxy.
export default app;

export function startServer(): void {
  void recoverStaleGrading();
  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`Jaweb API listening on http://localhost:${info.port}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
