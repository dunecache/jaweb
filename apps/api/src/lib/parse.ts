import type { ValidationIssue } from "@jaweb/shared";
import type { Context } from "hono";
import type { ZodType } from "zod";

import { ValidationError } from "./errors";

export async function parseJson<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      path: issue.path.map((segment) => (typeof segment === "symbol" ? String(segment) : segment)),
      message: issue.message,
      code: issue.code,
    }));
    throw new ValidationError("Invalid request", issues);
  }
  return result.data;
}
