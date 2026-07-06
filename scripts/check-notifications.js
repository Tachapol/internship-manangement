const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      user: {
        select: { name: true, role: true }
      }
    }
  });

  console.log('Last 5 Notifications in Database:');
  console.log(JSON.stringify(notifications, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
