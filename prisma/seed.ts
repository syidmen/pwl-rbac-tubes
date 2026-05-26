import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const permissions = [
    "item:create",
    "item:read",
    "item:update",
    "item:delete",
  ]

  // Create permissions
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission },
      update: {},
      create: { name: permission },
    })
  }

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  })

  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: { name: "USER" },
  })

  // Assign all permissions to ADMIN role
  const allPerms = await prisma.permission.findMany();
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id }
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id }
    })
  }

  const readPermission = await prisma.permission.findUnique({
    where: { name: "item:read" },
  })

  if (readPermission) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: userRole.id, permissionId: readPermission.id }
      },
      update: {},
      create: { roleId: userRole.id, permissionId: readPermission.id }
    })
  }

  // Create User "admin@example.com" with password "password123"
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      username: "AdminUser",
      email: "admin@example.com",
      password: "$argon2id$v=19$m=65536,t=2,p=1$zXjSJt2gd6QdP+RdVpDivHi5f7AbU3bm50k3BxXnes0$PgRcRkp3V4bIyjaEsHpO0b2oqRNzhiXOtSzagI8K12o",
    }
  })

  // Assign ADMIN role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: adminRole.id }
    },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id }
  })

  // Create User "user@example.com" with password "password123"
  const regularUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      username: "RegularUser",
      email: "user@example.com",
      password: "$argon2id$v=19$m=65536,t=2,p=1$zXjSJt2gd6QdP+RdVpDivHi5f7AbU3bm50k3BxXnes0$PgRcRkp3V4bIyjaEsHpO0b2oqRNzhiXOtSzagI8K12o",
    }
  })

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: regularUser.id, roleId: userRole.id }
    },
    update: {},
    create: { userId: regularUser.id, roleId: userRole.id }
  })

  console.log("Seed selesai: Admin, User, dan permissions berhasil dibuat.")
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
