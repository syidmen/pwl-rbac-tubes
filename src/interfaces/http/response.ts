export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function success(data: unknown, status = 200): Response {
  return Response.json({ status: "success", data }, { status });
}

export function error(message: string, status = 500, details?: unknown): Response {
  const payload: Record<string, unknown> = {
    status: "error",
    message,
  };

  if (details !== undefined) {
    payload.details = details;
  }

  return Response.json(payload, { status });
}
