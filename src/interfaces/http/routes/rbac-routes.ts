import {
  assignPermissionToRole,
  assignRoleToUser,
  countUsersByRole,
  createPermission,
  createRole,
  createUser,
  deletePermission,
  deleteRole,
  deleteUser,
  ensureItemPermissions,
  getPermissionById,
  getRoleById,
  getUserById,
  getUserPermissions,
  listPermissions,
  listRoles,
  listUsers,
  removePermissionFromRole,
  removeRoleFromUser,
  updatePermission,
  updateRole,
  updateUser,
  userHasPermission,
} from "../../../application/services/rbac-service";
import { json } from "../response";
import { BadRequestError, NotFoundError } from "../errors";
import type { AuthenticatedRequest } from "../middleware/auth-middleware";

export type RouteParams = Record<string, string>;

export type RouteHandler = (
  request: Request,
  params: RouteParams,
) => Promise<Response> | Response;

export type RbacRoute = {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
};

export const rbacRoutes: RbacRoute[] = [
  route("GET", /^\/users$/, async () => json(await listUsers())),
  route("POST", /^\/users$/, async (request) => {
    const body = await readBody(request);
    return json(
      await createUser({
        username: requiredString(body, "username"),
        email: requiredString(body, "email"),
        password: requiredString(body, "password"),
      }),
      201,
    );
  }),
  route("GET", /^\/users\/(?<id>[^/]+)$/, async (_request, params) => {
    const user = await getUserById(param(params, "id"));
    return user ? json(user) : json({ message: "User tidak ditemukan" }, 404);
  }),
  route("PATCH", /^\/users\/(?<id>[^/]+)$/, async (request, params) => {
    const body = await readBody(request);
    return json(
      await updateUser(param(params, "id"), {
        username: optionalString(body, "username"),
        email: optionalString(body, "email"),
        password: optionalString(body, "password"),
      }),
    );
  }),
  route("DELETE", /^\/users\/(?<id>[^/]+)$/, async (request, params) => {
    const targetUserId = param(params, "id");
    const currentUserId = (request as AuthenticatedRequest).user?.userId ?? (request as AuthenticatedRequest).user?.sub;

    if (currentUserId === targetUserId) {
      throw new BadRequestError("Admin tidak boleh menghapus akun sendiri");
    }

    await deleteUser(targetUserId);
    return json({ message: "User berhasil dihapus" });
  }),
  route("POST", /^\/users\/(?<id>[^/]+)\/roles$/, async (request, params) => {
    const body = await readBody(request);
    const targetUserId = param(params, "id");
    const targetRoleId = requiredString(body, "roleId");
    const targetUser = await getUserById(targetUserId);
    const targetRole = await getRoleById(targetRoleId);

    if (!targetUser) {
      throw new NotFoundError("User tidak ditemukan");
    }

    if (!targetRole) {
      throw new NotFoundError("Role tidak ditemukan");
    }

    const currentAdminRole = targetUser.roles.find((userRole) => userRole.role.name.toLowerCase() === "admin")?.role;

    if (currentAdminRole && targetRole.name.toLowerCase() !== "admin") {
      const adminCount = await countUsersByRole(currentAdminRole.id);

      if (adminCount <= 1) {
        throw new BadRequestError("Role admin terakhir tidak boleh diganti");
      }
    }

    return json(await assignRoleToUser(targetUserId, targetRoleId), 201);
  }),
  route("DELETE", /^\/users\/(?<userId>[^/]+)\/roles\/(?<roleId>[^/]+)$/, async (_request, params) => {
    await removeRoleFromUser(param(params, "userId"), param(params, "roleId"));
    return json({ message: "Role user berhasil dihapus" });
  }),
  route("GET", /^\/users\/(?<id>[^/]+)\/permissions$/, async (_request, params) => {
    return json(await getUserPermissions(param(params, "id")));
  }),
  route("GET", /^\/users\/(?<id>[^/]+)\/permissions\/(?<permission>[^/]+)$/, async (_request, params) => {
    return json({
      allowed: await userHasPermission(param(params, "id"), decodeURIComponent(param(params, "permission"))),
    });
  }),

  route("GET", /^\/roles$/, async () => json(await listRoles())),
  route("POST", /^\/roles$/, async (request) => {
    const body = await readBody(request);
    return json(
      await createRole({
        name: requiredString(body, "name"),
        description: optionalString(body, "description"),
      }),
      201,
    );
  }),
  route("GET", /^\/roles\/(?<id>[^/]+)$/, async (_request, params) => {
    const roleItem = await getRoleById(param(params, "id"));
    return roleItem ? json(roleItem) : json({ message: "Role tidak ditemukan" }, 404);
  }),
  route("PATCH", /^\/roles\/(?<id>[^/]+)$/, async (request, params) => {
    const body = await readBody(request);
    return json(
      await updateRole(param(params, "id"), {
        name: optionalString(body, "name"),
        description: optionalString(body, "description"),
      }),
    );
  }),
  route("DELETE", /^\/roles\/(?<id>[^/]+)$/, async (request, params) => {
    const targetRoleId = param(params, "id");
    const currentUserId = (request as AuthenticatedRequest).user?.userId ?? (request as AuthenticatedRequest).user?.sub;
    const targetRole = await getRoleById(targetRoleId);

    if (!targetRole) {
      throw new NotFoundError("Role tidak ditemukan");
    }

    if (targetRole.name.toLowerCase() === "admin") {
      throw new BadRequestError("Role ADMIN tidak boleh dihapus");
    }

    const currentUser = currentUserId ? await getUserById(currentUserId) : null;
    const isCurrentUserRole = currentUser?.roles.some((userRole) => userRole.role.id === targetRoleId);

    if (isCurrentUserRole) {
      throw new BadRequestError("Admin tidak boleh menghapus role yang sedang dipakai sendiri");
    }

    const usersUsingRole = await countUsersByRole(targetRoleId);

    if (usersUsingRole > 0) {
      throw new BadRequestError("Role masih dipakai user dan tidak boleh dihapus");
    }

    await deleteRole(targetRoleId);
    return json({ message: "Role berhasil dihapus" });
  }),
  route("POST", /^\/roles\/(?<id>[^/]+)\/permissions$/, async (request, params) => {
    const body = await readBody(request);
    const roleId = param(params, "id");
    await ensureRolePermissionEditable(roleId);
    return json(await assignPermissionToRole(roleId, requiredString(body, "permissionId")), 201);
  }),
  route("DELETE", /^\/roles\/(?<roleId>[^/]+)\/permissions\/(?<permissionId>[^/]+)$/, async (_request, params) => {
    const roleId = param(params, "roleId");
    await ensureRolePermissionEditable(roleId);
    await removePermissionFromRole(roleId, param(params, "permissionId"));
    return json({ message: "Permission role berhasil dihapus" });
  }),

  route("GET", /^\/permissions$/, async () => json(await listPermissions())),
  route("POST", /^\/permissions$/, async (request) => {
    const body = await readBody(request);
    return json(
      await createPermission({
        name: requiredString(body, "name"),
        description: optionalString(body, "description"),
      }),
      201,
    );
  }),
  route("POST", /^\/permissions\/items\/seed$/, async () => {
    return json(await ensureItemPermissions(), 201);
  }),
  route("GET", /^\/permissions\/(?<id>[^/]+)$/, async (_request, params) => {
    const permission = await getPermissionById(param(params, "id"));
    return permission ? json(permission) : json({ message: "Permission tidak ditemukan" }, 404);
  }),
  route("PATCH", /^\/permissions\/(?<id>[^/]+)$/, async (request, params) => {
    const body = await readBody(request);
    return json(
      await updatePermission(param(params, "id"), {
        name: optionalString(body, "name"),
        description: optionalString(body, "description"),
      }),
    );
  }),
  route("DELETE", /^\/permissions\/(?<id>[^/]+)$/, async (_request, params) => {
    await deletePermission(param(params, "id"));
    return json({ message: "Permission berhasil dihapus" });
  }),
];

function route(method: string, pattern: RegExp, handler: RouteHandler): RbacRoute {
  return { method, pattern, handler };
}

function param(params: RouteParams, key: string): string {
  const value = params[key];
  if (!value) {
    throw new Error(`Parameter ${key} tidak ditemukan`);
  }

  return value;
}

async function ensureRolePermissionEditable(roleId: string) {
  const role = await getRoleById(roleId);

  if (!role) {
    throw new NotFoundError("Role tidak ditemukan");
  }

  if (role.name.toLowerCase() === "admin") {
    throw new BadRequestError("Permission role ADMIN tidak boleh diubah");
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Body JSON tidak valid");
  }

  return body as Record<string, unknown>;
}

function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} wajib diisi`);
  }

  return value.trim();
}

function optionalString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${key} harus berupa string`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
