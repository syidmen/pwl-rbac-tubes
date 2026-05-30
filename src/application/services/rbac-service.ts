import { db } from "../../infrastructure/database/prisma-client";

export const itemPermissionNames = [
  "item:create",
  "item:read",
  "item:update",
  "item:delete",
] as const;

export type CreateUserInput = {
  username: string;
  email: string;
  password: string;
};

export type UpdateUserInput = Partial<CreateUserInput>;

export type CreateRoleInput = {
  name: string;
  description?: string;
};

export type CreatePermissionInput = {
  name: string;
  description?: string;
};

export async function listUsers() {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
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
              description: true,
            },
          },
        },
      },
    },
  });
}

export async function getUserById(id: string) {
  return db.user.findUnique({
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
              description: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function createUser(input: CreateUserInput) {
  const password = await Bun.password.hash(input.password);

  return db.user.create({
    data: {
      username: input.username,
      email: input.email,
      password,
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const password = input.password ? await Bun.password.hash(input.password) : undefined;

  return db.user.update({
    where: { id },
    data: {
      username: input.username,
      email: input.email,
      password,
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deleteUser(id: string) {
  return db.user.delete({
    where: { id },
    select: {
      id: true,
    },
  });
}

export async function listRoles() {
  return db.role.findMany({
    orderBy: { name: "asc" },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });
}

export function getRoleById(id: string) {
  return db.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });
}

export function createRole(input: CreateRoleInput) {
  return db.role.create({ data: input });
}

export function updateRole(id: string, input: Partial<CreateRoleInput>) {
  return db.role.update({
    where: { id },
    data: input,
  });
}

export function deleteRole(id: string) {
  return db.role.delete({ where: { id } });
}

export function countUsersByRole(roleId: string) {
  return db.userRole.count({
    where: { roleId },
  });
}

export function listPermissions() {
  return db.permission.findMany({
    orderBy: { name: "asc" },
  });
}

export function getPermissionById(id: string) {
  return db.permission.findUnique({ where: { id } });
}

export function createPermission(input: CreatePermissionInput) {
  return db.permission.create({ data: input });
}

export function updatePermission(id: string, input: Partial<CreatePermissionInput>) {
  return db.permission.update({
    where: { id },
    data: input,
  });
}

export function deletePermission(id: string) {
  return db.permission.delete({ where: { id } });
}

export function assignRoleToUser(userId: string, roleId: string) {
  return db.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
    create: {
      userId,
      roleId,
    },
    update: {},
  });
}

export function removeRoleFromUser(userId: string, roleId: string) {
  return db.userRole.delete({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
  });
}

export function assignPermissionToRole(roleId: string, permissionId: string) {
  return db.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId,
        permissionId,
      },
    },
    create: {
      roleId,
      permissionId,
    },
    update: {},
  });
}

export function removePermissionFromRole(roleId: string, permissionId: string) {
  return db.rolePermission.delete({
    where: {
      roleId_permissionId: {
        roleId,
        permissionId,
      },
    },
  });
}

export async function getUserPermissions(userId: string) {
  const userRoles = await db.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return [
    ...new Set(
      userRoles.flatMap((userRole) =>
        userRole.role.permissions.map((rolePermission) => rolePermission.permission.name),
      ),
    ),
  ];
}

export async function userHasPermission(userId: string, permissionName: string) {
  const permissionCount = await db.userRole.count({
    where: {
      userId,
      role: {
        permissions: {
          some: {
            permission: {
              name: permissionName,
            },
          },
        },
      },
    },
  });

  return permissionCount > 0;
}

export async function ensureItemPermissions() {
  return Promise.all(
    itemPermissionNames.map((name) =>
      db.permission.upsert({
        where: { name },
        update: {},
        create: {
          name,
          description: `Permission untuk ${name}`,
        },
      }),
    ),
  );
}
