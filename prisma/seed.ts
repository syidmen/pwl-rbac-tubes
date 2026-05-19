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

  // Create roles
  const superadminRole = await prisma.role.upsert({
    where: { name: "SUPERADMIN" },
    update: {},
    create: { name: "SUPERADMIN" },
  })

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  })

  // Assign all permissions to SUPERADMIN and ADMIN roles
  const allPerms = await prisma.permission.findMany();
  for (const role of [superadminRole, adminRole]) {
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id }
        },
        update: {},
        create: { roleId: role.id, permissionId: perm.id }
      })
    }
  }

  // Create User "superadmin@example.com" with password "password123"
  const superadminUser = await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: {},
    create: {
      username: "SuperAdmin",
      email: "superadmin@example.com",
      password: "$argon2id$v=19$m=65536,t=2,p=1$zXjSJt2gd6QdP+RdVpDivHi5f7AbU3bm50k3BxXnes0$PgRcRkp3V4bIyjaEsHpO0b2oqRNzhiXOtSzagI8K12o",
    }
  })

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: superadminUser.id, roleId: superadminRole.id }
    },
    update: {},
    create: { userId: superadminUser.id, roleId: superadminRole.id }
  })

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

  console.log("Seed selesai: Superadmin, Admin, dan permissions berhasil dibuat.")
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
