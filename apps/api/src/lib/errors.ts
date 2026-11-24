import type { ErrorCode, ValidationIssue } from "@jaweb/shared";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly status: ContentfulStatusCode;

  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR" as const;
  readonly status = 422;

  constructor(
    message = "Invalid request",
    readonly issues?: ValidationIssue[],
  ) {
    super(message);
  }
}

export class UnauthenticatedError extends AppError {
  readonly code = "UNAUTHENTICATED" as const;
  readonly status = 401;

  constructor(message = "Authentication required") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN" as const;
  readonly status = 403;

  constructor(message = "You do not have access to this resource") {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND" as const;
  readonly status = 404;

  constructor(message = "Resource not found") {
    super(message);
  }
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT" as const;
  readonly status = 409;

  constructor(message = "The request conflicts with current state") {
    super(message);
  }
}

export class RateLimitedError extends AppError {
  readonly code = "RATE_LIMITED" as const;
  readonly status = 429;

  constructor(message = "Too many requests") {
    super(message);
  }
}

export class InternalError extends AppError {
  readonly code = "INTERNAL" as const;
  readonly status = 500;

  constructor(message = "Internal server error") {
    super(message);
  }
}
