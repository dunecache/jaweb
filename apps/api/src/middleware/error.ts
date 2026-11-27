import type { ErrorEnvelope, ValidationIssue } from "@jaweb/shared";
import type { ErrorHandler } from "hono";
import { ZodError } from "zod";

import type { AppEnv } from "../lib/app-types";
import { AppError, ValidationError } from "../lib/errors";

function envelope(
  code: ErrorEnvelope["error"]["code"],
  message: string,
  issues?: ValidationIssue[],
): ErrorEnvelope {
  return issues ? { error: { code, message, issues } } : { error: { code, message } };
}

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof ValidationError) {
    return c.json(envelope(err.code, err.message, err.issues), err.status);
  }

  if (err instanceof AppError) {
    // Internal messages never leave the server; other typed errors are safe to show.
    const message = err.code === "INTERNAL" ? "Internal server error" : err.message;
    return c.json(envelope(err.code, message), err.status);
  }

  if (err instanceof ZodError) {
    const issues: ValidationIssue[] = err.issues.map((issue) => ({
      path: issue.path.map((segment) => (typeof segment === "symbol" ? String(segment) : segment)),
      message: issue.message,
      code: issue.code,
    }));
    return c.json(envelope("VALIDATION_ERROR", "Invalid request", issues), 422);
  }

  c.var.logger?.error({ err }, "unhandled error");
  return c.json(envelope("INTERNAL", "Internal server error"), 500);
};
