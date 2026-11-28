import type { z } from "zod";

export type FieldErrors = Record<string, string>;

// Shared zod schemas are the single source of truth for request contracts.
// Mapping their issues to field keys keeps inline messages identical to the
// 422 envelope the API returns, without duplicating validation rules in JSX.
export function fieldErrors(schema: z.ZodTypeAny, values: unknown): FieldErrors {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in errors)) errors[field] = issue.message;
  }
  return errors;
}
