import { UnauthorizedError } from "../errors";
import { verifyToken } from "../../../infrastructure/jwt";
import type { JwtPayload } from "../../../infrastructure/jwt";

export type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

const BEARER_PREFIX = "Bearer ";

export async function authMiddleware(request: Request): Promise<AuthenticatedRequest> {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith(BEARER_PREFIX)) {
    throw new UnauthorizedError("Header Authorization Bearer tidak ditemukan");
  }

  const token = authorization.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    throw new UnauthorizedError("Token Bearer tidak ditemukan");
  }

  const payload = await verifyToken(token);
  if (!payload || typeof payload !== "object" || typeof payload.sub !== "string") {
    throw new UnauthorizedError("Token tidak valid");
  }

  const authenticatedRequest = request as AuthenticatedRequest;
  Object.defineProperty(authenticatedRequest, "user", {
    value: payload,
    writable: false,
    configurable: true,
    enumerable: false,
  });

  return authenticatedRequest;
}
