import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const permissions = [
    "item:create",
    "item:read",
    "item:update",
    "item:delete",
  ]

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission },
      update: {},
      create: {
        name: permission,
      },
    })
  }

  await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
    },
  })

  console.log("Seed selesai")
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
  