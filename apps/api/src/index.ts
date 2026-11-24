import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import type { ErrorEnvelope } from "@jaweb/shared";
import { Hono } from "hono";

import { env } from "./env";
import type { AppEnv } from "./lib/app-types";
import { originCheck } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
import { loggerMiddleware } from "./middleware/logger";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { teacherClassesRoutes } from "./routes/teacher/classes";
import { teacherStudentsRoutes } from "./routes/teacher/students";

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
app.all("/api/*", (c) => c.json(notFoundBody, 404));

// Production serves the built SPA from the API origin; dev uses the Vite proxy.
const webDist = resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (env.NODE_ENV === "production" && existsSync(webDist)) {
  app.use("/*", serveStatic({ root: webDist }));
  app.get("/*", serveStatic({ root: webDist, path: "index.html" }));
}

app.notFound((c) => c.json(notFoundBody, 404));
app.onError(errorHandler);

export function startServer(): void {
  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`Jaweb API listening on http://localhost:${info.port}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
