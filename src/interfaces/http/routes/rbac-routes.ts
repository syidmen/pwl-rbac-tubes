// src/application/services/rbac-service.ts
// Anggota 4 - RBAC Service

import { db } from "../../infrastructure/database/prisma-client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateUserInput = {
  username: string;
  email: string;
  password: string; // sudah di-hash oleh caller (auth-service)
};

export type UpdateUserInput = Partial<Omit<CreateUserInput, "password">>;

export type CreateRoleInput = {
  name: string;
  description?: string;
};

export type CreatePermissionInput = {
  name: string;       // contoh: "item:create"
  description?: string;
};

// ─── Helper: buang field password dari object user ───────────────────────────

function omitPassword<T extends { password?: unknown }>(user: T) {
  const { password: _pw, ...safe } = user;
  return safe;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAllUsers() {
  const users = await db.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      roles: {
        select: {
          role: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Flatten relasi UserRole → roles: [{id, name}]
  return users.map((u) => ({
    ...u,
    roles: u.roles.map((ur) => ur.role),
  }));
}

export async function getUserById(id: number) {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    ...user,
    roles: user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      permissions: ur.role.permissions.map((rp) => rp.permission),
    })),
  };
}

export async function createUser(input: CreateUserInput) {
  const user = await db.user.create({
    data: {
      username: input.username,
      email: input.email,
      password: input.password,
    },
  });
  return omitPassword(user);
}

export async function updateUser(id: number, input: UpdateUserInput) {
  const user = await db.user.update({
    where: { id },
    data: input,
  });
  return omitPassword(user);
}

export async function deleteUser(id: number) {
  await db.user.delete({ where: { id } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAllRoles() {
  const roles = await db.role.findMany({
    include: {
      permissions: {
        select: {
          permission: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.permissions.map((rp) => rp.permission),
  }));
}

export async function getRoleById(id: number) {
  const role = await db.role.findUnique({
    where: { id },
    include: {
      permissions: {
        select: {
          permission: { select: { id: true, name: true, description: true } },
        },
      },
    },
  });

  if (!role) return null;

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map((rp) => rp.permission),
  };
}

export async function createRole(input: CreateRoleInput) {
  return db.role.create({ data: input });
}

export async function updateRole(id: number, input: Partial<CreateRoleInput>) {
  return db.role.update({ where: { id }, data: input });
}

export async function deleteRole(id: number) {
  await db.role.delete({ where: { id } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAllPermissions() {
  return db.permission.findMany({ orderBy: { name: "asc" } });
}

export async function getPermissionById(id: number) {
  return db.permission.findUnique({ where: { id } });
}

export async function createPermission(input: CreatePermissionInput) {
  return db.permission.create({ data: input });
}

export async function updatePermission(
  id: number,
  input: Partial<CreatePermissionInput>
) {
  return db.permission.update({ where: { id }, data: input });
}

export async function deletePermission(id: number) {
  await db.permission.delete({ where: { id } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGN: ROLE ↔ USER
// ═══════════════════════════════════════════════════════════════════════════════

export async function assignRoleToUser(userId: number, roleId: number) {
  // upsert agar tidak error jika sudah ada
  return db.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    create: { userId, roleId },
    update: {},
  });
}

export async function removeRoleFromUser(userId: number, roleId: number) {
  await db.userRole.delete({
    where: { userId_roleId: { userId, roleId } },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGN: PERMISSION ↔ ROLE
// ═══════════════════════════════════════════════════════════════════════════════

export async function assignPermissionToRole(
  roleId: number,
  permissionId: number
) {
  return db.rolePermission.upsert({
    where: { roleId_permissionId: { roleId, permissionId } },
    create: { roleId, permissionId },
    update: {},
  });
}

export async function removePermissionFromRole(
  roleId: number,
  permissionId: number
) {
  await db.rolePermission.delete({
    where: { roleId_permissionId: { roleId, permissionId } },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CEK PERMISSION USER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kembalikan semua permission name milik user (dari semua role-nya).
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  const userRoles = await db.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const permissionSet = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) {
      permissionSet.add(rp.permission.name);
    }
  }

  return Array.from(permissionSet);
}

/**
 * Cek apakah user memiliki permission tertentu.
 */
export async function userHasPermission(
  userId: number,
  permissionName: string
): Promise<boolean> {
  const count = await db.userRole.count({
    where: {
      userId,
      role: {
        permissions: {
          some: {
            permission: { name: permissionName },
          },
        },
      },
    },
  });
  return count > 0;
}