import { BadRequestError, ValidationError } from "./errors";

export async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestError("Body JSON tidak valid");
  }

  return body as Record<string, unknown>;
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} wajib diisi`);
  }

  return value.trim();
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${field} harus berupa string`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requiredArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} harus berupa array`);
  }

  return value;
}
