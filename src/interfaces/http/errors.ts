export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(401, message, details);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden", details?: unknown) {
    super(403, message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found", details?: unknown) {
    super(404, message, details);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict", details?: unknown) {
    super(409, message, details);
  }
}

export class ValidationError extends HttpError {
  constructor(message = "Validation error", details?: unknown) {
    super(422, message, details);
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "Internal server error", details?: unknown) {
    super(500, message, details);
  }
}

export function isHttpError(value: unknown): value is HttpError {
  return value instanceof HttpError;
}
