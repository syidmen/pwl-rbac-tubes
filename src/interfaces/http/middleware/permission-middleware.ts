import { ForbiddenError, UnauthorizedError } from "../errors";
import type { AuthenticatedRequest } from "./auth-middleware";

export type PermissionValidator = (request: Request) => Request;

export function permissionMiddleware(requiredPermission: string): PermissionValidator {
  return (request: Request): Request => {
    const authRequest = request as AuthenticatedRequest;
    const permissions = Array.isArray(authRequest.user?.permissions)
      ? authRequest.user.permissions
      : [];

    if (!permissions.length) {
      throw new UnauthorizedError("Pengguna belum diautentikasi atau tidak memiliki permission");
    }

    const allowed = permissions.some((permission) => permissionMatches(permission, requiredPermission));
    if (!allowed) {
      throw new ForbiddenError("Permission tidak mencukupi");
    }

    return request;
  };
}

function permissionMatches(grantedPermission: string, requiredPermission: string): boolean {
  if (grantedPermission === "*" || grantedPermission === requiredPermission) {
    return true;
  }

  const grantedParts = grantedPermission.split(":");
  const requiredParts = requiredPermission.split(":");

  if (grantedParts.length !== requiredParts.length) {
    return false;
  }

  return grantedParts.every((grantedSegment, index) => {
    const requiredSegment = requiredParts[index];
    return grantedSegment === "*" || grantedSegment === requiredSegment;
  });
}
