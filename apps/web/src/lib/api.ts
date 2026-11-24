import { type ErrorEnvelope, errorEnvelopeSchema } from "@jaweb/shared";
import type { ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly envelope: ErrorEnvelope,
  ) {
    super(envelope.error.message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
  schema?: ZodType<T>,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = errorEnvelopeSchema.safeParse(payload);
    throw new ApiError(
      response.status,
      parsed.success ? parsed.data : { error: { code: "INTERNAL", message: "Request failed" } },
    );
  }

  return schema ? schema.parse(payload) : (payload as T);
}
